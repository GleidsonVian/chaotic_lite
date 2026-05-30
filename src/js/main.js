class GameEngine {
    constructor(cards, mugics, attacks, locations, battlegears) {
        this.cards = JSON.parse(JSON.stringify(cards)); // Cópia profunda
        this.mugics = JSON.parse(JSON.stringify(mugics));
        this.attacksData = attacks ? JSON.parse(JSON.stringify(attacks)) : [];
        this.locationsData = locations ? JSON.parse(JSON.stringify(locations)) : [];
        this.battlegearsData = battlegears ? JSON.parse(JSON.stringify(battlegears)) : [];
        
        this.p1AttackDeck = [];
        this.p2AttackDeck = [];
        this.p1AttackHand = [];
        this.p2AttackHand = [];
        this.p1AttackDiscard = [];
        this.p2AttackDiscard = [];
        this.locationDeck = [];
        this.activeLocation = null;
        
        this.appState = 'DRAFT'; // 'DRAFT', 'BATTLE', 'LORE'
        this.draftState = 'CREATURES'; // 'CREATURES', 'BATTLEGEARS', 'MUGICS'
        this.currentTribeFilter = 'All';
        this.currentMugicTribeFilter = 'All';
        this.currentMugicTypeFilter = 'All';
        this.draftedCards = []; // Cartas escolhidas pelo jogador
        this.draftedMugics = []; // Cartas escolhidas pelo jogador
        this.draftedBattlegears = []; // Array mapeando battlegear pra cada index da criatura
        this.selectedBgToEquip = null;
        this.turn = 1; // 1 para Jogador, 2 para Oponente
        this.gameState = 'IDLE'; // Estados: IDLE, SELECT_TARGET, SELECT_MUGIC_TARGET, ENGAGED_COMBAT
        this.selectedAttacker = null; // Guardará o monstro atacante { player, r, c }
        this.activeCombat = null; // { p1Card, p2Card, p1R, p1C, p2R, p2C, currentStriker }
        this.pendingCombat = null;
        this.playerMugics = []; // Mão de feitiços do jogador (P1)
        this.p1MugicDiscard = []; // Descarte de Mugics do P1
        this.p2MugicDiscard = []; // Descarte de Mugics do P2
        this.p1CreatureDiscard = []; // Criaturas destruídas do P1
        this.p2CreatureDiscard = []; // Criaturas destruídas do P2
        this.selectedMugic = null; // Mugic sendo mirado
        
        this.boardElement = document.getElementById("board");
        this.logElement = document.getElementById("combat-log");
        this.nextTurnBtn = document.getElementById("btn-next-turn");
        
        // Tabuleiro 6v6: Pirâmide Invertida com 3 Linhas (Frente=3, Meio=2, Trás=1)
        this.boardP1 = [
            [null, null, null], // Linha 0 (Frente)
            [null, null],       // Linha 1 (Meio)
            [null]              // Linha 2 (Trás)
        ];
        this.boardP2 = [
            [null, null, null], // Linha 0 (Frente)
            [null, null],       // Linha 1 (Meio)
            [null]              // Linha 2 (Trás)
        ];

        // Multiplayer
        this.multiplayerMode = false;
        this.myPlayerNumber = 1;
        this.socket = null;
        this.remoteDraft = null;      // draft recebido do outro jogador
        this.myDraftReady = false;    // se eu já cliquei em Start Battle
    }

    init() {
        this.log("Chaotic Lite Engine Iniciada!");
        if (this.cards.length < 6) {
            document.getElementById("game-container").innerHTML = "<p>Cartas insuficientes no banco de dados. Mínimo 6 necessárias!</p>";
            return;
        }
        
        if (this.nextTurnBtn) {
            this.nextTurnBtn.addEventListener("click", () => this.nextTurn());
        }

        this.renderDraft();
        this.initMultiplayer();
    }

    initMultiplayer() {
        if (typeof io === 'undefined') return; // não está no modo servidor

        this.socket = io();
        this.multiplayerMode = true;

        this.socket.on('assigned', ({ playerNumber }) => {
            this.myPlayerNumber = playerNumber;
            this.log(`🌐 Modo Multiplayer ativo — Você é o Jogador ${playerNumber}`);
        });

        this.socket.on('waiting', () => {
            this.log('⏳ Aguardando segundo jogador conectar...');
        });

        this.socket.on('room_ready', () => {
            this.log('🟢 Oponente conectado! Façam o Draft e cliquem em Iniciar Batalha.');
        });

        this.socket.on('action', (data) => {
            this.executeRemoteAction(data);
        });

        this.socket.on('opponent_disconnected', () => {
            this.log('❌ Oponente desconectou.');
            this.showAlert('Oponente Desconectou', 'Seu oponente saiu da partida.');
        });
    }

    // ─── Helpers de Descarte ──────────────────────────────────────────────────

    /** Remove mugic[index] da mão do player (1 ou 2) e joga no discard pile */
    _discardMugic(playerNum, handArray, index) {
        const mg = handArray.splice(index, 1)[0];
        if (!mg) return null;
        if (playerNum === 1) this.p1MugicDiscard.push(mg);
        else                 this.p2MugicDiscard.push(mg);
        this.log(`🗑️ [${mg.name}] foi para o descarte do Jogador ${playerNum}.`);
        return mg;
    }

    /** Revela o battlegear de uma criatura e aplica todos os efeitos de reveal */
    _revealBattlegear(card) {
        if (!card || !card.battlegear || card.bgRevealed) return;
        card.bgRevealed = true;
        const bg = card.battlegear;
        this.log(`🔮 ${card.name} revelou: [${bg.name}]! ${bg.description}`);

        // Elemento concedido
        if (bg.elementGranted) {
            if (!card.elements) card.elements = [];
            if (!card.elements.includes(bg.elementGranted)) {
                card.elements.push(bg.elementGranted);
                this.log(`✨ ${card.name} ganhou o elemento ${bg.elementGranted}!`);
            }
        }

        // Passivas concedidas (Phobia Mask, Skeletal Steed, Windstrider…)
        if (bg.passivesGranted && bg.passivesGranted.length > 0) {
            if (!card.passives) card.passives = [];
            bg.passivesGranted.forEach(p => {
                if (p.id === '_range') {
                    card._hasRange = true;
                    this.log(`🏹 ${card.name} ganhou Range!`);
                } else {
                    card.passives.push(p);
                    this.log(`💠 ${card.name} ganhou passiva: ${p.id}!`);
                }
            });
        }

        // Energia condicional (Elixir of Tenacity, Ring of Na'arin)
        if (bg.conditionalModifier) {
            const cm = bg.conditionalModifier;
            let condMet = false;
            if (cm.condition === 'power_gte_50')   condMet = (card.power  || 0) >= 50;
            if (cm.condition === 'courage_gte_50') condMet = (card.courage|| 0) >= 50;
            if (condMet) {
                if (cm.stat === 'energy') {
                    card.energy    += cm.value;
                    card.maxEnergy += cm.value;
                }
                this.log(`✅ ${card.name} [${bg.name}]: condição atendida → +${cm.value} ${cm.stat}!`);
            }
        }

        // specialFlags: Stone Mail
        if (bg.specialFlags) {
            if (bg.specialFlags.cannotMove)  card._cannotMove   = true;
            if (bg.specialFlags.noAbilities) card._noAbilities  = true;
            if (bg.specialFlags.damagePenalty) card._damagePenalty = bg.specialFlags.damagePenalty;
        }

        // tribalElement: Whepcrack
        if (bg.tribalElement && card.tribe === bg.tribalElement.tribe) {
            if (!card.elements) card.elements = [];
            if (!card.elements.includes(bg.tribalElement.element)) {
                card.elements.push(bg.tribalElement.element);
                this.log(`✨ ${card.name} [${bg.name}]: ganhou ${bg.tribalElement.element} (tribal)!`);
            }
        }
    }

    /** Aplica combatStartEffect de battlegear para uma criatura */
    _applyBattlegearCombatStart(card) {
        if (!card || !card.battlegear || !card.bgRevealed) return;
        const bg = card.battlegear;
        if (!bg.combatStartEffect) return;
        const eff = bg.combatStartEffect;

        if (eff.type === 'peek_attack_deck') {
            const isP1 = card.player === 1;
            const deck = isP1 ? this.p1AttackDeck : this.p2AttackDeck;
            const top = deck.slice(-eff.count).reverse();
            const names = top.map(c => c.name).join(', ') || '(vazio)';
            this.log(`🔭 [${bg.name}] ${card.name} viu o topo do deck de ataques: ${names}`);
        }
        if (eff.type === 'peek_location_deck') {
            const top = this.locationDeck.slice(-eff.count).reverse();
            const names = top.map(l => l.name).join(', ') || '(vazio)';
            this.log(`🔭 [${bg.name}] ${card.name} viu o topo do deck de locais: ${names}`);
        }
        if (eff.type === 'remove_opponent_invisibility') {
            const opponent = card === this.activeCombat?.p1Card ? this.activeCombat?.p2Card : this.activeCombat?.p1Card;
            if (opponent && opponent._invisibility) {
                delete opponent._invisibility;
                delete opponent._invisibilityTurn;
                this.log(`👁️ [${bg.name}] ${opponent.name} perdeu a Invisibilidade!`);
            }
        }
    }

    /** Empurra carta de criatura no discard pile correto */
    _discardCreature(card) {
        if (!card) return;
        if (card.player === 1) this.p1CreatureDiscard.push(card);
        else                   this.p2CreatureDiscard.push(card);
    }

    sendAction(type, data = {}) {
        if (this.socket && this.multiplayerMode) {
            this.socket.emit('action', { type, ...data });
        }
    }

    isMyTurn() {
        if (!this.multiplayerMode) return this.turn === 1;
        return this.turn === this.myPlayerNumber;
    }

    executeRemoteAction(data) {
        switch (data.type) {
            case 'opponent_draft':
                this.remoteDraft = data.draft;
                this.log('📦 Draft do oponente recebido!');
                if (this.myDraftReady) this._startBattleMultiplayer();
                break;
            case 'move':
                this.resolveMove(data.player, data.fromR, data.fromC, data.toR, data.toC, true);
                break;
            case 'startCombat':
                const attacker = data.initiatingPlayer === 1
                    ? this.boardP1[data.atkR][data.atkC]
                    : this.boardP2[data.atkR][data.atkC];
                const defender = data.initiatingPlayer === 1
                    ? this.boardP2[data.defR][data.defC]
                    : this.boardP1[data.defR][data.defC];
                if (attacker && defender) {
                    this.startCombat(attacker, defender, data.atkR, data.atkC, data.defR, data.defC, data.initiatingPlayer, true);
                }
                break;
            case 'confirmAttack':
                if (this.activeCombat) this.confirmAttack(data.cardIndex, true);
                break;
            case 'passBurst':
                if (this.activeCombat) this.passBurst(true);
                break;
            case 'selectMugic':
                this.selectMugicToPlay(data.index, true);
                break;
            case 'resolveMugicCaster':
                this.resolveMugicCaster(data.r, data.c, true);
                break;
            case 'cancelMugicCaster':
                this.cancelMugicCaster(true);
                break;
            case 'nextTurn':
                this.nextTurn(true);
                break;
            case 'gameOver': {
                // O P1 (ou quem detectou) avisou o fim — mostra tela pro outro lado também
                const winner = data.winner;
                const isWin = winner === this.myPlayerNumber || winner === 0;
                this._showWinScreen(isWin, winner === 0, winner);
                break;
            }
            case 'sync_initial_state':
                // P2 recebe o estado inicial gerado pelo P1 (decks, locais)
                this.p1AttackDeck = data.p1AttackDeck;
                this.p2AttackDeck = data.p2AttackDeck;
                this.p1AttackHand = data.p1AttackHand;
                this.p2AttackHand = data.p2AttackHand;
                this.locationDeck = data.locationDeck;
                this.p2Mugics = data.p2Mugics;
                this.activeLocation = data.activeLocation;
                this.renderLocation();
                this.log(`📍 Local Inicial: ${this.activeLocation ? this.activeLocation.name : '—'}!`);
                if (this.activeLocation) this.showLocationToast(this.activeLocation, false);
                break;
        }
    }

    _startBattleMultiplayer() {
        if (!this.remoteDraft) return;

        const rd = this.remoteDraft;

        if (this.myPlayerNumber === 1) {
            // P1: boardP1 = meu draft, boardP2 = draft do P2
            const p2Cards = rd.cards.map(c => { const card = JSON.parse(JSON.stringify(c)); card.player = 2; card.maxEnergy = card.energy; if (card.mugicCounters === undefined) card.mugicCounters = 0; return card; });
            const p2Bg = rd.battlegears;
            this.playerMugics = JSON.parse(JSON.stringify(this.draftedMugics)); // minhas mugics
            this.p2Mugics = JSON.parse(JSON.stringify(rd.mugics));              // mugics do P2
            this.setupBoard(p2Cards, p2Bg);

            // P1 gera o estado compartilhado (decks aleatórios) e envia ao P2
            this._generateSharedState();
            this.sendAction('sync_initial_state', {
                p1AttackDeck: this.p1AttackDeck,
                p2AttackDeck: this.p2AttackDeck,
                p1AttackHand: this.p1AttackHand,
                p2AttackHand: this.p2AttackHand,
                locationDeck: this.locationDeck,
                p2Mugics: this.p2Mugics,
                activeLocation: this.activeLocation
            });

            this._finishStartBattle();
        } else {
            // P2: boardP1 = draft do P1, boardP2 = meu draft
            const p1Cards = rd.cards.map(c => { const card = JSON.parse(JSON.stringify(c)); card.player = 1; card.maxEnergy = card.energy; if (card.mugicCounters === undefined) card.mugicCounters = 0; return card; });
            const p1Bg = rd.battlegears;
            const p1Mugics = JSON.parse(JSON.stringify(rd.mugics));

            // Posiciona as cartas do P1 no boardP1
            const p1Formation = [{r:2,c:0},{r:1,c:0},{r:1,c:1},{r:0,c:0},{r:0,c:1},{r:0,c:2}];
            p1Cards.forEach((card, i) => {
                if (i < p1Formation.length) {
                    const pos = p1Formation[i];
                    if (p1Bg && p1Bg[i]) { card.battlegear = JSON.parse(JSON.stringify(p1Bg[i])); card.bgRevealed = false; }
                    this.boardP1[pos.r][pos.c] = card;
                }
            });
            this.playerMugics = JSON.parse(JSON.stringify(this.draftedMugics)); // minhas mugics (P2)

            // Posiciona minhas cartas no boardP2
            const p2Formation = [{r:2,c:0},{r:1,c:0},{r:1,c:1},{r:0,c:0},{r:0,c:1},{r:0,c:2}];
            this.draftedCards.forEach((baseCard, i) => {
                if (i < p2Formation.length) {
                    const pos = p2Formation[i];
                    const card = JSON.parse(JSON.stringify(baseCard));
                    card.player = 2; card.maxEnergy = card.energy;
                    if (card.mugicCounters === undefined) card.mugicCounters = 0;
                    if (this.draftedBattlegears && this.draftedBattlegears[i]) {
                        card.battlegear = JSON.parse(JSON.stringify(this.draftedBattlegears[i]));
                        card.bgRevealed = false;
                    }
                    this.boardP2[pos.r][pos.c] = card;
                }
            });
            // Mugics do P2 (minhas mugics ficam como playerMugics pra poder usar no burst)
            // Nota: em multiplayer P2 usa this.draftedMugics diretamente
            this.p2Mugics = JSON.parse(JSON.stringify(this.draftedMugics));

            // Estado compartilhado (decks) vem via sync_initial_state
            this._finishStartBattle();
        }
    }

    _generateSharedState() {
        // Gera attack decks, hands e location deck (mesma lógica do startBattle)
        this.p1AttackDeck = [];
        this.p2AttackDeck = [];
        this.p1AttackHand = [];
        this.p2AttackHand = [];
        this.locationDeck = [];

        if (this.attacksData && this.attacksData.length > 0) {
            for (let i = 0; i < 20; i++) {
                this.p1AttackDeck.push(this.attacksData[Math.floor(Math.random() * this.attacksData.length)]);
                this.p2AttackDeck.push(this.attacksData[Math.floor(Math.random() * this.attacksData.length)]);
            }
            this.p1AttackHand.push(this.p1AttackDeck.pop());
            this.p1AttackHand.push(this.p1AttackDeck.pop());
            this.p2AttackHand.push(this.p2AttackDeck.pop());
            this.p2AttackHand.push(this.p2AttackDeck.pop());
        }

        if (this.locationsData && this.locationsData.length > 0) {
            let available = [...this.locationsData, ...this.locationsData];
            for (let i = 0; i < 10; i++) {
                if (available.length === 0) break;
                const idx = Math.floor(Math.random() * available.length);
                this.locationDeck.push(available[idx]);
                available.splice(idx, 1);
            }
        }

        if (this.locationDeck.length > 0) {
            this.activeLocation = this.locationDeck.pop();
        }
    }

    _finishStartBattle() {
        this.renderBoard();
        this.renderMugics();
        this.renderLocation();
        const myRole = this.myPlayerNumber === 1 ? 'Jogador 1 (você ataca primeiro)' : 'Jogador 2 (aguarde o Jogador 1)';
        this.log(`⚔️ Batalha Multiplayer iniciada! ${myRole}`);
    }

    filterTribe(tribe) {
        this.currentTribeFilter = tribe;
        this.renderDraft();
    }
    
    renderDraft() {
        const container = document.getElementById("draft-cards-container");
        const draftedContainer = document.getElementById("drafted-deck");
        let html = '';
        
        this.cards.forEach((card, index) => {
            if (this.currentTribeFilter !== 'All' && card.tribe !== this.currentTribeFilter) return;

            const count = this.draftedCards.filter(c => c.name === card.name).length;
            const isFull = this.draftedCards.length >= 6;
            const isMaxedOut = count >= 2;
            const disabled = isFull || isMaxedOut;
            
            const borderStyle = count > 0 ? 'border: 3px solid #2ecc71; box-shadow: 0 0 15px #2ecc71;' : 'border: 2px solid #7f8c8d;';
            const opacityStyle = disabled ? 'opacity: 0.5; filter: grayscale(80%); cursor: not-allowed;' : 'cursor: pointer;';
            
            // Elementos da criatura
            let elementsHtml = '';
            if (card.elements && card.elements.length > 0) {
                const iconMap = { "Fire": "🔥", "Water": "💧", "Earth": "🪨", "Air": "🌪️" };
                elementsHtml = `<div style="display: flex; gap: 5px; justify-content: center; margin-top: -10px; z-index: 2; position: relative;">`;
                card.elements.forEach(el => {
                    elementsHtml += `<div title="${el}" style="background: rgba(0,0,0,0.8); border: 1px solid #7f8c8d; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px;">${iconMap[el] || '✨'}</div>`;
                });
                elementsHtml += `</div>`;
            }

            html += `
                <div class="card" onclick="game.addDraftCard(${index})" title="${this.getPassiveDescription(card).replace(/"/g, '&quot;')}" style="${borderStyle} ${opacityStyle}">
                    <div class="card-header">
                        <div class="card-rarity-icon rarity-${(card.rarity || 'Common').toLowerCase().replace(/\s+/g, '-')}" title="${card.rarity || 'Common'}">${card.rarity === 'Ultra Rare' ? '💎' : card.rarity === 'Super Rare' ? '🔷' : card.rarity === 'Rare' ? '🔶' : card.rarity === 'Legendary' ? '🌟' : '⚪'}</div>
                        <div class="card-tribe">${card.tribe}</div>
                        <div class="card-name">${card.name} ${count > 0 ? `(x${count})` : ''}</div>
                    </div>
                    <div class="card-image-container">
                        ${card.image ? `<img src="${card.image}" class="card-image" alt="${card.name}">` : `<div class="card-image-placeholder">Sem Imagem</div>`}
                    </div>
                    
                    ${elementsHtml}
                    ${this._getPassiveBadgesHtml(card)}
                    <div class="card-stats">
                        <div class="stat-box" data-tip="Coragem — define quem ataca primeiro na iniciativa. Usada em ataques de Courage e pela passiva Intimidate."><span class="stat-icon">⚔️</span><span class="stat-label">COR</span><span class="stat-value">${card.courage}</span></div>
                        <div class="stat-box" data-tip="Poder — usado em ataques físicos de Poder. Quanto maior, mais dano em ataques de Power."><span class="stat-icon">💪</span><span class="stat-label">POD</span><span class="stat-value">${card.power}</span></div>
                        <div class="stat-box" data-tip="Sabedoria — usado em ataques mágicos de Sabedoria. Também define quem pode conjurar Mugics mais caras."><span class="stat-icon">🧠</span><span class="stat-label">SAB</span><span class="stat-value">${card.wisdom}</span></div>
                        <div class="stat-box" data-tip="Velocidade — usado em ataques de Speed e na disputa de iniciativa. Swift aumenta este valor."><span class="stat-icon">⚡</span><span class="stat-label">VEL</span><span class="stat-value">${card.speed}</span></div>
                    </div>
                    <div class="card-energy-container" style="padding: 6px; background: #c0392b; border-top: 2px solid #7f8c8d; text-align: center; color: white; font-weight: bold;">
                        ❤️ ${card.energy}
                        ${(() => {
                            const mgCnt = card.mugicCounters || 0;
                            if (mgCnt === 0) return '';
                            let mHtml = '<div style="display: flex; justify-content: center; gap: 2px; margin-top: 3px;">';
                            for(let i=0; i<mgCnt; i++) mHtml += '<span style="color: #9b59b6; font-size: 14px; text-shadow: 1px 1px 2px black;">♪</span>';
                            mHtml += '</div>';
                            return mHtml;
                        })()}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        
        if (draftedContainer) {
            let draftedHtml = '';
            this.draftedCards.forEach((c, i) => {
                draftedHtml += `
                    <div onclick="game.removeDraftCard(${i})" style="width: 80px; height: 80px; cursor: pointer; border: 2px solid #e74c3c; border-radius: 5px; overflow: hidden; position: relative;">
                        ${c.image ? `<img src="${c.image}" style="width: 100%; height: 100%; object-fit: cover;">` : `<div style="background:#2c3e50;width:100%;height:100%;"></div>`}
                        <div style="background: rgba(0,0,0,0.7); color: white; font-size: 10px; position: absolute; bottom: 0; width: 100%; text-align: center; padding: 2px 0;">Remover</div>
                    </div>
                `;
            });
            draftedContainer.innerHTML = draftedHtml;
        }
        
        const counter = document.getElementById("draft-counter");
        counter.innerText = `${this.draftedCards.length} / 6 Escolhidas`;
        
        const btnStart = document.getElementById("btn-start-battle");
        if (this.draftedCards.length === 6) {
            btnStart.classList.remove("hidden");
            btnStart.style.display = "block";
        } else {
            btnStart.classList.add("hidden");
            btnStart.style.display = "none";
        }
        
        this.updateSynergyPreview();
        this.updateDeckStats();
    }

    applyDraftFilters() {
        const tribe   = (document.getElementById('df-tribe')    || {}).value || 'All';
        const stat    = (document.getElementById('df-stat')     || {}).value || '';
        const statVal = parseInt((document.getElementById('df-stat-val') || {}).value) || 0;
        const passive = (document.getElementById('df-passive')  || {}).value || '';
        const sort    = (document.getElementById('df-sort')     || {}).value || 'default';

        let filtered = this.cards.map((card, index) => ({ card, index }));

        // Tribe filter
        if (tribe !== 'All') {
            filtered = filtered.filter(({ card }) => card.tribe === tribe);
        }

        // Stat minimum filter
        if (stat && stat !== 'none' && statVal > 0) {
            filtered = filtered.filter(({ card }) => (card[stat] || 0) >= statVal);
        }

        // Passive filter
        if (passive && passive !== 'none') {
            filtered = filtered.filter(({ card }) =>
                card.passives && card.passives.some(p => (typeof p === 'string' ? p : p.id) === passive)
            );
        }

        // Sort
        if (sort !== 'default') {
            filtered.sort((a, b) => (b.card[sort] || 0) - (a.card[sort] || 0));
        }

        // Count display
        const countEl = document.getElementById('df-count');
        if (countEl) countEl.textContent = `${filtered.length} de ${this.cards.length} criaturas`;

        // Render only filtered cards
        const container = document.getElementById('draft-cards-container');
        if (!container) return;
        const iconMap = { Fire: '🔥', Water: '💧', Earth: '🪨', Air: '🌪️' };
        let html = '';
        filtered.forEach(({ card, index }) => {
            const count      = this.draftedCards.filter(c => c.name === card.name).length;
            const isFull     = this.draftedCards.length >= 6;
            const isMaxedOut = count >= 2;
            const disabled   = isFull || isMaxedOut;
            const borderStyle  = count > 0 ? 'border: 3px solid #2ecc71; box-shadow: 0 0 15px #2ecc71;' : 'border: 2px solid #7f8c8d;';
            const opacityStyle = disabled ? 'opacity: 0.5; filter: grayscale(80%); cursor: not-allowed;' : 'cursor: pointer;';
            let elementsHtml = '';
            if (card.elements && card.elements.length > 0) {
                elementsHtml = `<div style="display:flex;gap:5px;justify-content:center;margin-top:-10px;z-index:2;position:relative;">`;
                card.elements.forEach(el => {
                    elementsHtml += `<div title="${el}" style="background:rgba(0,0,0,0.8);border:1px solid #7f8c8d;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:12px;">${iconMap[el] || '✨'}</div>`;
                });
                elementsHtml += `</div>`;
            }
            html += `
                <div class="card" onclick="game.addDraftCard(${index})" title="${this.getPassiveDescription(card).replace(/"/g, '&quot;')}" style="${borderStyle} ${opacityStyle}">
                    <div class="card-header">
                        <div class="card-rarity-icon rarity-${(card.rarity||'Common').toLowerCase().replace(/\s+/g,'-')}" title="${card.rarity||'Common'}">${card.rarity==='Ultra Rare'?'💎':card.rarity==='Super Rare'?'🔷':card.rarity==='Rare'?'🔶':card.rarity==='Legendary'?'🌟':'⚪'}</div>
                        <div class="card-tribe">${card.tribe}</div>
                        <div class="card-name">${card.name} ${count>0?`(x${count})`:''}</div>
                    </div>
                    <div class="card-image-container">${card.image?`<img src="${card.image}" class="card-image" alt="${card.name}">`:`<div class="card-image-placeholder">Sem Imagem</div>`}</div>
                    ${elementsHtml}
                    ${this._getPassiveBadgesHtml(card)}
                    <div class="card-stats">
                        <div class="stat-box" data-tip="Coragem — define quem ataca primeiro na iniciativa."><span class="stat-icon">⚔️</span><span class="stat-label">COR</span><span class="stat-value">${card.courage}</span></div>
                        <div class="stat-box" data-tip="Poder — usado em ataques físicos de Poder."><span class="stat-icon">💪</span><span class="stat-label">POD</span><span class="stat-value">${card.power}</span></div>
                        <div class="stat-box" data-tip="Sabedoria — usado em ataques mágicos."><span class="stat-icon">🧠</span><span class="stat-label">SAB</span><span class="stat-value">${card.wisdom}</span></div>
                        <div class="stat-box" data-tip="Velocidade — iniciativa e ataques de Speed."><span class="stat-icon">⚡</span><span class="stat-label">VEL</span><span class="stat-value">${card.speed}</span></div>
                    </div>
                    <div class="card-energy-container" style="padding:6px;background:#c0392b;border-top:2px solid #7f8c8d;text-align:center;color:white;font-weight:bold;">❤️ ${card.energy}</div>
                </div>`;
        });
        container.innerHTML = html;

        // Sync drafted deck panel, counter, and start button (same as renderDraft)
        const draftedContainer = document.getElementById('drafted-deck');
        if (draftedContainer) {
            let draftedHtml = '';
            this.draftedCards.forEach((c, i) => {
                draftedHtml += `
                    <div onclick="game.removeDraftCard(${i})" style="width:80px;height:80px;cursor:pointer;border:2px solid #e74c3c;border-radius:5px;overflow:hidden;position:relative;">
                        ${c.image ? `<img src="${c.image}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="background:#2c3e50;width:100%;height:100%;"></div>`}
                        <div style="background:rgba(0,0,0,0.7);color:white;font-size:10px;position:absolute;bottom:0;width:100%;text-align:center;padding:2px 0;">Remover</div>
                    </div>`;
            });
            draftedContainer.innerHTML = draftedHtml;
        }
        const counter = document.getElementById('draft-counter');
        if (counter) counter.innerText = `${this.draftedCards.length} / 6 Escolhidas`;
        const btnStart = document.getElementById('btn-start-battle');
        if (btnStart) {
            if (this.draftedCards.length === 6) { btnStart.classList.remove('hidden'); btnStart.style.display = 'block'; }
            else { btnStart.classList.add('hidden'); btnStart.style.display = 'none'; }
        }
        this.updateSynergyPreview();
        this.updateDeckStats();
    }

    clearDraftFilters() {
        ['df-tribe','df-stat','df-passive','df-sort'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.selectedIndex = 0;
        });
        const valEl = document.getElementById('df-stat-val');
        if (valEl) valEl.value = '50';
        const countEl = document.getElementById('df-count');
        if (countEl) countEl.textContent = '';
        this.renderDraft();
    }

    updateDeckStats() {
        const panel = document.getElementById('deck-stats-panel');
        if (!panel) return;
        if (!this.draftedCards || this.draftedCards.length === 0) {
            panel.style.display = 'none';
            return;
        }
        panel.style.display = 'block';

        const n = this.draftedCards.length;
        const avg = stat => Math.round(this.draftedCards.reduce((s, c) => s + (c[stat] || 0), 0) / n);

        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setVal('ds-v-courage', avg('courage'));
        setVal('ds-v-power',   avg('power'));
        setVal('ds-v-wisdom',  avg('wisdom'));
        setVal('ds-v-speed',   avg('speed'));
        setVal('ds-v-energy',  avg('energy'));

        // Tribe bars
        const tribeEl = document.getElementById('ds-tribes');
        if (tribeEl) {
            const tribeCount = {};
            this.draftedCards.forEach(c => { tribeCount[c.tribe] = (tribeCount[c.tribe] || 0) + 1; });
            const tribeColors = { OverWorld: '#0ea5e9', UnderWorld: '#dc2626', Mipedian: '#d97706', Danian: '#9333ea', "M'arrillian": '#0f766e' };
            let tbHtml = '';
            Object.entries(tribeCount).sort((a,b) => b[1]-a[1]).forEach(([tribe, cnt]) => {
                const pct = Math.round((cnt / n) * 100);
                const color = tribeColors[tribe] || '#64748b';
                tbHtml += `
                    <div class="ds-tribe-row">
                        <span class="ds-tribe-name" style="color:${color}">${tribe}</span>
                        <div class="ds-tribe-bar-wrap">
                            <div class="ds-tribe-bar" style="width:${pct}%;background:${color}"></div>
                        </div>
                        <span class="ds-tribe-cnt">${cnt}</span>
                    </div>`;
            });
            tribeEl.innerHTML = tbHtml;
        }

        // Passive badges
        const passEl = document.getElementById('ds-passives');
        if (passEl) {
            const seen = {};
            this.draftedCards.forEach(c => {
                if (!c.passives) return;
                c.passives.forEach(p => {
                    const id = typeof p === 'string' ? p : p.id;
                    if (!seen[id]) seen[id] = 0;
                    seen[id]++;
                });
            });
            const passiveColors = { intimidate:'#f59e0b', swift:'#3b82f6', strike:'#ef4444', tough:'#10b981', berserk:'#dc2626', reckless:'#f97316', fireproof:'#ef4444', _range:'#8b5cf6', brainwash:'#ec4899' };
            const passiveLabels = { intimidate:'Intimidate', swift:'Swift', strike:'Strike', tough:'Tough', berserk:'Berserk', reckless:'Reckless', fireproof:'Fireproof', _range:'Range', brainwash:'Brainwash' };
            let pbHtml = '';
            Object.entries(seen).forEach(([id, cnt]) => {
                const color = passiveColors[id] || '#64748b';
                const label = passiveLabels[id] || id;
                pbHtml += `<span class="ds-passive-badge" style="background:${color}22;border:1px solid ${color};color:${color}">${label} ×${cnt}</span>`;
            });
            passEl.innerHTML = pbHtml || '<span style="color:#64748b;font-size:11px">Nenhuma passiva</span>';
        }
    }

    updateSynergyPreview() {
        const previewEl = document.getElementById("synergy-preview");
        if (!previewEl) return;
        
        const tribes = {};
        this.draftedCards.forEach(c => {
            if (!tribes[c.tribe]) tribes[c.tribe] = 0;
            tribes[c.tribe]++;
        });
        
        let msg = [];
        Object.keys(tribes).forEach(t => {
            const count = tribes[t];
            if (count > 0) {
                switch(t) {
                    case "OverWorld": msg.push(`OverWorld (${count}): +${count*5} Coragem/Sabedoria`); break;
                    case "UnderWorld": msg.push(`UnderWorld (${count}): +${count*10} Poder`); break;
                    case "Danian": msg.push(`Danian (${count}): +${count*5} Todos os Status`); break;
                    case "Mipedian": msg.push(`Mipedian (${count}): +${count*10} Velocidade`); break;
                }
            }
        });
        
        if (msg.length > 0) {
            previewEl.innerHTML = msg.join(" | ");
        } else {
            previewEl.innerHTML = "Nenhuma sinergia ativa ainda.";
        }
    }

    _hasActiveDraftFilters() {
        const tribe   = (document.getElementById('df-tribe')   || {}).value || 'All';
        const stat    = (document.getElementById('df-stat')    || {}).value || 'none';
        const statVal = parseInt((document.getElementById('df-stat-val') || {}).value) || 0;
        const passive = (document.getElementById('df-passive') || {}).value || 'none';
        const sort    = (document.getElementById('df-sort')    || {}).value || 'default';
        return tribe !== 'All' || (stat !== 'none' && statVal > 0) || passive !== 'none' || sort !== 'default';
    }

    _refreshDraftView() {
        if (this._hasActiveDraftFilters()) {
            this.applyDraftFilters();
        } else {
            this.renderDraft();
        }
    }

    addDraftCard(index) {
        if (this.appState !== 'DRAFT') return;
        const card = this.cards[index];
        const count = this.draftedCards.filter(c => c.name === card.name).length;

        if (this.draftedCards.length < 6 && count < 2) {
            this.draftedCards.push(card);
            this._refreshDraftView();
        }
    }

    removeDraftCard(draftIndex) {
        if (this.appState !== 'DRAFT') return;
        this.draftedCards.splice(draftIndex, 1);
        this._refreshDraftView();
    }

    advanceDraft() {
        this.draftState = 'BATTLEGEARS';
        
        // Esconde primeira parte do draft e mostra a segunda
        const draftTitle = document.querySelector('.draft-header');
        const draftContainer = document.getElementById("draft-cards-container");
        if (draftTitle) draftTitle.style.display = 'none';
        if (draftContainer) draftContainer.style.display = 'none';
        
        const bgScreen = document.getElementById("battlegear-draft-screen");
        if (bgScreen) bgScreen.style.display = 'block';

        // Reseta sugestões para recalcular com o exército atual
        this._bgRecommendations = null;
        this._bgPickerOpen = null;
        this.draftedBattlegears = [];

        this.renderBattlegearDraft();
    }

    // ── Motor de recomendação de Battlegear ─────────────────────────────────────
    _scoreBattlegearForCreature(bg, creature) {
        let score = 0;

        // Bônus de stats — valoriza o stat mais alto da criatura
        const m = bg.modifiers || {};
        const statScore = (m.courage  || 0) * (creature.courage  / 100)
                        + (m.power    || 0) * (creature.power    / 100)
                        + (m.wisdom   || 0) * (creature.wisdom   / 100)
                        + (m.speed    || 0) * (creature.speed    / 100)
                        + (m.energy   || 0) * 0.5;
        score += statScore;

        // Afinidade tribal
        if (bg.tribalElement && bg.tribalElement.tribe === creature.tribe)  score += 20;
        if (bg.name === 'Mipedian Cactus'    && creature.tribe === 'Mipedian')   score += 20;
        if (bg.name === 'Riverland Star'     && creature.tribe === 'OverWorld')  score += 15;
        if (bg.name === 'Whepcrack'          && creature.tribe === 'UnderWorld') score += 15;
        if (bg.name === 'Talisman of the Mandiblor' && creature.tribe === 'Danian') score += 20;

        // Sinergias de elemento — valoriza se a criatura já tem o elemento
        if (bg.elementGranted && creature.elements && creature.elements.includes(bg.elementGranted)) score += 10;

        // Valoriza sacrifícios em criaturas resistentes (mais energia)
        if (bg.sacrificeEffect) score += creature.energy / 20;

        // Passivas úteis
        if (bg.passivesGranted && bg.passivesGranted.length > 0) score += 15;

        // Face-up é sempre bom
        if (bg.faceUp) score += 10;

        // Condicional — valoriza se criatura atende a condição
        if (bg.conditionalModifier) {
            const cm = bg.conditionalModifier;
            if (cm.condition === 'power_gte_50'   && (creature.power   || 0) >= 50) score += 15;
            if (cm.condition === 'courage_gte_50' && (creature.courage || 0) >= 50) score += 15;
        }

        // Stone Mail — bom só pra tanks com muita vida
        if (bg.name === 'Stone Mail') score = creature.energy >= 70 ? 25 : 5;

        return score;
    }

    _recommendBattlegears() {
        // Para cada criatura, ordena todos os battlegears por score e retorna o top
        return this.draftedCards.map(creature => {
            const scored = this.battlegearsData
                .map((bg, idx) => ({ bg, idx, score: this._scoreBattlegearForCreature(bg, creature) }))
                .sort((a, b) => b.score - a.score);
            return scored; // [0] = melhor
        });
    }

    renderBattlegearDraft() {
        const armyListContainer = document.getElementById("army-list");
        const counter           = document.getElementById("bg-draft-counter");
        if (!armyListContainer) return;

        // Gera sugestões se ainda não foram aplicadas
        if (!this._bgRecommendations) {
            this._bgRecommendations = this._recommendBattlegears();
            // Pré-equipar com o top-1 de cada criatura
            this.draftedCards.forEach((_, i) => {
                if (!this.draftedBattlegears[i] && this._bgRecommendations[i]?.[0]) {
                    this.draftedBattlegears[i] = this._bgRecommendations[i][0].bg;
                }
            });
        }

        let equippedCount = this.draftedBattlegears.filter(Boolean).length;
        let html = '';

        this.draftedCards.forEach((creature, ci) => {
            const equipped   = this.draftedBattlegears[ci];
            const recs       = this._bgRecommendations[ci] || [];
            const topScore   = recs[0]?.score || 1;
            const isOpen     = this._bgPickerOpen === ci;

            const rarityIcon = bg => bg.rarity === 'Ultra Rare' ? '💎' : bg.rarity === 'Super Rare' ? '🔷' : bg.rarity === 'Rare' ? '🔶' : bg.rarity === 'Uncommon' ? '🔹' : '⚪';
            const tribeColor = creature.tribe === 'OverWorld' ? '#3498db' : creature.tribe === 'UnderWorld' ? '#e74c3c' : creature.tribe === 'Mipedian' ? '#f39c12' : creature.tribe === 'Danian' ? '#27ae60' : '#9b59b6';

            // ── Card da criatura ────────────────────────────────────────────
            html += `
            <div style="background: #1a1a2e; border: 2px solid ${equipped ? '#2ecc71' : '#e74c3c'};
                        border-radius: 12px; overflow: hidden;">

                <!-- Topo: criatura + battlegear equipado -->
                <div style="display:flex; gap:12px; padding:12px; align-items:center;">

                    <!-- Foto da criatura -->
                    <div style="flex-shrink:0; width:64px; height:80px; border-radius:8px; overflow:hidden; border:2px solid ${tribeColor};">
                        ${creature.image
                            ? `<img src="${creature.image}" style="width:100%;height:100%;object-fit:cover;">`
                            : `<div style="width:100%;height:100%;background:#2c3e50;display:flex;align-items:center;justify-content:center;font-size:22px;">⚔️</div>`}
                    </div>

                    <!-- Info da criatura -->
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:bold; color:#ecf0f1; font-size:14px; margin-bottom:2px;">${creature.name}</div>
                        <div style="font-size:10px; color:${tribeColor}; margin-bottom:6px;">${creature.tribe}</div>
                        <div style="font-size:10px; color:#95a5a6;">
                            ⚔️${creature.courage} 💪${creature.power} 🧠${creature.wisdom} ⚡${creature.speed} ❤️${creature.energy}
                        </div>
                    </div>

                    <!-- Battlegear equipado -->
                    <div style="flex-shrink:0; text-align:right;">
                        ${equipped ? `
                            <div style="font-size:10px; color:#95a5a6; margin-bottom:2px;">Equipado</div>
                            <div style="font-weight:bold; color:#f1c40f; font-size:12px; max-width:110px; text-align:right;">${rarityIcon(equipped)} ${equipped.name}</div>
                            ${recs[0]?.bg.name === equipped.name
                                ? `<div style="font-size:9px; color:#2ecc71; margin-top:2px;">✨ Recomendado</div>`
                                : `<div style="font-size:9px; color:#f39c12; margin-top:2px;">🔄 Personalizado</div>`}
                        ` : `
                            <div style="color:#e74c3c; font-size:12px; font-weight:bold;">Sem Item</div>
                        `}
                    </div>
                </div>

                <!-- Botão trocar -->
                <div style="padding: 0 12px 10px;">
                    <button onclick="game.toggleBgPicker(${ci})"
                            style="width:100%; background:${isOpen ? '#8e44ad' : '#2c3e50'}; border:1px solid ${isOpen ? '#9b59b6' : '#7f8c8d'};
                                   color:#ecf0f1; border-radius:6px; padding:6px; cursor:pointer; font-size:12px;
                                   transition:all 0.2s;">
                        ${isOpen ? '▲ Fechar seleção' : '🔀 Trocar Battlegear'}
                    </button>
                </div>

                <!-- Picker inline (abre/fecha) -->
                ${isOpen ? `
                <div style="border-top:1px solid #2c3e50; padding:10px; display:grid;
                            grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap:8px;
                            max-height:320px; overflow-y:auto; background:rgba(0,0,0,0.3);">
                    ${recs.map(({ bg, idx, score }) => {
                        const pct     = Math.round((score / topScore) * 100);
                        const barColor = pct >= 80 ? '#2ecc71' : pct >= 50 ? '#f39c12' : '#e74c3c';
                        const isEquipped = equipped && equipped.name === bg.name;
                        return `
                        <div onclick="game.pickBattlegear(${ci}, ${idx})"
                             style="background:${isEquipped ? 'rgba(46,204,113,0.2)' : '#1e2d3d'};
                                    border:2px solid ${isEquipped ? '#2ecc71' : '#34495e'};
                                    border-radius:8px; padding:8px; cursor:pointer;
                                    transition:all 0.15s;"
                             onmouseover="this.style.borderColor='#f1c40f'"
                             onmouseout="this.style.borderColor='${isEquipped ? '#2ecc71' : '#34495e'}'">

                            <!-- Nome + rarity -->
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                                <span style="font-weight:bold; color:#f1c40f; font-size:11px;">${bg.name}</span>
                                <span title="${bg.rarity}">${rarityIcon(bg)}</span>
                            </div>

                            <!-- Barra de afinidade -->
                            <div style="background:#2c3e50; border-radius:4px; height:5px; margin-bottom:6px;">
                                <div style="width:${pct}%; height:100%; background:${barColor}; border-radius:4px; transition:width 0.3s;"></div>
                            </div>
                            <div style="font-size:9px; color:${barColor}; margin-bottom:5px;">
                                ${pct >= 80 ? '⭐ Muito indicado' : pct >= 50 ? '👍 Indicado' : '○ Baixa sinergia'} (${pct}%)
                            </div>

                            <!-- Descrição -->
                            <div style="font-size:10px; color:#bdc3c7; line-height:1.4;">${bg.description}</div>

                            ${isEquipped ? `<div style="text-align:center; color:#2ecc71; font-size:10px; margin-top:5px; font-weight:bold;">✔ Equipado</div>` : ''}
                        </div>`;
                    }).join('')}
                </div>
                ` : ''}
            </div>`;
        });

        armyListContainer.innerHTML = html;

        // Botão avançar
        equippedCount = this.draftedBattlegears.filter(Boolean).length;
        const finishBtn = document.getElementById('btn-finish-draft');
        if (finishBtn) {
            if (equippedCount === this.draftedCards.length) {
                finishBtn.classList.remove('hidden');
                finishBtn.style.display = 'block';
                finishBtn.onclick = () => this.advanceToMugicDraft();
                finishBtn.innerText = "Escolher Mugics →";
            } else {
                finishBtn.classList.add('hidden');
                finishBtn.style.display = 'none';
            }
        }
        if (counter) counter.innerText = `${equippedCount} / ${this.draftedCards.length} Equipadas`;
    }

    toggleBgPicker(creatureIndex) {
        this._bgPickerOpen = this._bgPickerOpen === creatureIndex ? null : creatureIndex;
        this.renderBattlegearDraft();
    }

    pickBattlegear(creatureIndex, bgIndex) {
        this.draftedBattlegears[creatureIndex] = this.battlegearsData[bgIndex];
        this._bgPickerOpen = null; // fecha o picker
        this.renderBattlegearDraft();
    }

    selectBattlegearToEquip(index) {
        this.selectedBgToEquip = index;
        this.renderBattlegearDraft();
    }

    equipBattlegear(draftIndex) {
        if (this.selectedBgToEquip === null) {
            this.showAlert("⚔️ Equipamento não selecionado", "Selecione um equipamento primeiro na lista ao lado!");
            return;
        }
        this.draftedBattlegears[draftIndex] = this.battlegearsData[this.selectedBgToEquip];
        this.selectedBgToEquip = null;
        this.renderBattlegearDraft();
    }

    advanceToMugicDraft() {
        this.draftState = 'MUGICS';
        document.getElementById("battlegear-draft-screen").style.display = "none";
        document.getElementById("mugic-draft-screen").style.display = "block";
        document.getElementById("btn-finish-draft").style.display = "none";
        this.currentMugicTribeFilter = 'All';
        this.currentMugicTypeFilter = 'All';
        
        const tribeSelect = document.getElementById("mg-tribe-filter");
        const typeSelect = document.getElementById("mg-type-filter");
        if(tribeSelect) tribeSelect.value = 'All';
        if(typeSelect) typeSelect.value = 'All';
        
        this.renderMugicDraft();
    }

    filterMugicDraft() {
        const tribeSelect = document.getElementById("mg-tribe-filter");
        const typeSelect = document.getElementById("mg-type-filter");
        if(tribeSelect) this.currentMugicTribeFilter = tribeSelect.value;
        if(typeSelect) this.currentMugicTypeFilter = typeSelect.value;
        this.renderMugicDraft();
    }

    renderMugicDraft() {
        const mgListContainer = document.getElementById("mugic-list");
        const draftedContainer = document.getElementById("drafted-mugics-grid");
        const counter = document.getElementById("mg-draft-counter");
        const finishBtn = document.getElementById("btn-finish-mg-draft");
        
        if (!mgListContainer || !draftedContainer) return;
        
        // Coletar tribos presentes no exército
        const armyTribes = new Set();
        this.draftedCards.forEach(c => armyTribes.add(c.tribe));

        let mgHtml = '';
        this.mugics.forEach((mg, index) => {
            if (this.currentMugicTribeFilter !== 'All' && mg.tribe !== this.currentMugicTribeFilter) return;
            
            if (this.currentMugicTypeFilter !== 'All') {
                if (this.currentMugicTypeFilter === 'heal' && !mg.effectType.includes('heal')) return;
                if (this.currentMugicTypeFilter === 'damage' && !mg.effectType.includes('damage')) return;
                if (this.currentMugicTypeFilter === 'buff' && !mg.effectType.includes('buff')) return;
                if (this.currentMugicTypeFilter === 'utility' && mg.effectType.includes('heal') && mg.effectType.includes('damage') && mg.effectType.includes('buff')) return; // Simple utility filter
                
                // Melhorando o utility filter:
                const isHeal = mg.effectType.includes('heal');
                const isDmg = mg.effectType.includes('damage');
                const isBuff = mg.effectType.includes('buff');
                if (this.currentMugicTypeFilter === 'utility' && (isHeal || isDmg || isBuff)) return;
            }

            // Só exibe se for da tribo ou genérica, ou se o jogador quiser gastar 1 a mais.
            // A regra do Chaotic permite qualquer tribo usar qualquer mugic (pagando +1 se fora), 
            // então vamos mostrar TODAS as mugics, mas colorir ou avisar.
            const isAffiliated = mg.tribe === "Generic" || armyTribes.has(mg.tribe);
            const warningHtml = !isAffiliated ? `<div style="color:#e74c3c; font-size:9px; margin-top:3px;">Penalidade: Custo +1</div>` : '';
            
            const rarityIcon  = mg.rarity === 'Ultra Rare' ? '💎' : mg.rarity === 'Super Rare' ? '🔷' : mg.rarity === 'Rare' ? '🔶' : mg.rarity === 'Uncommon' ? '🔹' : '⚪';
            const tribeColor  = mg.tribe === 'OverWorld' ? '#3498db' : mg.tribe === 'UnderWorld' ? '#e74c3c' : mg.tribe === 'Mipedian' ? '#f39c12' : mg.tribe === 'Danian' ? '#27ae60' : '#9b59b6';
            mgHtml += `
                <div onclick="game.draftMugic(${index})"
                     style="background: linear-gradient(160deg, #1a1a2e 60%, rgba(0,0,0,0.85));
                            border: 2px solid ${isAffiliated ? '#2ecc71' : '#e74c3c'};
                            border-radius: 10px; padding: 12px; cursor: pointer;
                            display: flex; flex-direction: column; gap: 7px;
                            transition: transform 0.15s, box-shadow 0.15s;"
                     onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.6)'"
                     onmouseout="this.style.transform='';this.style.boxShadow=''">

                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:4px;">
                        <div style="font-weight:bold; color:#f1c40f; font-size:13px; line-height:1.3;">${mg.name}</div>
                        <div style="font-size:14px; flex-shrink:0;" title="${mg.rarity || 'Common'}">${rarityIcon}</div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:10px; color:${tribeColor}; font-weight:bold; background:rgba(0,0,0,0.4); padding:2px 7px; border-radius:10px;">${mg.tribe}</span>
                        <span style="font-size:11px; color:#ecf0f1;">Custo: <b style="color:#9b59b6;">${mg.cost} ♪</b></span>
                    </div>

                    <div style="border-top:1px solid rgba(255,255,255,0.1);"></div>

                    <div style="font-size:11px; color:#bdc3c7; line-height:1.5; text-align:left;">${mg.description}</div>

                    ${warningHtml}
                </div>
            `;
        });
        mgListContainer.innerHTML = mgHtml;
        
        let draftedHtml = '';
        for (let i = 0; i < 6; i++) {
            if (i < this.draftedMugics.length) {
                const mg = this.draftedMugics[i];
                const dtc = mg.tribe === 'OverWorld' ? '#3498db' : mg.tribe === 'UnderWorld' ? '#e74c3c' : mg.tribe === 'Mipedian' ? '#f39c12' : mg.tribe === 'Danian' ? '#27ae60' : '#9b59b6';
                draftedHtml += `
                    <div onclick="game.removeDraftedMugic(${i})"
                         title="Clique para remover"
                         style="background: rgba(46,204,113,0.15); border: 2px solid #2ecc71; border-radius: 10px;
                                padding: 10px; cursor: pointer; display: flex; flex-direction: column; gap: 5px;
                                transition: background 0.15s;"
                         onmouseover="this.style.background='rgba(231,76,60,0.2)';this.style.borderColor='#e74c3c'"
                         onmouseout="this.style.background='rgba(46,204,113,0.15)';this.style.borderColor='#2ecc71'">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#f1c40f; font-weight:bold; font-size:12px;">${mg.name}</span>
                            <span style="font-size:11px; color:#9b59b6; font-weight:bold;">${mg.cost} ♪</span>
                        </div>
                        <span style="font-size:9px; color:${dtc}; font-weight:bold;">${mg.tribe}</span>
                        <div style="border-top:1px solid rgba(255,255,255,0.1);"></div>
                        <div style="font-size:10px; color:#bdc3c7; line-height:1.4;">${mg.description}</div>
                        <div style="font-size:9px; color:#e74c3c; text-align:center; opacity:0.7;">✕ clique para remover</div>
                    </div>
                `;
            } else {
                draftedHtml += `<div style="border: 2px dashed #7f8c8d; border-radius: 5px; height: 100px; opacity: 0.5;"></div>`;
            }
        }
        draftedContainer.innerHTML = draftedHtml;
        
        counter.innerText = `${this.draftedMugics.length} / 6 Escolhidas`;
        
        if (this.draftedMugics.length === 6) {
            finishBtn.classList.remove('hidden');
            finishBtn.style.display = 'block';
        } else {
            finishBtn.classList.add('hidden');
            finishBtn.style.display = 'none';
        }
    }

    draftMugic(index) {
        if (this.draftedMugics.length >= 6) {
            this.showAlert("🎶 Mão Completa", "Você já escolheu 6 Mugics!");
            return;
        }
        this.draftedMugics.push(this.mugics[index]);
        this.renderMugicDraft();
    }

    removeDraftedMugic(draftIndex) {
        this.draftedMugics.splice(draftIndex, 1);
        this.renderMugicDraft();
    }

    startBattle() {
        this.appState = 'BATTLE';

        // Modo multiplayer: troca de drafts
        if (this.multiplayerMode) {
            const draftScreen = document.getElementById("draft-screen");
            if (draftScreen) draftScreen.classList.add('hidden');
            document.getElementById("battle-screen").classList.remove('hidden');

            this.myDraftReady = true;
            this.sendAction('opponent_draft', {
                draft: {
                    cards: this.draftedCards,
                    battlegears: this.draftedBattlegears,
                    mugics: this.draftedMugics
                }
            });
            this.log('📤 Seu draft foi enviado. Aguardando draft do oponente...');

            if (this.remoteDraft) {
                this._startBattleMultiplayer();
            }
            return; // não continua o fluxo single-player
        }

        const draftScreen = document.getElementById("draft-screen");
        if (draftScreen) draftScreen.classList.add('hidden');
        document.getElementById("battle-screen").classList.remove('hidden');
        
        // Jogador P1 recebe as 6 Mugics draftadas na mão
        this.playerMugics = [];
        if (this.draftedMugics && this.draftedMugics.length === 6) {
            this.playerMugics = JSON.parse(JSON.stringify(this.draftedMugics));
        } else {
            // Fallback caso as mugics não existam (ex: pulou o draft no dev mode)
            if (this.mugics && this.mugics.length > 0) {
                for (let i = 0; i < 6; i++) {
                    const randIndex = Math.floor(Math.random() * this.mugics.length);
                    this.playerMugics.push(JSON.parse(JSON.stringify(this.mugics[randIndex])));
                }
            }
        }
        
        // IA P2 seleciona 6 cartas aleatórias, battlegears e mugics
        let aiCards = [];
        let aiBg = [];
        let aiMugics = [];
        for (let i = 0; i < 6; i++) {
            const randCard = this.cards[Math.floor(Math.random() * this.cards.length)];
            aiCards.push(JSON.parse(JSON.stringify(randCard)));
            if (this.battlegearsData && this.battlegearsData.length > 0) {
                const randBg = this.battlegearsData[Math.floor(Math.random() * this.battlegearsData.length)];
                aiBg.push(JSON.parse(JSON.stringify(randBg)));
            } else {
                aiBg.push(null);
            }
            if (this.mugics && this.mugics.length > 0) {
                const randMg = this.mugics[Math.floor(Math.random() * this.mugics.length)];
                aiMugics.push(JSON.parse(JSON.stringify(randMg)));
            }
        }
        this.p2Mugics = aiMugics;
        
        // Inicializa Decks de Ataque (20 cartas cada)
        if (this.attacksData && this.attacksData.length > 0) {
            for(let i=0; i<20; i++) {
                this.p1AttackDeck.push(this.attacksData[Math.floor(Math.random() * this.attacksData.length)]);
                this.p2AttackDeck.push(this.attacksData[Math.floor(Math.random() * this.attacksData.length)]);
            }
            // Saca 2 cartas iniciais
            this.p1AttackHand.push(this.p1AttackDeck.pop());
            this.p1AttackHand.push(this.p1AttackDeck.pop());
            this.p2AttackHand.push(this.p2AttackDeck.pop());
            this.p2AttackHand.push(this.p2AttackDeck.pop());
        }

        // Inicializa Deck de Locais (10 cartas embaralhadas)
        if (this.locationsData && this.locationsData.length > 0) {
            let availableLocs = [...this.locationsData, ...this.locationsData]; // duplicar pra dar 12 e pegar 10
            for(let i=0; i<10; i++) {
                if(availableLocs.length === 0) break;
                const randIndex = Math.floor(Math.random() * availableLocs.length);
                this.locationDeck.push(availableLocs[randIndex]);
                availableLocs.splice(randIndex, 1);
            }
        }
        
        this.setupBoard(aiCards, aiBg);
        
        // Revela o primeiro local para já estar visível na tela de tabuleiro
        if (this.locationDeck.length > 0) {
            this.activeLocation = this.locationDeck.pop();
            this.log(`📍 Local Inicial Revelado: ${this.activeLocation.name}! (${this.activeLocation.description})`);
            this.showLocationToast(this.activeLocation, false);
        }
        
        this.renderBoard();
        this.renderMugics();
        this.renderLocation();
        this.log("O combate começou! É a sua vez.");
    }
    
    renderMugics() {
        const container = document.getElementById("player-hand");
        if (!container) return;
        
        let html = '';
        this.playerMugics.forEach((mugic, index) => {
            const isSelected = this.selectedMugic === index;
            const selClass = isSelected ? ' selected' : '';
            const tribeColor = (mugic.tribe === 'OverWorld') ? 'var(--overworld)'
                              : (mugic.tribe === 'UnderWorld') ? 'var(--underworld)'
                              : (mugic.tribe === 'Mipedian') ? 'var(--mipedian)'
                              : (mugic.tribe === 'Danian') ? 'var(--danian)'
                              : (mugic.tribe === "M'arrillian") ? 'var(--marrillian)'
                              : 'var(--accent)';

            // montar estilo da arte: usa imagem se disponível, senão fallback para cor da tribo
            const artStyle = mugic.image
                ? `background-image: linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.5)), url('${mugic.image}'); background-size: cover; background-position: center;`
                : `background: linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.45)), ${tribeColor};`;

            html += `
                <div class="mugic-card${selClass}" onclick="game.handleMugicClick(${index})" title="${mugic.name}: ${mugic.description.replace(/"/g,'&quot;')}">
                    <div class="mugic-header">
                        <div class="mugic-name">${mugic.name}</div>
                        <div class="mugic-cost">${mugic.cost} ♪</div>
                    </div>
                    <div class="mugic-art" style="${artStyle}">
                        ${!mugic.image ? `<div style="text-align:center; padding:8px;"><div style="font-weight:800; font-size:18px; color: rgba(255,255,255,0.95);">♪</div></div>` : ''}
                    </div>
                    <div class="mugic-desc">${mugic.description}</div>
                    <div class="mugic-footer">${mugic.type}</div>
                </div>
            `;
        });

        if (this.playerMugics.length === 0) {
            html = '<div style="color: #7f8c8d; padding-top: 50px;">Sem Mugics na mão.</div>';
        }

        container.innerHTML = html;
    }

    handleMugicClick(index) {
        if (this.turn !== 1) return;
        
        if (this.selectedMugic === index) {
            // Deselecionar
            this.selectedMugic = null;
            this.gameState = 'IDLE';
            this.log("Lançamento de Mugic cancelado.");
        } else {
            this.selectedMugic = index;
            this.selectedAttacker = null; // Cancela seleção de ataque normal
            this.gameState = 'SELECT_MUGIC_TARGET';
            this.log(`🎶 Preparando Mugic: ${this.playerMugics[index].name}! Selecione uma criatura alvo no tabuleiro.`);
        }
        this.renderMugics();
        this.renderBoard();
    }
    
    getSynergyBonus(player, r, c) {
        const board = player === 1 ? this.boardP1 : this.boardP2;
        const targetCard = board[r][c];
        if (!targetCard) return null;

        const tribe = targetCard.tribe;
        let allyCount = 0;

        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                if (row === r && col === c) continue;
                const ally = board[row][col];
                if (ally && ally.energy > 0 && ally.tribe === tribe) {
                    allyCount++;
                }
            }
        }

        if (allyCount === 0) return null;

        let bonus = { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0, description: "" };
        switch(tribe) {
            case "OverWorld":
                bonus.courage = allyCount * 5;
                bonus.wisdom = allyCount * 5;
                bonus.description = `+${allyCount * 5} Coragem/Sabedoria (${allyCount} aliados)`;
                break;
            case "UnderWorld":
                bonus.power = allyCount * 10;
                bonus.description = `+${allyCount * 10} Poder (${allyCount} aliados)`;
                break;
            case "Mipedian":
                bonus.speed = allyCount * 10;
                bonus.description = `+${allyCount * 10} Velocidade (${allyCount} aliados)`;
                break;
            case "Danian":
                bonus.energy = allyCount * 5;
                bonus.description = `+${allyCount * 5} Energia Máx (${allyCount} aliados)`;
                break;
        }

        return bonus;
    }

    openLoreTab(tabId) {
        const tabs = document.querySelectorAll('.lore-tab');
        const contents = document.querySelectorAll('.lore-content');
        
        tabs.forEach(t => {
            t.classList.remove('active');
            t.style.borderLeft = '4px solid transparent';
            t.style.color = '#bdc3c7';
            t.style.background = 'transparent';
        });
        contents.forEach(c => c.style.display = 'none');
        
        const activeContent = document.getElementById('lore-content-' + tabId);
        if (activeContent) activeContent.style.display = 'block';
        
        const activeTab = Array.from(tabs).find(t => t.innerText.toLowerCase() === tabId.replace('marrillian', "m'arrillian"));
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.style.borderLeft = '4px solid #2980b9';
            activeTab.style.color = 'white';
            activeTab.style.background = '#34495e';
        }
    }

    resolveMugic(player, r, c) {
        const board = player === 1 ? this.boardP1 : this.boardP2;
        const target = board[r][c];
        
        if (!target) {
            this.log("⚠️ Alvo inválido para Mugic! (Você clicou num espaço vazio).");
            return;
        }
        
        const mugic = this.playerMugics[this.selectedMugic];
        
        this.log(`🎵 Você conjurou ${mugic.name} sobre ${target.name}!`);
        
        if (mugic.effectType === "damage") {
            target.energy -= mugic.effectValue;
            this.log(`💥 Causa ${mugic.effectValue} de dano! Energia de ${target.name} caiu para ${target.energy}.`);
            if (target.energy <= 0) {
                this.log(`💀 ${target.name} foi destruído pelo Mugic!`);
                this._discardCreature(target);
                board[r][c] = null;
                this.renderBoard();
                this.checkWinCondition();
            }
        } else if (mugic.effectType === "reduce_elemental_damage") {
            // Aplica redução de dano elemental temporária na criatura alvo até o fim do turno
            if (!target._elementalReductions) target._elementalReductions = [];
            const amount = mugic.effectValue || 0;
            const elements = mugic.effectElements || [];
            target._elementalReductions.push({ elements, amount, expiresOnTurn: this.turn });
            this.log(`🔰 ${target.name} afetado por ${mugic.name}: -${amount} dano de ${elements.join('/')} até o fim do turno.`);
        } else if (mugic.effectType === "heal") {
            target.energy = Math.min(target.maxEnergy, target.energy + mugic.effectValue);
            this.log(`✨ ${target.name} foi curado em ${mugic.effectValue} pontos de vida!`);
        } else if (mugic.effectType === "buff") {
            target.courage += mugic.effectValue;
            target.power += mugic.effectValue;
            target.wisdom += mugic.effectValue;
            target.speed += mugic.effectValue;
            target.maxEnergy += mugic.effectValue;
            target.energy += mugic.effectValue;
            this.log(`💪 ${target.name} ficou colossal! Ganhou +${mugic.effectValue} em tudo!`);
        }
        
        // Remove Mugic da mão → discard pile
        this._discardMugic(1, this.playerMugics, this.selectedMugic);

        this.selectedMugic = null;
        this.gameState = 'IDLE';
        
        this.renderBoard();
        this.renderMugics();
    }
    
    cloneCard(baseCard) {
        let cloned = JSON.parse(JSON.stringify(baseCard));
        cloned.maxEnergy = cloned.energy; // Guarda a vida máxima
        cloned.baseCourage = cloned.courage;
        cloned.basePower = cloned.power;
        cloned.baseWisdom = cloned.wisdom;
        cloned.baseSpeed = cloned.speed;
        cloned.baseEnergy = cloned.energy;
        return cloned;
    }

    setupBoard(aiCards, aiBg) {
        // Posicionamento: [[2,0], [1,0], [1,1], [0,0], [0,1], [0,2]] (Retaguarda, Meio, Frente)
        const p1Formation = [
            {r: 2, c: 0}, 
            {r: 1, c: 0}, {r: 1, c: 1}, 
            {r: 0, c: 0}, {r: 0, c: 1}, {r: 0, c: 2}
        ];
        const p2Formation = [
            {r: 2, c: 0}, 
            {r: 1, c: 0}, {r: 1, c: 1}, 
            {r: 0, c: 0}, {r: 0, c: 1}, {r: 0, c: 2}
        ];

        let p1Index = 0;
        p1Formation.forEach(pos => {
            if (p1Index < this.draftedCards.length) {
                const card = JSON.parse(JSON.stringify(this.draftedCards[p1Index]));
                card.player = 1;
                card.maxEnergy = card.energy;
                if (card.mugicCounters === undefined) card.mugicCounters = 0;
                if (this.draftedBattlegears && this.draftedBattlegears[p1Index]) {
                    card.battlegear = JSON.parse(JSON.stringify(this.draftedBattlegears[p1Index]));
                    card.bgRevealed = !!card.battlegear.faceUp;
                    if (card.bgRevealed) this._revealBattlegear(card);
                }
                this.boardP1[pos.r][pos.c] = card;
                p1Index++;
            }
        });

        let p2Index = 0;
        p2Formation.forEach(pos => {
            if (p2Index < aiCards.length) {
                const card = JSON.parse(JSON.stringify(aiCards[p2Index]));
                card.player = 2;
                card.maxEnergy = card.energy;
                if (card.mugicCounters === undefined) card.mugicCounters = 0;
                if (aiBg && aiBg[p2Index]) {
                    card.battlegear = JSON.parse(JSON.stringify(aiBg[p2Index]));
                    card.bgRevealed = !!card.battlegear.faceUp;
                    if (card.bgRevealed) this._revealBattlegear(card);
                }
                this.boardP2[pos.r][pos.c] = card;
                p2Index++;
            }
        });
    }

    log(message) {
        console.log(message);

        // ── Log box (histórico lateral) ──────────────────────────────────────
        if (this.logElement) {
            this.logElement.innerHTML = `<div>${message}</div>` + this.logElement.innerHTML;
        }

        // ── Battle Feed animado ──────────────────────────────────────────────
        // Classifica a mensagem por categoria para colorir
        const cat = this._feedCategory(message);
        if (cat) {
            this._feedQueue = this._feedQueue || [];
            this._feedQueue.push({ message, cat });
            if (!this._feedBusy) this._processFeedQueue();
        }
    }

    _feedCategory(msg) {
        // Mensagens ignoradas (muito técnicas / ruído)
        if (/^(Chaotic Lite Engine|Draft|📤|📦|Modo Mult|⏳|🟢|❌ Opon)/.test(msg)) return null;
        if (/scrollTop|innerHTML/.test(msg)) return null;

        // Morte
        if (/💀/.test(msg))                                           return 'death';
        // Dano
        if (/💥/.test(msg))                                           return 'damage';
        // Cura
        if (/💚|curou/.test(msg))                                     return 'heal';
        // Mugic cast / negar
        if (/🎶|🪄|🚫.*Iron|❌.*negou|🔔 BURST|✨ Efeito Mágico/.test(msg)) return 'mugic';
        // Bloqueio / negar
        if (/🚫/.test(msg))                                           return 'block';
        // Local
        if (/📍/.test(msg))                                           return 'location';
        // Combate início / turno
        if (/⚔️ COMBATE|🎯|Próximo turno|ataca primeiro/.test(msg))   return 'combat';
        // Stat checks
        if (/📊|Challenge|Stat Check/.test(msg))                      return 'stat';
        // Revelações, battlegear, passivas
        if (/🔮|✅|🌋|🌊|💢|🛡️|⚡.*Strike|💨.*Swift|😰.*Intimidate|🔇|📉/.test(msg)) return 'info';

        return null; // ignora o resto
    }

    _processFeedQueue() {
        if (!this._feedQueue || this._feedQueue.length === 0) {
            this._feedBusy = false;
            return;
        }
        this._feedBusy = true;

        // Pega até 2 mensagens de uma vez
        const batch = this._feedQueue.splice(0, 2);

        // Tempo de permanência: usa o maior da leva
        const stayMap = {
            death: 5500, damage: 4500, mugic: 5000, location: 5000,
            combat: 4500, block: 4500, heal: 4200, stat: 3200, info: 3500,
        };
        const maxStay = Math.max(...batch.map(({ cat }) => stayMap[cat] || 3800));

        // Mostra as 3 com pequeno escalonamento visual (150ms entre cada)
        batch.forEach(({ message, cat }, i) => {
            setTimeout(() => this._showFeedEntry(message, cat, maxStay), i * 150);
        });

        // Próxima leva depois que esta sair (stay + saída + pausa)
        setTimeout(() => this._processFeedQueue(), maxStay + 700);
    }

    _showFeedEntry(message, cat, stay = 4500) {
        const feed = document.getElementById('battle-feed');
        if (!feed) return;

        const el = document.createElement('div');
        el.className = `feed-entry feed-${cat}`;
        el.textContent = message.length > 100 ? message.slice(0, 98) + '…' : message;
        feed.prepend(el);

        // Inicia saída após o tempo de permanência
        setTimeout(() => {
            el.classList.add('feed-exit');
            setTimeout(() => el.remove(), 500);
        }, stay);
    }

    isExposed(player, r, c) {
        const board = player === 1 ? this.boardP1 : this.boardP2;
        
        // Linha de frente (0) sempre está exposta
        if (r === 0) return true;
        
        // Linha do meio (1)
        if (r === 1) {
            if (c === 0) {
                // Protegido se 0,0 ou 0,1 estiverem vivos
                if (board[0][0] || board[0][1]) return false;
            } else if (c === 1) {
                // Protegido se 0,1 ou 0,2 estiverem vivos
                if (board[0][1] || board[0][2]) return false;
            }
        }
        
        // Retaguarda (2)
        if (r === 2) {
            // Protegido se 1,0 ou 1,1 estiverem vivos
            if (board[1][0] || board[1][1]) return false;
        }
        
        return true;
    }

    isValidMove(fromR, fromC, toR, toC) {
        // Mapeamento de vizinhos adjacentes na Pirâmide Invertida
        const adjacencyList = {
            "0,0": ["1,0"], // Frente Esquerda conecta com Meio Esquerda
            "0,1": ["1,0", "1,1"], // Frente Centro conecta com ambos do Meio
            "0,2": ["1,1"], // Frente Direita conecta com Meio Direita
            "1,0": ["0,0", "0,1", "2,0"], // Meio Esq
            "1,1": ["0,1", "0,2", "2,0"], // Meio Dir
            "2,0": ["1,0", "1,1"] // Retaguarda
        };
        
        const neighbors = adjacencyList[`${fromR},${fromC}`] || [];
        return neighbors.includes(`${toR},${toC}`);
    }

    handleCardClick(player, r, c) {
        // Em multiplayer, verifica se é o turno deste jogador
        if (!this.isMyTurn()) return;
        const myPlayer = this.multiplayerMode ? this.myPlayerNumber : 1;

        if (this.gameState === 'SELECT_MUGIC_CASTER') {
            if (player === myPlayer && (myPlayer === 1 ? this.boardP1[r][c] : this.boardP2[r][c])) {
                this.resolveMugicCaster(r, c);
            } else {
                this.log("⚠️ Selecione uma de SUAS criaturas para pagar o custo do Mugic.");
            }
            return;
        }

        if (this.gameState === 'SELECT_MUGIC_TARGET') {
            this.resolveMugic(player, r, c);
            return;
        }

        const clickedBoard = player === 1 ? this.boardP1 : this.boardP2;
        const clickedCard = clickedBoard[r][c];

        // --- Clique em slot vazio (Movimento) ---
        if (!clickedCard) {
            if (this.gameState === 'SELECT_TARGET' && player === myPlayer && this.selectedAttacker) {
                if (this.isValidMove(this.selectedAttacker.r, this.selectedAttacker.c, r, c)) {
                    this.resolveMove(myPlayer, this.selectedAttacker.r, this.selectedAttacker.c, r, c);
                } else {
                    this.log("⚠️ Movimento inválido! Só é possível andar para espaços vazios adjacentes.");
                }
            }
            return;
        }

        const exposed = this.isExposed(player, r, c);

        if (this.gameState === 'IDLE' && player === myPlayer) {
            if (!exposed) {
                this.log(`⚠️ ${clickedCard.name} está bloqueado por aliados e não pode atacar!`);
                return;
            }
            // Selecionar criatura atacante
            this.selectedAttacker = { player, r, c };
            this.gameState = 'SELECT_TARGET';
            this.log(`🎯 Você escolheu atacar com ${clickedCard.name}. Selecione o alvo!`);
            this.renderBoard();
        }
        else if (this.gameState === 'SELECT_TARGET') {
            if (player === myPlayer) {
                if (!exposed && !(this.selectedAttacker.r === r && this.selectedAttacker.c === c)) {
                    this.log(`⚠️ ${clickedCard.name} está bloqueado e não pode ser o novo atacante!`);
                    return;
                }
                // Clicar novamente nas próprias criaturas troca o atacante ou cancela
                if (this.selectedAttacker.r === r && this.selectedAttacker.c === c) {
                    this.selectedAttacker = null;
                    this.gameState = 'IDLE';
                    this.log("Ataque cancelado.");
                } else {
                    this.selectedAttacker = { player, r, c };
                    this.log(`🎯 Você mudou o atacante para ${clickedCard.name}. Selecione o alvo!`);
                }
                this.renderBoard();
            }
            else if (player !== myPlayer) {
                const myBoard  = myPlayer === 1 ? this.boardP1 : this.boardP2;
                const attacker = myBoard[this.selectedAttacker.r][this.selectedAttacker.c];
                const hasRange = !!(attacker && attacker._hasRange);

                // ── Regra de Range ─────────────────────────────────────────
                // Sem Range: só pode atacar criaturas expostas
                if (!exposed && !hasRange) {
                    this.log(`🛡️ ${clickedCard.name} está protegida! ${hasRange ? '' : 'Use uma criatura com Range para atacar posições protegidas.'}`);
                    return;
                }

                // ── Regra de Invisibility ──────────────────────────────────
                // Criaturas invisíveis não podem ser escolhidas como alvo
                if (clickedCard._invisibility) {
                    this.log(`👻 ${clickedCard.name} está invisível e não pode ser alvo de ataques!`);
                    return;
                }

                this.sendAction('startCombat', {
                    atkR: this.selectedAttacker.r, atkC: this.selectedAttacker.c,
                    defR: r, defC: c,
                    initiatingPlayer: myPlayer
                });
                this.startCombat(attacker, clickedCard, this.selectedAttacker.r, this.selectedAttacker.c, r, c, myPlayer, true);
            }
        }
    }

    startCombat(attacker, defender, atkR, atkC, defR, defC, initiatingPlayer, fromRemote = false) {
        this.gameState = 'ENGAGED_COMBAT';
        
        // O local já foi revelado na startBattle ou no fim do último combate.
        // Apenas informa no log em qual local a batalha vai acontecer:
        if (this.activeLocation) {
            this.log(`📍 Iniciando combate no local: ${this.activeLocation.name}!`);
        }
        
        // Revelar Equipamentos se ainda não foram revelados
        this._revealBattlegear(attacker);
        this._revealBattlegear(defender);
        // Efeitos de combatStart dos battlegears
        this._applyBattlegearCombatStart(attacker);
        this._applyBattlegearCombatStart(defender);
        
        // Iniciativa baseada no Local Ativo (ou Speed padrão se não houver local)
        let initStat = "speed";
        if (this.activeLocation && this.activeLocation.initiative) {
            initStat = this.activeLocation.initiative.toLowerCase();
        }

        const atkBaseInit = attacker[initStat] || 0;
        const defBaseInit = defender[initStat] || 0;
        
        const atkBonus = this.getSynergyBonus(initiatingPlayer, atkR, atkC) || {};
        const defBonus = this.getSynergyBonus(initiatingPlayer === 1 ? 2 : 1, defR, defC) || {};
        
        const locMod = this.activeLocation && this.activeLocation.modifiers ? this.activeLocation.modifiers : {};
        
        const atkVal = atkBaseInit + (atkBonus[initStat] || 0) + (locMod[initStat] || 0);
        const defVal = defBaseInit + (defBonus[initStat] || 0) + (locMod[initStat] || 0);
        
        let firstStriker = initiatingPlayer;
        if (defVal > atkVal) {
            firstStriker = initiatingPlayer === 1 ? 2 : 1;
        }

        this.activeCombat = {
            p1Card: initiatingPlayer === 1 ? attacker : defender,
            p2Card: initiatingPlayer === 1 ? defender : attacker,
            p1R: initiatingPlayer === 1 ? atkR : defR,
            p1C: initiatingPlayer === 1 ? atkC : defC,
            p2R: initiatingPlayer === 1 ? defR : atkR,
            p2C: initiatingPlayer === 1 ? defC : atkC,
            currentStriker: firstStriker,
            isFirstAttack: true,
            initiatingPlayer: initiatingPlayer,
            rounds: 0,
            attackHistory: [],
            damageHistory: [],
            mugicHistory: [],   // { player, mugicName, targetName }
            healHistory: [],    // { targetName, amount, source }
            winner: null
        };

        // Aplicar passivas de início de combate
        const c1 = this.activeCombat.p1Card;
        const c2 = this.activeCombat.p2Card;
        this.applyPassives('combatStart', c1, c2);
        this.applyPassives('combatStart', c2, c1);

        // Aplicar efeitos de início de combate do Local
        this._applyLocationCombatStartEffect();
        this.log(`⚔️ COMBATE INICIADO! Iniciativa: Jogador ${firstStriker} ataca primeiro (${initStat.toUpperCase()}).`);
        this.renderBoard();
        this._showInitiativeBanner(firstStriker, initStat);
        setTimeout(() => this.processCombatTurn(), 2600);
    }

    _applyLocationCombatStartEffect() {
        if (!this.activeLocation || !this.activeLocation.effect) return;
        const ef = this.activeLocation.effect;
        const loc = this.activeLocation.name;
        if (!this.activeCombat) return;
        const c1 = this.activeCombat.p1Card;
        const c2 = this.activeCombat.p2Card;

        switch (ef.type) {
            case "combat_start_energy":
                [c1, c2].forEach(c => {
                    c.energy = Math.min(c.maxEnergy, c.energy + ef.value);
                });
                this.log(`📍 [${loc}] Ambas as criaturas ganharam ${ef.value} de Energia!`);
                break;

            case "combat_start_damage":
                [c1, c2].forEach(c => { c.energy -= ef.value; });
                this.log(`📍 [${loc}] Ambas as criaturas sofreram ${ef.value} de dano!`);
                break;

            case "combat_start_element_energy":
                [c1, c2].forEach(c => {
                    if ((c.elements||[]).includes(ef.element)) {
                        c.energy = Math.min(c.maxEnergy, c.energy + ef.value);
                        this.log(`📍 [${loc}] ${c.name} (${ef.element}) ganhou ${ef.value} de Energia!`);
                    }
                });
                break;

            case "combat_start_damage_lower_courage":
                [c1, c2].forEach((c, i) => {
                    const opp = i === 0 ? c2 : c1;
                    if (c.courage < opp.courage) {
                        c.energy -= ef.value;
                        this.log(`📍 [${loc}] ${c.name} tem menos Courage — perdeu ${ef.value} de Energia!`);
                    }
                });
                break;

            case "combat_start_energy_higher_power":
                [c1, c2].forEach((c, i) => {
                    const opp = i === 0 ? c2 : c1;
                    if (c.power > opp.power) {
                        c.energy = Math.min(c.maxEnergy, c.energy + ef.value);
                        this.log(`📍 [${loc}] ${c.name} tem mais Power — ganhou ${ef.value} de Energia!`);
                    }
                });
                break;

            case "combat_start_mugic_counter_higher_wisdom":
                [c1, c2].forEach((c, i) => {
                    const opp = i === 0 ? c2 : c1;
                    if (c.wisdom > opp.wisdom) {
                        c.mugicCounters = (c.mugicCounters || 0) + 1;
                        this.log(`📍 [${loc}] ${c.name} tem mais Wisdom — ganhou 1 contador Mugic!`);
                    }
                });
                break;

            case "combat_start_mugic_counter_tribe":
                [c1, c2].forEach(c => {
                    if (c.tribe === ef.tribe) {
                        c.mugicCounters = (c.mugicCounters || 0) + 1;
                        this.log(`📍 [${loc}] ${c.name} (${ef.tribe}) ganhou 1 contador Mugic!`);
                    }
                });
                break;

            case "combat_start_grant_all_elements":
                [c1, c2].forEach(c => {
                    ['Fire','Water','Earth','Air'].forEach(el => {
                        if (!c.elements) c.elements = [];
                        if (!c.elements.includes(el)) c.elements.push(el);
                    });
                    this.log(`📍 [${loc}] ${c.name} ganhou todos os elementos!`);
                });
                break;

            case "combat_start_peek_if_air":
                [c1, c2].forEach((c, i) => {
                    if ((c.elements||[]).includes('Air')) {
                        const deck = i === 0 ? this.p1AttackDeck : this.p2AttackDeck;
                        const top = deck.slice(-3).reverse().map(a => a.name).join(', ');
                        this.log(`📍 [${loc}] ${c.name} tem Ar — topo do deck: [${top || 'vazio'}]`);
                    }
                });
                break;

            case "tribe_energy_bonus":
                [c1, c2].forEach(c => {
                    if (c.tribe === ef.tribe) {
                        c.maxEnergy = (c.maxEnergy || c.energy) + ef.value;
                        c.energy += ef.value;
                        this.log(`📍 [${loc}] ${c.name} (${ef.tribe}) ganhou +${ef.value} de Energia máxima!`);
                    }
                });
                break;

            case "gothos_tower_special":
                [c1, c2].forEach(c => {
                    if (c.name !== 'Lord Van Bloot') {
                        c.courage = Math.max(0, c.courage - 10);
                        this.log(`📍 [${loc}] ${c.name} perdeu 10 de Courage!`);
                    } else {
                        c._invisibility = { strikeBonus: 15 };
                        this.log(`📍 [${loc}] Lord Van Bloot ganhou Invisibility: Strike 15!`);
                    }
                });
                break;

            case "on_enter_activate_hive":
                [this.boardP1, this.boardP2].forEach(board => {
                    board.forEach(row => row.forEach(c => {
                        if (c && c.tribe === 'Danian') {
                            c.courage += 5; c.power += 5; c.wisdom += 5; c.speed += 5;
                            this.log(`📍 [${loc}] Hive! ${c.name} ganhou +5 em todos os stats!`);
                        }
                    }));
                });
                break;

            case "on_enter_discard_mugic":
                // Descarta a última mugic de cada jogador no discard pile
                if (this.playerMugics && this.playerMugics.length > 0)
                    this._discardMugic(1, this.playerMugics, this.playerMugics.length - 1);
                if (this.p2Mugics && this.p2Mugics.length > 0)
                    this._discardMugic(2, this.p2Mugics, this.p2Mugics.length - 1);
                break;

            // Efeitos passivos (sem ação no início — aplicados durante o combate)
            case "elemental_modifiers":
            case "first_attack_tribe_bonus":
            case "first_attack_element_bonus":
            case "first_attack_zero_if_lower_speed":
            case "heal_on_water_attack":
            case "no_mugic":
            case "no_tribal_mugic":
            case "no_battlegear_abilities":
            case "extra_mugic_cost_tribe":
            case "mugic_discount_tribe_first":
            case "mugic_untargetable":
            case "underworld_city_bonus":
            case "combat_start_return_mugic":
                // Esses são passivos — logados ao iniciar o combate
                this.log(`📍 [${loc}] Efeito ativo: ${this.activeLocation.description}`);
                break;
        }
    }

    // ── Prévia de combate ao selecionar atacante ─────────────────────────────
    // Retorna { verdict, label, initiative, myDmg, theirDmg, color, border }
    _getCombatPreview(attacker, atkR, atkC, atkPlayer, defender, defR, defC) {
        const defPlayer = atkPlayer === 1 ? 2 : 1;
        const atkSyn  = this.getSynergyBonus(atkPlayer, atkR, atkC)  || {};
        const defSyn  = this.getSynergyBonus(defPlayer, defR, defC)  || {};
        const locMod  = (this.activeLocation && this.activeLocation.modifiers) || {};
        const atkBgM  = (attacker.bgRevealed && attacker.battlegear && attacker.battlegear.modifiers) || {};
        const defBgM  = (defender.bgRevealed && defender.battlegear && defender.battlegear.modifiers) || {};

        const eff = (c, syn, bgM) => ({
            courage: c.courage + (syn.courage||0) + (locMod.courage||0) + (bgM.courage||0),
            power:   c.power   + (syn.power  ||0) + (locMod.power  ||0) + (bgM.power  ||0),
            wisdom:  c.wisdom  + (syn.wisdom ||0) + (locMod.wisdom ||0) + (bgM.wisdom ||0),
            speed:   c.speed   + (syn.speed  ||0) + (locMod.speed  ||0) + (bgM.speed  ||0),
        });

        const ea = eff(attacker, atkSyn, atkBgM);
        const ed = eff(defender, defSyn, defBgM);

        // Swift bonus na iniciativa
        const atkSwift = (attacker.passives||[]).reduce((s,p) => p.id==='swift' ? s+(p.value||10) : s, 0);
        const defSwift = (defender.passives||[]).reduce((s,p) => p.id==='swift' ? s+(p.value||10) : s, 0);
        const atkSpd   = ea.speed + atkSwift;
        const defSpd   = ed.speed + defSwift;

        // Quem inicia (speed como tie-breaker principal)
        let initStat = 'speed';
        let iGoFirst = atkSpd >= defSpd;

        // Intimidate: atacante reduz stat do defensor
        const intimidateAdj = {};
        (attacker.passives||[]).forEach(p => {
            if (p.id === 'intimidate') {
                const s = p.stat || 'courage';
                intimidateAdj[s] = (intimidateAdj[s]||0) + (p.value||10);
            }
        });
        Object.entries(intimidateAdj).forEach(([s,v]) => { ed[s] = Math.max(0, ed[s] - v); });

        // Estimativa de dano: usa a melhor carta da mão ou média do baralho
        const estimateBestDamage = (hand, deck, effA, effD) => {
            const pool = [...(hand||[]), ...(deck||[])].slice(0, 8);
            if (pool.length === 0) return 5; // fallback
            let best = 0;
            pool.forEach(atk => {
                let dmg = atk.baseDamage || 0;
                if (atk.statRequirement) {
                    const av = effA[atk.statRequirement.toLowerCase()] || 0;
                    const dv = effD[atk.statRequirement.toLowerCase()] || 0;
                    const met = atk.statMode === 'challenge' ? (av - dv) >= (atk.statThreshold||0) : av >= (atk.statThreshold||0);
                    if (met) dmg += atk.statDamage || 0;
                }
                if (atk.elementRequirement && (attacker.elements||[]).includes(atk.elementRequirement)) {
                    dmg += atk.elementDamage || 0;
                }
                if (dmg > best) best = dmg;
            });
            return best;
        };

        const myHand   = atkPlayer === 1 ? this.p1AttackHand : this.p2AttackHand;
        const myDeck   = atkPlayer === 1 ? this.p1AttackDeck : this.p2AttackDeck;
        const thHand   = atkPlayer === 1 ? this.p2AttackHand : this.p1AttackHand;
        const thDeck   = atkPlayer === 1 ? this.p2AttackDeck : this.p1AttackDeck;

        const myDmg   = estimateBestDamage(myHand, myDeck, ea, ed);
        const theirDmg = estimateBestDamage(thHand, thDeck, ed, ea);

        // Rounds estimados para cada lado derrotar o outro
        const myRounds    = myDmg   > 0 ? Math.ceil(defender.energy / myDmg)   : 99;
        const theirRounds = theirDmg > 0 ? Math.ceil(attacker.energy / theirDmg) : 99;

        // Veredito
        let verdict, color, border, emoji;
        const advantage = myRounds < theirRounds || (myRounds === theirRounds && iGoFirst);
        const close     = Math.abs(myRounds - theirRounds) <= 1;

        if (myRounds <= 2 && myRounds < theirRounds - 1) {
            verdict = 'VANTAGEM FORTE'; color = '#22c55e'; border = '#16a34a'; emoji = '💪';
        } else if (advantage && !close) {
            verdict = 'VANTAGEM';       color = '#86efac'; border = '#22c55e'; emoji = '✅';
        } else if (close) {
            verdict = 'EQUILIBRADO';    color = '#fbbf24'; border = '#d97706'; emoji = '⚖️';
        } else {
            verdict = 'DESVANTAGEM';    color = '#f87171'; border = '#dc2626'; emoji = '⚠️';
        }

        const initLabel = iGoFirst ? '⚡ Você inicia' : '⚡ Inimigo inicia';

        return { verdict, color, border, emoji, myDmg, theirDmg, myRounds, theirRounds, initLabel };
    }

    // ── Visualizador de Descarte ─────────────────────────────────────────────
    openDiscardViewer() {
        const modal = document.getElementById('discard-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('flex-modal');
        this._discardTab('crit1');
    }

    _discardTab(tab) {
        // Atualiza tabs
        ['crit1','crit2','mug1','mug2'].forEach(t => {
            const el = document.getElementById(`dtab-${t}`);
            if (el) el.className = 'dtab' + (t === tab ? ' dtab-active' : '');
        });

        const content = document.getElementById('discard-content');
        if (!content) return;

        const tribeColor = { OverWorld:'#0ea5e9', UnderWorld:'#dc2626', Mipedian:'#d97706', Danian:'#9333ea', Generic:'#6b7280' };
        const rarityIcon = { 'Ultra Rare':'💎', 'Super Rare':'🔷', 'Rare':'🔶', 'Uncommon':'🔹', 'Common':'⚪' };

        if (tab === 'crit1' || tab === 'crit2') {
            const pile = tab === 'crit1' ? (this.p1CreatureDiscard || []) : (this.p2CreatureDiscard || []);
            const label = tab === 'crit1' ? 'Suas criaturas derrotadas' : 'Criaturas da IA derrotadas';
            if (pile.length === 0) {
                content.innerHTML = `<div style="text-align:center;color:#64748b;padding:40px;">Nenhuma criatura no descarte ainda.</div>`;
                return;
            }
            content.innerHTML = `
                <div style="font-size:11px;color:#64748b;margin-bottom:10px;text-align:center;">${label} — ${pile.length} criatura(s)</div>
                <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
                    ${pile.map(c => {
                        const tc = tribeColor[c.tribe] || '#6b7280';
                        const ri = rarityIcon[c.rarity] || '⚪';
                        const elIcons = (c.elements||[]).map(e => ({Fire:'🔥',Water:'💧',Earth:'🪨',Air:'🌪️'}[e]||'✨')).join('');
                        return `<div style="background:#1e293b;border:1px solid ${tc};border-radius:10px;padding:10px 12px;width:140px;text-align:center;">
                            <div style="font-size:10px;color:${tc};font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">${c.tribe}</div>
                            <div style="font-weight:bold;color:#f1c40f;margin:4px 0;font-size:13px;">${ri} ${c.name}</div>
                            ${c.image ? `<img src="${c.image}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin:4px 0;opacity:0.7;filter:grayscale(60%);">` : ''}
                            <div style="font-size:10px;color:#94a3b8;margin-top:4px;">
                                ⚔️${c.courage} 💪${c.power} 🧠${c.wisdom} ⚡${c.speed}
                            </div>
                            <div style="font-size:11px;color:#dc2626;font-weight:bold;">❤️ ${c.maxEnergy || c.energy}</div>
                            ${elIcons ? `<div style="font-size:14px;margin-top:3px;">${elIcons}</div>` : ''}
                        </div>`;
                    }).join('')}
                </div>`;
        } else {
            const pile = tab === 'mug1' ? (this.p1MugicDiscard || []) : (this.p2MugicDiscard || []);
            const label = tab === 'mug1' ? 'Suas Mugics usadas' : 'Mugics da IA usadas';
            if (pile.length === 0) {
                content.innerHTML = `<div style="text-align:center;color:#64748b;padding:40px;">Nenhuma Mugic no descarte ainda.</div>`;
                return;
            }
            content.innerHTML = `
                <div style="font-size:11px;color:#64748b;margin-bottom:10px;text-align:center;">${label} — ${pile.length} Mugic(s)</div>
                <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
                    ${pile.map(mg => {
                        const tc = tribeColor[mg.tribe] || '#6b7280';
                        const ri = rarityIcon[mg.rarity] || '⚪';
                        return `<div style="background:#1e293b;border:1px solid ${tc};border-radius:10px;padding:10px 12px;width:160px;text-align:center;">
                            <div style="font-size:10px;color:${tc};font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">${mg.tribe}</div>
                            <div style="font-weight:bold;color:#c084fc;margin:4px 0;font-size:13px;">${ri} ${mg.name}</div>
                            <div style="font-size:10px;color:#f59e0b;">Custo: ${mg.cost} ♪</div>
                            <div style="font-size:10px;color:#94a3b8;margin-top:5px;line-height:1.4;">${mg.description}</div>
                        </div>`;
                    }).join('')}
                </div>`;
        }
    }

    // ── Banner do Local Ativo no modal de ataque ─────────────────────────────
    _buildLocationBannerHtml(attacker, defender) {
        const loc = this.activeLocation;
        if (!loc) return '';

        const ef = loc.effect;
        const elemIcons = { Fire:'🔥', Water:'💧', Earth:'🪨', Air:'🌪️' };
        const lines = [];

        if (ef) {
            switch (ef.type) {
                case 'elemental_modifiers': {
                    const atkEls = attacker.elements || [];
                    const defEls = defender.elements  || [];
                    Object.entries(ef.bonuses || {}).forEach(([el, val]) => {
                        const icon = elemIcons[el] || '✨';
                        const hasIt = atkEls.includes(el);
                        lines.push({ ok: hasIt, text: `${icon} ${el}: +${val} dano (você ${hasIt ? '✅ tem' : '❌ não tem'})` });
                    });
                    Object.entries(ef.penalties || {}).forEach(([el, val]) => {
                        const icon = elemIcons[el] || '✨';
                        lines.push({ ok: null, text: `${icon} ${el}: −${val} dano (penalidade)` });
                    });
                    break;
                }
                case 'first_attack_tribe_bonus':
                    if (this.activeCombat && this.activeCombat.isFirstAttack) {
                        const hasIt = attacker.tribe === ef.tribe;
                        lines.push({ ok: hasIt, text: `🏆 Primeiro ataque ${ef.tribe}: +${ef.value} dano (você ${hasIt ? '✅' : '❌'})` });
                    }
                    break;
                case 'first_attack_element_bonus':
                    if (this.activeCombat && this.activeCombat.isFirstAttack) {
                        const hasIt = (attacker.elements||[]).includes(ef.element);
                        lines.push({ ok: hasIt, text: `${elemIcons[ef.element]||'✨'} Primeiro ataque com ${ef.element}: +${ef.value} dano (você ${hasIt ? '✅' : '❌'})` });
                    }
                    break;
                case 'first_attack_zero_if_lower_speed':
                    if (this.activeCombat && this.activeCombat.isFirstAttack) {
                        lines.push({ ok: null, text: `⚡ Primeiro ataque: 0 dano se sua Speed for menor que a do defensor` });
                    }
                    break;
                case 'heal_on_water_attack': {
                    const hasW = (attacker.elements||[]).includes('Water');
                    lines.push({ ok: hasW, text: `💧 Ataque de Água: cura ${ef.value} do atacante (você ${hasW ? '✅ tem Água' : '❌ sem Água'})` });
                    break;
                }
                case 'no_mugic':
                    lines.push({ ok: false, text: `🚫 Mugics bloqueadas neste local!` });
                    break;
                case 'no_tribal_mugic':
                    lines.push({ ok: null, text: `⚠️ Apenas Mugics Genéricas permitidas` });
                    break;
                case 'extra_mugic_cost_tribe':
                    lines.push({ ok: null, text: `♪ Mugics ${ef.tribe} custam +${ef.value} contador extra` });
                    break;
                case 'underworld_city_bonus': {
                    const isUW = attacker.tribe === 'UnderWorld';
                    lines.push({ ok: isUW, text: `🏙️ UnderWorld com Power 15+ maior: +5 dano (você ${isUW ? '✅' : '❌'})` });
                    break;
                }
                default:
                    lines.push({ ok: null, text: `✨ ${loc.description}` });
            }
        }

        if (lines.length === 0) {
            lines.push({ ok: null, text: loc.description });
        }

        const linesHtml = lines.map(l => {
            const col = l.ok === true ? '#2ecc71' : l.ok === false ? '#e74c3c' : '#f39c12';
            return `<span style="color:${col}; font-size:11px;">${l.text}</span>`;
        }).join('<br>');

        return `
            <div id="loc-banner-attack" style="
                margin-top: 14px;
                background: rgba(7,89,133,0.25);
                border: 1px solid #38bdf8;
                border-radius: 10px;
                padding: 10px 16px;
                text-align: center;
                max-width: 500px;
                width: 100%;
            ">
                <div style="font-size:11px; color:#38bdf8; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px;">
                    📍 Local: <strong>${loc.name}</strong>
                </div>
                <div style="display:flex; flex-direction:column; gap:3px; align-items:center;">
                    ${linesHtml}
                </div>
            </div>`;
    }

    // ── Animação de morte com sangue ──────────────────────────────────────────
    _spawnBloodDrops(cardEl) {
        if (!cardEl) return;

        // Garante position:relative no card para os filhos ficarem relativos a ele
        cardEl.style.overflow = 'visible';

        // Poça de sangue no fundo
        const pool = document.createElement('div');
        pool.className = 'blood-pool';
        cardEl.appendChild(pool);

        // 10 gotículas em direções aleatórias
        const dropCount = 10;
        for (let i = 0; i < dropCount; i++) {
            const drop = document.createElement('div');
            drop.className = 'blood-drop';

            // Tamanho aleatório (6px - 18px)
            const size = 6 + Math.random() * 12;
            drop.style.width  = size + 'px';
            drop.style.height = size * 1.3 + 'px';

            // Posição de origem: centro do card (com variação)
            drop.style.left = (30 + Math.random() * 40) + '%';
            drop.style.top  = (20 + Math.random() * 40) + '%';

            // Vetor de voo: espalhado em todas as direções, mais para baixo (gravidade)
            const angle  = (Math.random() * 360) * (Math.PI / 180);
            const dist   = 40 + Math.random() * 80;
            const dx     = Math.cos(angle) * dist;
            const dy     = Math.sin(angle) * dist + 30; // +30 de gravidade
            const rot    = (-180 + Math.random() * 360) + 'deg';
            const dur    = (0.55 + Math.random() * 0.5).toFixed(2) + 's';
            const delay  = (Math.random() * 0.18).toFixed(2) + 's';

            drop.style.setProperty('--dx',    dx.toFixed(1) + 'px');
            drop.style.setProperty('--dy',    dy.toFixed(1) + 'px');
            drop.style.setProperty('--rot',   rot);
            drop.style.setProperty('--dur',   dur);
            drop.style.setProperty('--delay', delay);

            cardEl.appendChild(drop);
        }

        // Remove os filhos depois da animação terminar (1.4s)
        setTimeout(() => {
            cardEl.querySelectorAll('.blood-drop, .blood-pool').forEach(el => el.remove());
        }, 1400);
    }

    showLocationToast(location, isNew = false) {
        const old = document.getElementById('location-toast');
        if (old) old.remove();

        const initIcon = { courage:'⚔️', power:'💪', wisdom:'🧠', speed:'⚡' };
        const initLabel = { courage:'Coragem', power:'Poder', wisdom:'Sabedoria', speed:'Velocidade' };
        const icon = initIcon[location.initiative] || '🗺️';
        const statName = initLabel[location.initiative] || location.initiative;

        const toast = document.createElement('div');
        toast.id = 'location-toast';
        toast.style.cssText = `
            position: fixed; top: 24px; left: 50%; transform: translateX(-50%) translateY(-20px);
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 2px solid #f1c40f;
            border-radius: 14px; padding: 16px 28px;
            z-index: 8000; text-align: center; color: white;
            box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 20px rgba(241,196,15,0.3);
            max-width: 480px; width: 90%;
            opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: none;
        `;

        toast.innerHTML = `
            <div style="font-size:11px; color:#f1c40f; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px;">
                ${isNew ? '📍 Novo Local Revelado' : '📍 Local de Batalha'}
            </div>
            <div style="font-size:20px; font-weight:bold; color:#fff; margin-bottom:6px;">
                ${location.name}
            </div>
            <div style="font-size:12px; color:#bdc3c7; line-height:1.5; margin-bottom:8px;">
                ${location.description}
            </div>
            <div style="display:inline-block; background:rgba(241,196,15,0.15); border:1px solid rgba(241,196,15,0.4);
                        border-radius:20px; padding:3px 12px; font-size:11px; color:#f1c40f;">
                ${icon} Iniciativa por ${statName}
            </div>
        `;

        document.body.appendChild(toast);

        // Anima entrada
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });

        // Some após 4s
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => toast.remove(), 350);
        }, 4000);
    }

    _showInitiativeBanner(striker, stat) {
        const existing = document.getElementById('initiative-banner');
        if (existing) existing.remove();

        const statNames = { courage: 'Coragem', power: 'Poder', wisdom: 'Sabedoria', speed: 'Velocidade' };
        const statIcons = { courage: '⚔️', power: '💪', wisdom: '🧠', speed: '⚡' };
        const isMe = !this.multiplayerMode
            ? striker === 1
            : striker === this.myPlayerNumber;
        const strikerLabel = this.multiplayerMode
            ? (striker === this.myPlayerNumber ? '⚡ VOCÊ ataca primeiro!' : '🛡️ Oponente ataca primeiro!')
            : (striker === 1 ? '⚡ VOCÊ ataca primeiro!' : '🛡️ Oponente ataca primeiro!');
        const borderColor = isMe ? '#2ecc71' : '#e74c3c';
        const glowColor  = isMe ? 'rgba(46,204,113,0.4)' : 'rgba(231,76,60,0.4)';

        const banner = document.createElement('div');
        banner.id = 'initiative-banner';
        banner.style.cssText = `
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            background: rgba(10,15,25,0.97);
            border: 3px solid ${borderColor};
            border-radius: 16px; padding: 28px 50px;
            z-index: 9999; text-align: center; color: white;
            box-shadow: 0 0 40px ${glowColor};
            animation: initiativePop 0.35s ease forwards;
        `;
        banner.innerHTML = `
            <div style="font-size:13px;color:#bdc3c7;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">⚔️ Combate Iniciado</div>
            <div style="font-size:26px;font-weight:bold;color:${borderColor};margin-bottom:8px;">${strikerLabel}</div>
            <div style="font-size:15px;color:#f1c40f;">${statIcons[stat] || '📊'} Iniciativa por <strong>${statNames[stat] || stat.toUpperCase()}</strong></div>
            ${this.activeLocation ? `<div style="font-size:12px;color:#3498db;margin-top:8px;">📍 ${this.activeLocation.name}</div>` : ''}
        `;

        if (!document.getElementById('initiative-anim-style')) {
            const style = document.createElement('style');
            style.id = 'initiative-anim-style';
            style.textContent = `
                @keyframes initiativePop {
                    from { opacity:0; transform: translate(-50%,-50%) scale(0.7); }
                    to   { opacity:1; transform: translate(-50%,-50%) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(banner);
        setTimeout(() => {
            banner.style.transition = 'opacity 0.4s ease';
            banner.style.opacity = '0';
            setTimeout(() => banner.remove(), 420);
        }, 2100);
    }

    renderLocation() {
        const container = document.getElementById("location-container");
        if (!container) return;
        
        if (!this.activeLocation) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = `
            <div style="display: inline-block; background: #34495e; padding: 10px 20px; border-radius: 8px; border: 2px solid #3498db; box-shadow: 0 4px 6px rgba(0,0,0,0.3); margin-top: 10px; min-width: 300px;">
                <h4 style="color: #3498db; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase;">Local Ativo</h4>
                <div style="font-size: 18px; font-weight: bold; color: white;">${this.activeLocation.name}</div>
                <div style="font-size: 12px; color: #bdc3c7; margin-top: 5px;">Iniciativa: <span style="color: #f1c40f;">${this.activeLocation.initiative.toUpperCase()}</span></div>
                <div style="font-size: 11px; color: #2ecc71; margin-top: 5px;">Efeito: ${this.activeLocation.description}</div>
            </div>
        `;
    }

    processCombatTurn() {
        if (!this.activeCombat) return;
        
        const { p1Card, p2Card, currentStriker, p1R, p1C, p2R, p2C } = this.activeCombat;
        
        if (currentStriker === 1) {
            this.pendingCombat = {
                attacker: p1Card, defender: p2Card,
                atkR: p1R, atkC: p1C, defR: p2R, defC: p2C,
                attackingPlayer: 1
            };
            if (this.multiplayerMode && this.myPlayerNumber === 2) {
                // Sou o P2 — aguardo P1 escolher o ataque via socket
                this.log('⏳ Aguardando Jogador 1 escolher o ataque...');
            } else {
                this.showAttackModal(p1Card, p2Card, p1R, p1C, p2R, p2C, 1);
            }
        } else {
            this.pendingCombat = {
                attacker: p2Card, defender: p1Card,
                atkR: p2R, atkC: p2C, defR: p1R, defC: p1C,
                attackingPlayer: 2
            };

            if (this.multiplayerMode) {
                // Em multiplayer: P2 humano escolhe o ataque pelo modal
                if (this.myPlayerNumber === 2) {
                    // Sou o P2 — mostro meu modal de ataque
                    this.showAttackModal(p2Card, p1Card, p2R, p2C, p1R, p1C, 2);
                }
                // Se sou o P1, apenas aguardo o P2 enviar confirmAttack via socket
            } else {
                // Single-player: IA escolhe automaticamente
                setTimeout(() => {
                    const hand = this.p2AttackHand;
                    const { attacker: aiAttacker, defender: aiDefender } = this.pendingCombat;
                    let cardIndex = hand.reduce((bestIdx, card, idx, arr) => {
                        const scoreNew = this.evaluateAttack(card, aiAttacker, aiDefender);
                        const scoreBest = this.evaluateAttack(arr[bestIdx], aiAttacker, aiDefender);
                        return scoreNew > scoreBest ? idx : bestIdx;
                    }, 0);
                    this.confirmAttack(cardIndex);
                }, 1500);
            }
        }
    }

    showAttackModal(attacker, defender, atkR, atkC, defR, defC, attackingPlayer) {
        
        const modal = document.getElementById("attack-modal");
        const container = document.getElementById("attack-cards-container");
        if (!modal || !container) {
            this.resolveAttack(attacker, defender, atkR, atkC, defR, defC, attackingPlayer);
            return;
        }

        const atkSyn = this.getSynergyBonus(attackingPlayer, atkR, atkC);
        const defSyn = this.getSynergyBonus(attackingPlayer === 1 ? 2 : 1, defR, defC);

        const effAtk = {
            courage: attacker.courage + (atkSyn ? atkSyn.courage : 0),
            power: attacker.power + (atkSyn ? atkSyn.power : 0),
            wisdom: attacker.wisdom + (atkSyn ? atkSyn.wisdom : 0),
            speed: attacker.speed + (atkSyn ? atkSyn.speed : 0)
        };
        const effDef = {
            courage: defender.courage + (defSyn ? defSyn.courage : 0),
            power: defender.power + (defSyn ? defSyn.power : 0),
            wisdom: defender.wisdom + (defSyn ? defSyn.wisdom : 0),
            speed: defender.speed + (defSyn ? defSyn.speed : 0)
        };

        const renderCard = (card, effStats, label) => {
            const effEnergy = card.energy;
            const maxEnergy = card.maxEnergy;
            const mugicCounters = card.mugicCounters || 0;
            
            // Gerar ícones de contador mugic (♪)
            let mugicHtml = '';
            for(let i=0; i<mugicCounters; i++) {
                mugicHtml += '<span style="color:#9b59b6; margin:0 1px;">♪</span>';
            }

            let elementsHtml = '';
            if (card.elements && card.elements.length > 0) {
                const iconMap = { "Fire": "🔥", "Water": "💧", "Earth": "🪨", "Air": "🌪️" };
                elementsHtml = `<div style="display: flex; gap: 5px; justify-content: center; margin-top: -10px; z-index: 2; position: relative;">`;
                card.elements.forEach(el => {
                    elementsHtml += `<div title="${el}" style="background: rgba(0,0,0,0.8); border: 1px solid #7f8c8d; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-size: 14px;">${iconMap[el] || '✨'}</div>`;
                });
                elementsHtml += `</div>`;
            }

            return `
            <div style="background: #2c3e50; padding: 15px; border-radius: 10px; border: 3px solid ${label === 'Atacante' ? '#f1c40f' : '#e74c3c'}; width: 250px; text-align: center;">
                <h3 style="color: ${label === 'Atacante' ? '#f1c40f' : '#e74c3c'}; margin-bottom: 10px;">${label}</h3>
                <div class="card-rarity-icon rarity-${(card.rarity || 'Common').toLowerCase().replace(/\s+/g, '-')}" title="${card.rarity || 'Common'}">${card.rarity === 'Ultra Rare' ? '💎' : card.rarity === 'Super Rare' ? '🔷' : card.rarity === 'Rare' ? '🔶' : card.rarity === 'Legendary' ? '🌟' : '⚪'}</div>
                <div class="card-tribe">${card.tribe}</div>
                <div class="card-name" style="font-size: 1.2em;">${card.name}</div>
                <div class="card-image-container" style="margin: 10px auto;">
                    ${card.image ? `<img src="${card.image}" style="width: 100%; height: 100%; object-fit: cover;" alt="${card.name}">` : `<div class="card-image-placeholder">Sem Imagem</div>`}
                </div>
                ${card.battlegear && card.bgRevealed ? `<div style="text-align: center; font-size: 11px; color: #f1c40f; background: rgba(0,0,0,0.8); margin: 5px auto; padding: 4px; border-radius: 4px; border: 1px solid #f1c40f; width: 90%;" title="${card.battlegear.description || 'Equipamento'}">🗡️ ${card.battlegear.name}</div>` : ''}
                ${elementsHtml}
                
                <div class="card-stats" style="grid-template-columns: 1fr 1fr;">
                    <div class="stat-box" data-tip="Coragem — define quem ataca primeiro na iniciativa. Usada em ataques de Courage e pela passiva Intimidate."><span class="stat-icon">⚔️</span><span class="stat-label">COR</span><span class="stat-value">${effStats.courage}</span></div>
                    <div class="stat-box" data-tip="Poder — usado em ataques físicos de Poder. Quanto maior, mais dano em ataques de Power."><span class="stat-icon">💪</span><span class="stat-label">POD</span><span class="stat-value">${effStats.power}</span></div>
                    <div class="stat-box" data-tip="Sabedoria — usado em ataques mágicos de Sabedoria. Também define quem pode conjurar Mugics mais caras."><span class="stat-icon">🧠</span><span class="stat-label">SAB</span><span class="stat-value">${effStats.wisdom}</span></div>
                    <div class="stat-box" data-tip="Velocidade — usado em ataques de Speed e na disputa de iniciativa. Swift aumenta este valor."><span class="stat-icon">⚡</span><span class="stat-label">VEL</span><span class="stat-value">${effStats.speed}</span></div>
                </div>
                <div style="color: #bdc3c7; font-size: 12px; margin-top: 5px;">❤️ ${effEnergy} / ${maxEnergy}</div>
                <div style="font-size: 12px; font-weight: bold; margin-top: 5px;">${mugicHtml}</div>
            </div>
            `;
        };

        const hand = attackingPlayer === 1 ? this.p1AttackHand : this.p2AttackHand;
        let handHtml = `<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px; justify-content: center; align-items: center; width: 100%;">
            <div style="font-size: 40px; color: #e74c3c;">VS</div>
            <div style="color: #f1c40f; margin-bottom: 5px; font-weight: bold;">Selecione sua Carta de Ataque:</div>
            <div style="display: flex; gap: 15px;">`;
            
        const statNames   = { courage:'Coragem', power:'Poder', wisdom:'Sabedoria', speed:'Velocidade' };
        const statIcons   = { courage:'⚔️', power:'💪', wisdom:'🧠', speed:'⚡' };
        const elemIcons   = { Fire:'🔥', Water:'💧', Earth:'🪨', Air:'🌪️' };

        // Traduz specialEffect para texto legível
        const describeSpecial = (se) => {
            if (!se) return null;
            switch (se.type) {
                case 'no_tribal_mugic_this_attack':    return '🚫 Impede Mugics tribais neste ataque';
                case 'peek_location_deck':             return '👁️ Veja o topo do deck de Locais';
                case 'peek_attack_deck':               return '👁️ Veja o topo do deck de Ataques';
                case 'reveal_battlegear':              return '🔍 Revela o Battlegear do defensor';
                case 'hive_call':                      return '🐜 Hive Call: convoca Mandiblor aliado';
                case 'shuffle_both_attack_decks':      return '🔀 Embaralha ambos os decks de Ataque';
                case 'new_location_lose_element':      return `🌍 Revela novo Local; atacante perde ${se.element}`;
                case 'drain_all_stats_lose_element':   return `📉 Drenagem total de stats (−${se.value}); perde elemento`;
                case 'drain_stat':                     return `📉 Drena ${se.value} de ${statNames[se.stat]||se.stat} do defensor`;
                case 'lose_element':                   return `⚡ Atacante perde ${se.element} após o ataque`;
                case 'destroy_battlegear_on_check':    return `💣 Se ${statNames[se.checkStat]||se.checkStat} ≥ ${se.checkThreshold}: destrói Battlegear`;
                case 'lucky_shot':                     return `🎲 Lucky Shot: 50% de chance — causa ${se.value} ou 0 de dano`;
                case 'megaroar':                       return `📢 Megaroar: +${se.value} dano para cada ${se.threshold} de Coragem`;
                case 'double_challenge':               return `⚡ Bônus duplo — Coragem E Sabedoria +15`;
                default:                               return `✨ Efeito especial`;
            }
        };

        hand.forEach((atkCard, index) => {
            let expectedDamage = atkCard.baseDamage;
            let rows = [];  // cada linha: { ok, text }

            // Dano base
            if (atkCard.baseDamage > 0) {
                rows.push({ ok: true, text: `💥 Base: ${atkCard.baseDamage} dano` });
            }

            // Requisito de stat
            if (atkCard.statRequirement && atkCard.statDamage > 0) {
                const statKey  = atkCard.statRequirement.toLowerCase();
                const atkVal   = effAtk[statKey] || 0;
                const defVal   = effDef[statKey] || 0;
                const icon     = statIcons[statKey] || '📊';
                const label    = statNames[statKey]  || statKey;
                let met = false;
                let condText = '';

                if (atkCard.statMode === 'challenge') {
                    met      = (atkVal - defVal) >= atkCard.statThreshold;
                    condText = `${icon} Se ${label} superar por ${atkCard.statThreshold}+`;
                    const diff = atkVal - defVal;
                    condText  += ` (você ${diff >= 0 ? '+' : ''}${diff})`;
                } else { // check
                    met      = atkVal >= atkCard.statThreshold;
                    condText = `${icon} Se ${label} ≥ ${atkCard.statThreshold} (você ${atkVal})`;
                }

                if (met) {
                    expectedDamage += atkCard.statDamage;
                    rows.push({ ok: true,  text: `✅ ${condText} → +${atkCard.statDamage} dano` });
                } else {
                    rows.push({ ok: false, text: `❌ ${condText} → +${atkCard.statDamage} dano` });
                }
            }

            // Requisito de stat com cura (statHeal)
            if (atkCard.statRequirement && atkCard.statHeal > 0) {
                const statKey  = atkCard.statRequirement.toLowerCase();
                const atkVal   = effAtk[statKey] || 0;
                const defVal   = effDef[statKey] || 0;
                const icon     = statIcons[statKey] || '📊';
                const label    = statNames[statKey]  || statKey;
                let met = false;
                let condText = '';
                if (atkCard.statMode === 'challenge') {
                    met      = (atkVal - defVal) >= atkCard.statThreshold;
                    condText = `${icon} Se ${label} superar por ${atkCard.statThreshold}+`;
                } else {
                    met      = atkVal >= atkCard.statThreshold;
                    condText = `${icon} Se ${label} ≥ ${atkCard.statThreshold}`;
                }
                if (met) {
                    rows.push({ ok: true,  text: `✅ ${condText} → cura ${atkCard.statHeal}` });
                } else {
                    rows.push({ ok: false, text: `❌ ${condText} → cura ${atkCard.statHeal}` });
                }
            }

            // Requisito de elemento
            if (atkCard.elementRequirement) {
                const hasEl  = attacker.elements && attacker.elements.includes(atkCard.elementRequirement);
                const elIcon = elemIcons[atkCard.elementRequirement] || '✨';
                const elText = `${elIcon} Precisa de ${atkCard.elementRequirement}`;

                if (atkCard.elementDamage > 0) {
                    if (hasEl) {
                        expectedDamage += atkCard.elementDamage;
                        rows.push({ ok: true,  text: `✅ ${elText} → +${atkCard.elementDamage} dano` });
                    } else {
                        rows.push({ ok: false, text: `❌ ${elText} → +${atkCard.elementDamage} dano` });
                    }
                }

                if (atkCard.elementEffect) {
                    const efDesc = describeSpecial(atkCard.elementEffect);
                    if (hasEl) {
                        rows.push({ ok: true,  text: `✅ ${elText}: ${efDesc}` });
                    } else {
                        rows.push({ ok: null,  text: `⚠️ ${elText}: ${efDesc}` });
                    }
                }
            }

            // Efeito especial (independente)
            if (atkCard.specialEffect) {
                const efDesc = describeSpecial(atkCard.specialEffect);
                if (efDesc) rows.push({ ok: 'special', text: efDesc });
            }

            // Se não tem dano nenhum e nenhuma linha, mostra aviso
            if (expectedDamage === 0 && rows.filter(r => r.ok === true).length === 0) {
                rows.unshift({ ok: 'warn', text: '⚠️ Este ataque causa 0 dano base' });
            }

            // Raridade cor
            const rarityColor = { 'Ultra Rare':'#e056fd', 'Super Rare':'#74b9ff', 'Rare':'#f9ca24', 'Uncommon':'#6ab04c', 'Common':'#dfe6e9' };
            const rc = rarityColor[atkCard.rarity] || '#dfe6e9';

            // Borda: verde se expectedDamage > 0, laranja se tem special, cinza se 0
            const borderCol = expectedDamage > 0 ? '#2ecc71' : (atkCard.specialEffect ? '#e67e22' : '#7f8c8d');
            const dmgColor  = expectedDamage > 0 ? '#2ecc71' : '#e74c3c';

            const rowsHtml = rows.map(r => {
                const col = r.ok === true ? '#2ecc71' : r.ok === false ? '#e74c3c' : r.ok === 'special' ? '#f39c12' : '#e67e22';
                return `<div style="font-size:10px;color:${col};text-align:left;line-height:1.4;padding:1px 0;">${r.text}</div>`;
            }).join('');

            handHtml += `
                <div onclick="game.confirmAttack(${index})"
                     style="background:#1e2d3d; padding:12px 10px; border-radius:8px; cursor:pointer;
                            border:2px solid ${borderCol}; width:170px; text-align:center; color:white;
                            transition:transform 0.15s, box-shadow 0.15s; display:flex; flex-direction:column; gap:6px;"
                     onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 20px rgba(0,0,0,0.6)'"
                     onmouseout="this.style.transform='';this.style.boxShadow=''">
                    <div style="font-weight:bold; color:#f1c40f; font-size:13px; line-height:1.2;">${atkCard.name}</div>
                    <div style="font-size:9px; color:${rc}; letter-spacing:1px; text-transform:uppercase;">${atkCard.rarity || ''}</div>
                    <div style="font-size:22px; font-weight:900; color:${dmgColor}; line-height:1;">
                        💥 ${expectedDamage}
                        <span style="font-size:11px; font-weight:400; color:#95a5a6;">dano</span>
                    </div>
                    <div style="background:rgba(0,0,0,0.3); border-radius:5px; padding:6px 8px; display:flex; flex-direction:column; gap:2px;">
                        ${rowsHtml}
                    </div>
                </div>
            `;
        });
        handHtml += `</div></div>`;

        // ── Banner do Local Ativo ──────────────────────────────────────────────
        const locBanner = this._buildLocationBannerHtml(attacker, defender);

        container.innerHTML = `
            ${renderCard(attacker, effAtk, 'Atacante')}
            ${handHtml}
            ${renderCard(defender, effDef, 'Defensor')}
        `;

        // Injeta banner do local abaixo do container de cartas
        if (locBanner) {
            const bannerEl = document.createElement('div');
            bannerEl.innerHTML = locBanner;
            const modalContent = modal.querySelector('.attack-modal-content');
            // Insere antes do botão cancelar (ou no final)
            const cancelEl = document.getElementById('cancel-attack-btn');
            if (cancelEl) modalContent.insertBefore(bannerEl.firstChild, cancelEl);
            else modalContent.appendChild(bannerEl.firstChild);
        }

        let cancelBtn = document.getElementById('cancel-attack-btn');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.id = 'cancel-attack-btn';
            cancelBtn.className = 'btn btn-danger btn-cancel-attack';
            cancelBtn.innerText = 'Cancelar Ataque';
            cancelBtn.onclick = () => this.cancelAttackModal();
            cancelBtn.style.marginTop = '20px';
            modal.querySelector('.attack-modal-content').appendChild(cancelBtn);
        }
        
        if (this.activeCombat && this.activeCombat.isFirstAttack && this.activeCombat.initiatingPlayer === 1) {
            cancelBtn.style.display = 'inline-block';
        } else {
            cancelBtn.style.display = 'none';
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex-modal');
    }

    confirmAttack(cardIndex, fromRemote = false) {
        const modal = document.getElementById("attack-modal");
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex-modal');
        }

        if (!fromRemote) {
            this.sendAction('confirmAttack', { cardIndex });
        }

        if (!this.pendingCombat) return;
        if (!this.activeCombat) return; // Combate já terminou (desync multiplayer)
        const { attacker, defender, atkR, atkC, defR, defC, attackingPlayer } = this.pendingCombat;
        const hand = attackingPlayer === 1 ? this.p1AttackHand : this.p2AttackHand;
        const atkCard = hand[cardIndex];

        const usedCard = hand.splice(cardIndex, 1)[0];
        const discard = attackingPlayer === 1 ? this.p1AttackDiscard : this.p2AttackDiscard;
        discard.push(usedCard);
        this.drawAttackCard(attackingPlayer);

        // Inicializar a Pilha (Burst)
        this.burstStack = [];
        this.burstPasses = 0;
        this.burstPriority = attackingPlayer; // Atacante tem a 1ª resposta

        const p2Label = this.multiplayerMode ? 'Jogador 2' : 'IA (Oponente)';
        this.burstStack.push({
            type: 'attack',
            source: attackingPlayer === 1 ? 'Jogador 1' : p2Label,
            attacker, defender, atkR, atkC, defR, defC, attackingPlayer, atkCard,
            description: `Ataque Declarado: ${atkCard.name}`
        });

        this.log(`🔔 BURST ABERTO: ${attackingPlayer === 1 ? 'Jogador 1' : p2Label} atacou com ${atkCard.name}`);
        this.openBurstModal();
    }

    openBurstModal() {
        const modal = document.getElementById('burst-modal');
        if (!modal) {
            this.resolveBurst();
            return;
        }

        // Render Stack
        const container = document.getElementById('burst-stack-container');
        let html = '';
        // Inverter para mostrar LIFO visualmente (último no topo)
        [...this.burstStack].reverse().forEach((item, i) => {
            const negStyle = item.negated
                ? 'text-decoration: line-through; opacity: 0.45; color: #e74c3c;'
                : 'color: #ecf0f1;';
            const negTag = item.negated ? ' <span style="color:#e74c3c;font-size:10px;">🚫 NEGADA</span>' : '';
            html += `<div style="padding: 8px; border-bottom: 1px solid #7f8c8d; text-align: left; ${negStyle}">
                <span style="color: #f1c40f;">${this.burstStack.length - i}.</span> [${item.source}] ${item.description}${negTag}
            </div>`;
        });
        container.innerHTML = html;

        // Controle de Prioridade
        const passBtn      = document.getElementById('btn-burst-pass');
        const playBtn      = document.getElementById('btn-burst-play');
        const sacrificeBtn = document.getElementById('btn-burst-sacrifice');
        const mugicSel     = document.getElementById('burst-mugic-selection');
        mugicSel.classList.add('hidden');

        // Mostrar botão de sacrifício se o jogador da vez tiver battlegear sacrificável
        if (sacrificeBtn) {
            const myCard = this.activeCombat
                ? (this.burstPriority === 1 ? this.activeCombat.p1Card : this.activeCombat.p2Card)
                : null;
            const hasSacrifice = myCard && myCard.battlegear && myCard.bgRevealed
                && myCard.battlegear.sacrificeEffect;
            sacrificeBtn.style.display = hasSacrifice ? 'inline-block' : 'none';
        }

        // Determina se é minha vez no burst
        const isMyBurstTurn = this.multiplayerMode
            ? this.burstPriority === this.myPlayerNumber
            : this.burstPriority === 1;

        let promptText;
        if (this.multiplayerMode) {
            if (isMyBurstTurn) {
                promptText = this.burstPasses === 1
                    ? `Oponente passou. Jogar Mugic ou Passar para resolver?`
                    : `Sua vez no Burst — Jogar Mugic ou Passar?`;
            } else {
                promptText = `Aguardando resposta do oponente...`;
            }
        } else {
            // Single-player
            if (this.burstPriority === 1 && this.burstPasses === 1) {
                promptText = `A IA passou. Deseja adicionar outra mágica ou Passar para resolver?`;
            } else if (this.burstPriority === 2 && this.burstPasses === 1) {
                promptText = `Jogador 1 passou. A IA está pensando...`;
            } else {
                promptText = `Turno de Resposta: ${this.burstPriority === 1 ? 'Jogador 1' : 'IA (Oponente)'}`;
            }
        }
        document.getElementById('burst-prompt').innerText = promptText;

        if (isMyBurstTurn) {
            passBtn.disabled = false;
            playBtn.disabled = false;
        } else {
            passBtn.disabled = true;
            playBtn.disabled = true;
            // Só chama IA em single-player
            if (!this.multiplayerMode) {
                setTimeout(() => this.aiBurstDecision(), 1500);
            }
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex-modal');

        // Auto-scroll para o modal de combate ficar visível no centro da tela
        setTimeout(() => {
            modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
    }

    showBurstMugicSelection() {
        const mugicSel = document.getElementById('burst-mugic-selection');
        const handContainer = document.getElementById('burst-hand-container');
        if (!mugicSel || !handContainer) return;

        // Limpar
        handContainer.innerHTML = '';
        
        // Puxar a mão do jogador atual
        const playerMugics = this.burstPriority === 1 ? this.playerMugics : this.p2Mugics;
        
        if (!playerMugics || playerMugics.length === 0) {
            handContainer.innerHTML = '<span style="color:#e74c3c;">Nenhuma Mugic na mão!</span>';
        } else {
            const tribeColors = {
                OverWorld: '#2980b9', UnderWorld: '#8e44ad',
                Mipedian: '#e67e22', Danian: '#27ae60', Generic: '#7f8c8d'
            };
            playerMugics.forEach((mg, i) => {
                const tc = tribeColors[mg.tribe] || '#7f8c8d';
                handContainer.innerHTML += `
                    <div style="background: #1a252f; border: 2px solid ${tc}; padding: 10px; border-radius: 8px; cursor: pointer; width: 160px; display:flex; flex-direction:column; gap:4px; transition: transform 0.15s, box-shadow 0.15s;"
                         onclick="game.selectMugicToPlay(${i})"
                         onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 6px 18px rgba(0,0,0,0.5)'"
                         onmouseout="this.style.transform='';this.style.boxShadow=''">
                        <div style="font-weight:bold; color:#f1c40f; font-size:13px; line-height:1.2;">${mg.name}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:10px; background:${tc}; color:#fff; border-radius:4px; padding:1px 5px;">${mg.tribe}</span>
                            <span style="font-size:11px; color:#f39c12; font-weight:bold;">${mg.cost} ♪</span>
                        </div>
                        <div style="font-size:10px; color:#bdc3c7; line-height:1.4; margin-top:2px;">${mg.description}</div>
                    </div>
                `;
            });
        }
        
        mugicSel.classList.remove('hidden');
    }

    selectMugicToPlay(index, fromRemote = false) {
        if (!fromRemote) {
            this.sendAction('selectMugic', { index });
        }
        const playerMugics = this.burstPriority === 1 ? this.playerMugics : this.p2Mugics;
        const mg = playerMugics[index];
        
        if (this.burstPriority === 1) {
            this.pendingMugicIndex = index;
            this.gameState = 'SELECT_MUGIC_CASTER';
            this.closeBurstModal();
            this.log(`🪄 Você escolheu [${mg.name}]. Clique na sua criatura que vai pagar os ${mg.cost} ♪!`);
            this.renderBoard();
        } else {
            // IA logic for future
            this.burstStack.push({
                type: 'mugic',
                source: 'IA (Oponente)',
                mugic: mg,
                description: `Mugic Cast: ${mg.name}`
            });
            this._discardMugic(2, this.p2Mugics, index);
            this.burstPasses = 0;
            this.burstPriority = 1;
            this.openBurstModal();
        }
    }

    resolveMugicCaster(r, c, fromRemote = false) {
        if (!fromRemote) {
            this.sendAction('resolveMugicCaster', { r, c });
        }
        const mg = this.playerMugics[this.pendingMugicIndex];
        const card = this.boardP1[r][c];
        
        // Verificar penalidade tribal
        let cost = mg.cost;
        if (mg.tribe !== "Generic" && mg.tribe !== card.tribe) {
            cost += 1; // Penalidade por conjurar Mugic de fora da tribo
        }
        
        // Iron Balls: bloqueia Mugics tribais neste burst
        if (this._ironBallsActive && mg.tribe !== 'Generic') {
            this.showAlert("Bloqueado por Iron Balls", `🚫 Iron Balls está ativo!\nApenas Mugics Genéricas podem ser jogadas neste burst.`).then(() => this.openBurstModal());
            return;
        }

        // Verificar restrições do Local
        const locEffect = this.activeLocation && this.activeLocation.effect;
        if (locEffect) {
            if (locEffect.type === 'no_mugic') {
                this.showAlert("Local Bloqueado", `[Dranakis Threshold] Mugics não podem ser jogadas neste local!`).then(() => this.openBurstModal());
                return;
            }
            if (locEffect.type === 'no_tribal_mugic' && mg.tribe !== 'Generic') {
                this.showAlert("Local Bloqueado", `[Runic Grove] Apenas Mugics Generic podem ser jogadas aqui!`).then(() => this.openBurstModal());
                return;
            }
            if (locEffect.type === 'extra_mugic_cost_tribe' && mg.tribe === locEffect.tribe) {
                cost += locEffect.value;
                this.log(`📍 [${this.activeLocation.name}] Mugic ${mg.tribe} custa +${locEffect.value} contador extra!`);
            }
        }

        if (card.mugicCounters < cost) {
            const errorMsg = `⚠️ ${card.name} não tem contadores suficientes!\nA Mugic custa ${cost} ♪ (Custo Base: ${mg.cost} + Penalidade de Tribo: ${cost - mg.cost}).\nA criatura tem apenas ${card.mugicCounters} ♪.`;
            this.log(errorMsg);
            this.showAlert("Custo Insuficiente", errorMsg).then(() => {
                this.openBurstModal();
            });
            return;
        }

        // Paga o custo
        card.mugicCounters -= cost;
        this.log(`🎶 ${card.name} pagou ${cost} ♪ e conjurou [${mg.name}]!`);
        
        // Adiciona à pilha
        this.burstStack.push({
            type: 'mugic',
            source: 'Jogador 1',
            mugic: mg,
            caster: card,
            description: `Mugic Cast: ${mg.name} (por ${card.name})`
        });

        // Remove da mão → discard pile
        this._discardMugic(1, this.playerMugics, this.pendingMugicIndex);
        
        // Volta para o Burst
        this.gameState = 'ENGAGED_COMBAT';
        this.burstPasses = 0;
        this.burstPriority = 2; // Passa a bola pra IA
        this.renderBoard();
        this.openBurstModal();
    }

    cancelMugicCaster(fromRemote = false) {
        if (!fromRemote) {
            this.sendAction('cancelMugicCaster');
        }
        if (this.gameState !== 'SELECT_MUGIC_CASTER') return;
        this.gameState = 'ENGAGED_COMBAT';
        this.pendingMugicIndex = null;
        this.log("⚠️ Lançamento de Mugic cancelado pelo jogador.");
        
        // Retorna a mão do jogador para a pilha (PlayerMugics continua a mesma)
        this.renderBoard();
        this.openBurstModal();
    }

    passBurst(fromRemote = false) {
        if (!fromRemote) {
            this.sendAction('passBurst');
        }
        this.log(`${this.burstPriority === 1 ? 'Jogador 1' : 'IA'} passou a prioridade.`);
        this.burstPasses++;
        if (this.burstPasses >= 2) {
            this.closeBurstModal();
            this.resolveBurst();
        } else {
            this.burstPriority = this.burstPriority === 1 ? 2 : 1;
            this.openBurstModal();
        }
    }

    sacrificeBattlegear() {
        if (!this.activeCombat) return;
        const myCard = this.burstPriority === 1 ? this.activeCombat.p1Card : this.activeCombat.p2Card;
        const oppCard = this.burstPriority === 1 ? this.activeCombat.p2Card : this.activeCombat.p1Card;
        if (!myCard || !myCard.battlegear || !myCard.battlegear.sacrificeEffect) return;

        const bg  = myCard.battlegear;
        const eff = bg.sacrificeEffect;
        this.log(`⚔️ ${myCard.name} sacrificou [${bg.name}]!`);

        switch (eff.type) {
            case 'grant_element':
                if (!myCard.elements) myCard.elements = [];
                if (!myCard.elements.includes(eff.element)) {
                    myCard.elements.push(eff.element);
                    this.log(`✨ ${myCard.name} ganhou ${eff.element} até o fim do combate!`);
                }
                break;
            case 'heal_target':
                // Cura a própria criatura (simplificado — alvo único em combate)
                myCard.energy = Math.min(myCard.maxEnergy, myCard.energy + eff.value);
                this.log(`💚 ${myCard.name} curou ${eff.value} de Energia! (agora ${myCard.energy})`);
                break;
            case 'damage_target':
                oppCard.energy = Math.max(0, oppCard.energy - eff.value);
                this.log(`💥 [${bg.name}] causou ${eff.value} de dano a ${oppCard.name}! (${oppCard.energy} restante)`);
                if (oppCard.energy <= 0) {
                    this.log(`💀 ${oppCard.name} foi destruído!`);
                }
                break;
            case 'add_mugic_counter':
                myCard.mugicCounters = (myCard.mugicCounters || 0) + eff.value;
                this.log(`♪ ${myCard.name} ganhou ${eff.value} Mugic Counter(s)! (total: ${myCard.mugicCounters})`);
                break;
            case 'drain_stat':
                const oldVal = oppCard[eff.stat] || 0;
                oppCard[eff.stat] = Math.max(0, oldVal - eff.value);
                this.log(`📉 [${bg.name}] ${oppCard.name} perdeu ${eff.value} de ${eff.stat}! (${oppCard[eff.stat]})`);
                break;
        }

        // Remove o battlegear após sacrifício
        myCard.battlegear = null;
        myCard.bgRevealed = false;
        this.renderBoard();

        // Continua o burst normalmente (conta como ação — zera passes)
        this.burstPasses = 0;
        this.burstPriority = this.burstPriority === 1 ? 2 : 1;
        this.openBurstModal();
    }

    closeBurstModal() {
        const modal = document.getElementById('burst-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex-modal');
        }
    }

    async resolveBurst() {
        this.log(`🔔 BURST FECHADO: Resolvendo pilha em ordem reversa!`);

        // Loop pela pilha de trás pra frente (LIFO)
        while (this.burstStack.length > 0) {
            const item = this.burstStack.pop();
            if (item.negated) {
                this.log(`🚫 [${item.description}] foi negada — ignorada.`);
                continue;
            }
            this.log(`Executando: ${item.description}`);
            if (item.type === 'attack') {
                await this.executeAttack(item);
            } else if (item.type === 'mugic') {
                await this.executeMugic(item);
            }
        }

        // Limpa flags temporárias de ataque
        this._ironBallsActive = false;

        setTimeout(() => {
            this.endCombatTurn();
        }, 1500);
    }

    showAlert(title, message) {
        return new Promise(resolve => {
            let modal = document.getElementById("custom-alert-modal");
            if (!modal) {
                modal = document.createElement("div");
                modal.id = "custom-alert-modal";
                modal.className = "modal-overlay";
                modal.innerHTML = `
                    <div style="background: #1e293b; border: 2px solid #f1c40f; border-radius: 12px; padding: 25px; width: 450px; max-width: 90%; color: white; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.8);">
                        <h2 id="custom-alert-title" style="color: #f1c40f; margin-bottom: 15px; font-size: 22px;"></h2>
                        <div id="custom-alert-message" style="font-size: 16px; margin-bottom: 25px; line-height: 1.5; color: #cbd5e1; white-space: pre-line;"></div>
                        <button id="custom-alert-btn" class="btn btn-primary" style="padding: 10px 30px; font-size: 16px;">OK</button>
                    </div>
                `;
                document.body.appendChild(modal);
            }
            
            document.getElementById("custom-alert-title").innerHTML = title;
            // Remover '✨ MUGIC RESOLVIDA: nome' do inicio da mensagem pois agora tem titulo
            document.getElementById("custom-alert-message").innerHTML = message;
            
            modal.classList.remove('hidden');
            modal.classList.add('flex-modal');
            
            const btn = document.getElementById("custom-alert-btn");
            btn.onclick = () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex-modal');
                resolve();
            };
        });
    }

    applyPassives(trigger, creature, opponent) {
        if (!creature.passives || creature.passives.length === 0) return;
        const catalog = window.passivesDatabase || {};
        creature.passives.forEach(passive => {
            const def = catalog[passive.id];
            if (!def) return;
            def.execute(trigger, passive, creature, opponent, (msg) => this.log(msg), this.activeCombat, this);
        });
    }

    getCardPosition(card) {
        const boards = [this.boardP1, this.boardP2];
        for (let player = 1; player <= boards.length; player++) {
            const board = boards[player - 1];
            for (let r = 0; r < board.length; r++) {
                for (let c = 0; c < board[r].length; c++) {
                    if (board[r][c] === card) return { player, r, c };
                }
            }
        }
        return null;
    }

    getAdjacentPositions(r, c) {
        const adjacencyList = {
            "0,0": [[1,0]],
            "0,1": [[1,0], [1,1]],
            "0,2": [[1,1]],
            "1,0": [[0,0], [0,1], [2,0]],
            "1,1": [[0,1], [0,2], [2,0]],
            "2,0": [[1,0], [1,1]]
        };
        return adjacencyList[`${r},${c}`] || [];
    }

    getPassiveDescription(card) {
        if (!card.passives || card.passives.length === 0) return '';
        const catalog = window.passivesDatabase || {};
        return card.passives
            .map(passive => {
                const def = catalog[passive.id];
                if (!def) return null;
                return def.description ? def.description(passive) : `${def.name}: Sem descrição`;
            })
            .filter(d => d !== null)
            .join('\n');
    }

    // Retorna HTML de badges de passiva para exibição direta no card
    _getPassiveBadgesHtml(card) {
        if (!card.passives || card.passives.length === 0) return '';
        const catalog = window.passivesDatabase || {};

        // Cores por tipo de passiva
        const colorMap = {
            intimidate:             { bg: '#6c3483', border: '#9b59b6' },
            swift:                  { bg: '#1a5276', border: '#2980b9' },
            strike:                 { bg: '#784212', border: '#d35400' },
            tough:                  { bg: '#1e4d2b', border: '#27ae60' },
            berserk:                { bg: '#6e2c00', border: '#e74c3c' },
            reckless:               { bg: '#6e2c00', border: '#e74c3c' },
            fireproof:              { bg: '#512e5f', border: '#8e44ad' },
            elementproof:           { bg: '#154360', border: '#1abc9c' },
            adjacentOverWorldPower: { bg: '#145a32', border: '#2ecc71' },
        };

        const badges = card.passives.map(passive => {
            const def = catalog[passive.id];
            if (!def) return '';
            const icon  = def.icon || '✦';
            const desc  = def.description ? def.description(passive) : def.name;
            const col   = colorMap[passive.id] || { bg: '#2c3e50', border: '#7f8c8d' };

            // Label curta: "Swift 2", "Strike 10", "Tough 5", "Intimidate Cor 10" etc.
            let label = def.name;
            if (passive.value  !== undefined) label += ` ${passive.value}`;
            if (passive.stat   !== undefined) label += ` (${passive.stat.slice(0,3)})`;
            if (passive.element !== undefined) label += ` ${passive.element}`;

            return `<span title="${desc.replace(/"/g, '&quot;')}"
                         style="display:inline-flex;align-items:center;gap:3px;
                                background:${col.bg};border:1px solid ${col.border};
                                color:#fff;font-size:9px;font-weight:600;
                                padding:2px 5px;border-radius:4px;
                                white-space:nowrap;cursor:default;letter-spacing:0.3px;">
                ${icon} ${label}
            </span>`;
        }).join('');

        return `<div style="display:flex;flex-wrap:wrap;gap:3px;padding:3px 4px;
                            justify-content:center;background:rgba(0,0,0,0.35);
                            border-top:1px solid #444;">
                    ${badges}
                </div>`;
    }

    drawAttackCard(player) {
        const deck = player === 1 ? this.p1AttackDeck : this.p2AttackDeck;
        const discard = player === 1 ? this.p1AttackDiscard : this.p2AttackDiscard;
        const hand = player === 1 ? this.p1AttackHand : this.p2AttackHand;

        if (deck.length === 0 && discard.length > 0) {
            // Reciclar descarte
            const shuffled = [...discard].sort(() => Math.random() - 0.5);
            deck.push(...shuffled);
            discard.length = 0;
            this.log(`🔄 Deck de ataques do Jogador ${player} reciclado! (${deck.length} cartas)`);
        }

        if (deck.length > 0) {
            hand.push(deck.shift());
        }
    }

    evaluateAttack(atkCard, attacker, defender) {
        let expected = atkCard.baseDamage;

        // Bônus elemental
        if (atkCard.elementRequirement && attacker.elements && attacker.elements.includes(atkCard.elementRequirement)) {
            expected += atkCard.elementDamage || 0;
        }

        // Bônus de challenge (estimativa: se atacante provavelmente supera o threshold)
        if (atkCard.statRequirement) {
            const stat = atkCard.statRequirement.toLowerCase();
            const threshold = atkCard.statThreshold || 0;
            if ((attacker[stat] || 0) >= (defender[stat] || 0) + threshold) {
                expected += atkCard.statDamage || 0;
            }
        }

        return expected;
    }

    aiBurstDecision() {
        if (!this.p2Mugics || this.p2Mugics.length === 0) {
            this.passBurst();
            return;
        }

        const chosen = this._aiPickMugic();
        if (!chosen) {
            this.passBurst();
            return;
        }

        const { mg, idx, casterCard } = chosen;

        // Deduz os mugic counters do caster
        casterCard.mugicCounters -= mg.cost;
        this.log(`🎶 IA conjurou [${mg.name}] via ${casterCard.name} (${mg.cost} ♪ gastos)!`);

        // Empurra na pilha
        this.burstStack.push({
            type:   'mugic',
            source: 'IA (Oponente)',
            mugic:  mg,
            caster: casterCard,
            description: `Mugic Cast: ${mg.name} (por ${casterCard.name})`
        });
        this._discardMugic(2, this.p2Mugics, idx);
        this.burstPasses = 0;
        this.burstPriority = 1;
        this.openBurstModal();
    }

    /**
     * Escolhe a melhor mugic disponível para a IA jogar no burst.
     * Retorna { mg, idx, casterCard } ou null se nenhuma é viável.
     *
     * Critérios (ordem de prioridade decrescente):
     *  1. Negar uma mugic inimiga na pilha (negate_mugic)
     *  2. Salvar a criatura própria que está prestes a morrer (heal / buff)
     *  3. Matar / danificar criatura inimiga com pouca vida (damage)
     *  4. Qualquer buff útil se a situação for neutra
     */
    _aiPickMugic() {
        if (!this.activeCombat) return null;
        const { p1Card, p2Card } = this.activeCombat;
        const aiCard   = p2Card; // IA é sempre P2
        const atkCard  = p1Card; // inimigo

        // Encontra criaturas da IA que podem pagar o custo
        const aiCasters = [];
        for (const row of this.boardP2) {
            for (const card of row) {
                if (card && card.mugicCounters > 0) aiCasters.push(card);
            }
        }

        // Pré-filtra: apenas mugics cujo caster tem counters suficientes
        // + respeita Iron Balls (bloqueia tribais)
        const affordable = this.p2Mugics
            .map((mg, idx) => {
                // Iron Balls ativo: IA só pode usar Generic
                if (this._ironBallsActive && mg.tribe !== 'Generic') return null;
                const caster = aiCasters.find(c => {
                    // Tribo compatível ou generic
                    const tribeOk = mg.tribe === 'Generic' || mg.tribe === c.tribe;
                    const cost    = tribeOk ? mg.cost : mg.cost + 1; // cross-tribe paga +1
                    return c.mugicCounters >= cost;
                });
                return caster ? { mg, idx, casterCard: caster } : null;
            })
            .filter(Boolean);

        if (affordable.length === 0) return null;

        // ── Prioridade 1: negar mugic inimiga na pilha ──────────────────────
        const enemyMugicInStack = this.burstStack.some(
            item => item.type === 'mugic' && item.source !== 'IA (Oponente)' && !item.negated
        );
        if (enemyMugicInStack) {
            const negator = affordable.find(({ mg }) => mg.effectType === 'negate_mugic');
            if (negator) {
                this.log(`🤔 IA decide negar uma Mugic inimiga com [${negator.mg.name}]!`);
                return negator;
            }
        }

        // ── Prioridade 2: salvar criatura própria com <= 30% de vida ────────
        const aiInDanger = aiCard.energy <= aiCard.maxEnergy * 0.3;
        if (aiInDanger) {
            // Heals
            const healer = affordable.find(({ mg }) =>
                ['heal','conditional_heal','heal_and_grant_element','heal_and_reduce_fire',
                 'energy_steal','energy_transfer'].includes(mg.effectType)
            );
            if (healer) {
                this.log(`🤔 IA usa [${healer.mg.name}] para tentar sobreviver!`);
                return healer;
            }
            // Buff de stats para aguentar o próximo hit
            const buffer = affordable.find(({ mg }) =>
                ['buff_all_stats','buff_combat_stats','damage_reduction_aura'].includes(mg.effectType)
            );
            if (buffer) {
                this.log(`🤔 IA usa [${buffer.mg.name}] para se fortalecer!`);
                return buffer;
            }
        }

        // ── Prioridade 3: matar inimigo com <= 25 de energia ────────────────
        const enemyLow = atkCard.energy <= 25;
        if (enemyLow) {
            const killer = affordable.find(({ mg }) =>
                mg.effectType === 'damage' && (mg.effectValue || 0) >= atkCard.energy
            );
            if (killer) {
                this.log(`🤔 IA usa [${killer.mg.name}] para eliminar ${atkCard.name}!`);
                return killer;
            }
        }

        // ── Prioridade 4: qualquer dano se inimigo tiver < 50% de vida ──────
        if (atkCard.energy < atkCard.maxEnergy * 0.5) {
            const dmg = affordable.find(({ mg }) => mg.effectType === 'damage');
            if (dmg) {
                this.log(`🤔 IA causa dano extra com [${dmg.mg.name}]!`);
                return dmg;
            }
        }

        // ── Prioridade 5: debuff ao inimigo se for muito mais forte ─────────
        const enemyStronger = (atkCard.power + atkCard.courage) > (aiCard.power + aiCard.courage) + 20;
        if (enemyStronger) {
            const debuffer = affordable.find(({ mg }) =>
                ['debuff_all_stats','destroy_battlegear','remove_abilities'].includes(mg.effectType)
            );
            if (debuffer) {
                this.log(`🤔 IA enfraquece o inimigo com [${debuffer.mg.name}]!`);
                return debuffer;
            }
        }

        // ── Sem motivo forte: passa (evita gastar counters à toa) ────────────
        return null;
    }

    executeAttack(item) {
        const { attacker, defender, atkR, atkC, defR, defC, attackingPlayer, atkCard } = item;

        const atkSyn = this.getSynergyBonus(attackingPlayer, atkR, atkC) || {};
        const defSyn = this.getSynergyBonus(attackingPlayer === 1 ? 2 : 1, defR, defC) || {};
        const locMod = (this.activeLocation && this.activeLocation.modifiers) || {};
        const atkBgMod = (attacker.bgRevealed && attacker.battlegear && attacker.battlegear.modifiers) || {};
        const defBgMod = (defender.bgRevealed && defender.battlegear && defender.battlegear.modifiers) || {};

        const effAtk = {
            courage: attacker.courage + (atkSyn.courage||0) + (locMod.courage||0) + (atkBgMod.courage||0),
            power:   attacker.power   + (atkSyn.power  ||0) + (locMod.power  ||0) + (atkBgMod.power  ||0),
            wisdom:  attacker.wisdom  + (atkSyn.wisdom ||0) + (locMod.wisdom ||0) + (atkBgMod.wisdom ||0),
            speed:   attacker.speed   + (atkSyn.speed  ||0) + (locMod.speed  ||0) + (atkBgMod.speed  ||0)
        };
        const effDef = {
            courage: defender.courage + (defSyn.courage||0) + (locMod.courage||0) + (defBgMod.courage||0),
            power:   defender.power   + (defSyn.power  ||0) + (locMod.power  ||0) + (defBgMod.power  ||0),
            wisdom:  defender.wisdom  + (defSyn.wisdom ||0) + (locMod.wisdom ||0) + (defBgMod.wisdom ||0),
            speed:   defender.speed   + (defSyn.speed  ||0) + (locMod.speed  ||0) + (defBgMod.speed  ||0)
        };

        // ─── Helpers ─────────────────────────────────────────────────────────
        const checkStat = (stat, mode, threshold) => {
            const av = effAtk[stat] || 0;
            const dv = effDef[stat] || 0;
            if (mode === 'check') return av >= threshold;
            return av >= dv + threshold; // challenge
        };
        const logCheck = (stat, mode, threshold, passed, bonus) => {
            const av = effAtk[stat] || 0;
            const dv = effDef[stat] || 0;
            if (mode === 'check') {
                passed
                    ? this.log(`📊 Stat Check ${stat.toUpperCase()} (${av} ≥ ${threshold}): +${bonus}!`)
                    : this.log(`📊 Stat Check ${stat.toUpperCase()} falhou (${av} < ${threshold}).`);
            } else {
                passed
                    ? this.log(`📊 Challenge ${stat.toUpperCase()} (${av} ≥ ${dv}+${threshold}): +${bonus}!`)
                    : this.log(`📊 Challenge ${stat.toUpperCase()} falhou (${av} < ${dv}+${threshold}).`);
            }
        };

        let totalDamage = atkCard.baseDamage || 0;
        let totalHeal   = 0;

        // ─── Passiva Strike ──────────────────────────────────────────────────
        if (attacker._strikeBonus) {
            totalDamage += attacker._strikeBonus;
            this.log(`⚡ ${attacker.name} [Strike]: +${attacker._strikeBonus} dano bônus!`);
            attacker._strikeBonus = 0;
        }
        this.applyPassives('attackStart', attacker, defender);
        if (attacker._adjacentOverWorldPower) {
            effAtk.power += attacker._adjacentOverWorldPower;
            this.log(`🌿 ${attacker.name} recebe +${attacker._adjacentOverWorldPower} Power por aliados adjacentes!`);
            attacker._adjacentOverWorldPower = 0;
        }
        if (attacker._berserkBonus) {
            totalDamage += attacker._berserkBonus;
            attacker._berserkBonus = 0;
        }

        // ─── Stat check principal ─────────────────────────────────────────────
        if (atkCard.statRequirement) {
            const stat  = atkCard.statRequirement.toLowerCase();
            const mode  = atkCard.statMode || 'challenge';
            const thr   = atkCard.statThreshold || 0;
            const passed = checkStat(stat, mode, thr);
            logCheck(stat, mode, thr, passed, (atkCard.statDamage || 0) + (atkCard.statHeal || 0));
            if (passed) {
                totalDamage += atkCard.statDamage || 0;
                totalHeal   += atkCard.statHeal   || 0;
            }
        }

        // ─── Extra stat checks (Allmageddon) ──────────────────────────────────
        if (atkCard.extraChecks && atkCard.extraChecks.length > 0) {
            atkCard.extraChecks.forEach(ec => {
                const stat   = ec.stat.toLowerCase();
                const mode   = ec.mode || 'challenge';
                const thr    = ec.threshold || 0;
                const passed = checkStat(stat, mode, thr);
                logCheck(stat, mode, thr, passed, ec.damage || 0);
                if (passed) totalDamage += ec.damage || 0;
            });
        }

        // ─── Elemento ─────────────────────────────────────────────────────────
        if (atkCard.elementRequirement) {
            const hasEl = (attacker.elements || []).includes(atkCard.elementRequirement);
            if (hasEl) {
                if (atkCard.elementDamage) {
                    totalDamage += atkCard.elementDamage;
                    this.log(`🌋 Bônus Elemental ${atkCard.elementRequirement}: +${atkCard.elementDamage} dano!`);
                }
                // Efeito especial do elemento
                if (atkCard.elementEffect) {
                    const ef = atkCard.elementEffect;
                    switch (ef.type) {
                        case "drain_stat":
                            defender[ef.stat] = Math.max(0, (defender[ef.stat] || 0) - ef.value);
                            this.log(`🌊 ${atkCard.elementRequirement}: ${defender.name} perdeu ${ef.value} de ${ef.stat.toUpperCase()}!`);
                            break;
                        case "drain_all_stats_lose_element":
                            ['courage','power','wisdom','speed'].forEach(s => {
                                defender[s] = Math.max(0, (defender[s] || 0) - ef.value);
                            });
                            this.log(`💧 Degenervate: ${defender.name} perdeu ${ef.value} em todos os atributos!`);
                            if (attacker.elements) {
                                attacker.elements = attacker.elements.filter(e => e !== 'Water');
                                this.log(`💧 ${attacker.name} perdeu o elemento Water.`);
                            }
                            break;
                        case "lose_element":
                            if (attacker.elements) {
                                attacker.elements = attacker.elements.filter(e => e !== ef.element);
                                this.log(`🔥 ${attacker.name} perdeu o elemento ${ef.element}.`);
                            }
                            break;
                        case "shuffle_both_attack_decks":
                            [this.p1AttackDeck, this.p2AttackDeck].forEach(deck => {
                                for (let i = deck.length - 1; i > 0; i--) {
                                    const j = Math.floor(Math.random() * (i + 1));
                                    [deck[i], deck[j]] = [deck[j], deck[i]];
                                }
                            });
                            this.log(`🌪️ Tornado Tackle: ambos os decks de ataque foram embaralhados!`);
                            break;
                        case "new_location_lose_element":
                            if (this.locationDeck && this.locationDeck.length > 0) {
                                this.activeLocation = this.locationDeck.pop();
                                this.log(`🌍 Mirthquake: novo local revelado — ${this.activeLocation.name}!`);
                                this.renderLocation();
                            } else {
                                this.log(`🌍 Mirthquake: sem locais no deck para revelar.`);
                            }
                            if (attacker.elements) {
                                attacker.elements = attacker.elements.filter(e => e !== ef.element);
                                this.log(`🪨 ${attacker.name} perdeu o elemento ${ef.element}.`);
                            }
                            break;
                    }
                }
            } else {
                this.log(`❄️ Sem elemento ${atkCard.elementRequirement} — bônus elemental não ativado.`);
            }
        }

        // ─── Efeitos especiais da carta ───────────────────────────────────────
        if (atkCard.specialEffect) {
            const sp = atkCard.specialEffect;
            switch (sp.type) {
                case "hive_call": {
                    const myBoard2 = attackingPlayer === 1 ? this.boardP1 : this.boardP2;
                    let paid = false;
                    outer: for (const row of myBoard2) for (const c of row) {
                        if (c && (c.mugicCounters || 0) > 0) {
                            c.mugicCounters--;
                            paid = true;
                            this.log(`🐜 Hive Call: ${c.name} pagou 1 ♪. Hive ativado!`);
                            break outer;
                        }
                    }
                    if (paid) {
                        [this.boardP1, this.boardP2].forEach(board => {
                            board.forEach(row => row.forEach(c => {
                                if (c && c.tribe === 'Danian') {
                                    c.courage+=5; c.power+=5; c.wisdom+=5; c.speed+=5;
                                }
                            }));
                        });
                        this.log(`🐜 Todos os Danians ganharam +5 em todos os stats!`);
                    } else {
                        this.log(`🐜 Hive Call: nenhuma criatura com ♪ disponível.`);
                    }
                    break;
                }
                case "peek_location_deck": {
                    const top = this.locationDeck ? this.locationDeck.slice(-2).reverse().map(l => l.name).join(', ') : '';
                    this.log(`👁️ Flash Kick: topo do Location Deck — [${top || 'vazio'}]`);
                    break;
                }
                case "peek_attack_deck": {
                    const myDeck = attackingPlayer === 1 ? this.p1AttackDeck : this.p2AttackDeck;
                    const top2 = myDeck.slice(-2).reverse().map(a => a.name).join(', ');
                    this.log(`👁️ Squeeze Play: topo do seu Attack Deck — [${top2 || 'vazio'}]`);
                    break;
                }
                case "reveal_battlegear":
                    this.log(`🔍 Windslash: revelando Battlegear do oponente!`);
                    if (defender.battlegear && !defender.bgRevealed) {
                        defender.bgRevealed = true;
                        this.log(`🔮 ${defender.name} tem [${defender.battlegear.name}]!`);
                    } else if (defender.battlegear) {
                        this.log(`🔮 ${defender.name} já tinha [${defender.battlegear.name}] revelado.`);
                    } else {
                        this.log(`🔮 ${defender.name} não possui Battlegear.`);
                    }
                    break;
                case "no_tribal_mugic_this_attack":
                    this.log(`🚫 Iron Balls: Mugics tribais não podem ser jogadas neste burst!`);
                    this._ironBallsActive = true;
                    break;
                case "destroy_battlegear_on_check": {
                    const stat = sp.checkStat.toLowerCase();
                    const thr  = sp.checkThreshold;
                    const av   = effAtk[stat] || 0;
                    if (av >= thr) {
                        if (defender.battlegear) {
                            const bgName = defender.battlegear.name;
                            if (defender.battlegear.elementGranted && defender.elements) {
                                defender.elements = defender.elements.filter(e => e !== defender.battlegear.elementGranted);
                            }
                            defender.battlegear = null;
                            this.log(`💥 Coil Crush: Battlegear [${bgName}] de ${defender.name} destruído!`);
                        } else {
                            this.log(`💥 Coil Crush: ${defender.name} não tem Battlegear.`);
                        }
                    } else {
                        this.log(`💥 Coil Crush: Stat Check Power 75 falhou (${av} < ${thr}).`);
                    }
                    break;
                }
                case "lucky_shot": {
                    const allLower = ['courage','power','wisdom','speed'].every(s => (effAtk[s]||0) < (effDef[s]||0))
                                    && attacker.energy < defender.energy;
                    if (allLower) {
                        totalDamage += sp.value;
                        this.log(`🍀 Lucky Shot: TODOS os atributos e Energia menores — +${sp.value} dano!`);
                    } else {
                        this.log(`🍀 Lucky Shot: condição não satisfeita (precisa de TUDO menor).`);
                    }
                    break;
                }
                case "megaroar": {
                    ['courage','power','wisdom','speed'].forEach(stat => {
                        const av = effAtk[stat] || 0;
                        if (av >= sp.threshold) {
                            totalDamage += sp.value;
                            this.log(`🦁 Megaroar ${stat.toUpperCase()} (${av} ≥ ${sp.threshold}): +${sp.value} dano!`);
                        } else {
                            this.log(`🦁 Megaroar ${stat.toUpperCase()} falhou (${av} < ${sp.threshold}).`);
                        }
                    });
                    break;
                }
                case "double_challenge": {
                    let allPassed = true;
                    sp.checks.forEach(ck => {
                        const stat = ck.stat.toLowerCase();
                        const passed = checkStat(stat, 'challenge', ck.threshold);
                        logCheck(stat, 'challenge', ck.threshold, passed, passed ? (sp.bonusDamage||0) : 0);
                        if (!passed) allPassed = false;
                    });
                    if (allPassed) {
                        totalDamage += sp.bonusDamage || 0;
                        totalHeal   += sp.bonusHeal   || 0;
                        this.log(`⚡ Telekinetic Bolt: +${sp.bonusDamage} dano e +${sp.bonusHeal} de cura!`);
                    }
                    break;
                }
            }
        }

        // ─── Efeitos passivos do Local ────────────────────────────────────────
        if (this.activeLocation && this.activeLocation.effect) {
            const locEf = this.activeLocation.effect;
            const atkEl = atkCard.elementRequirement;
            const hasEl = atkEl && (attacker.elements||[]).includes(atkEl);

            if (locEf.type === "elemental_modifiers" && atkEl && hasEl) {
                if (locEf.bonuses && locEf.bonuses[atkEl]) {
                    totalDamage += locEf.bonuses[atkEl];
                    this.log(`📍 [${this.activeLocation.name}] Bônus elemental ${atkEl}: +${locEf.bonuses[atkEl]} dano!`);
                }
                if (locEf.penalties && locEf.penalties[atkEl]) {
                    totalDamage = Math.max(0, totalDamage - locEf.penalties[atkEl]);
                    this.log(`📍 [${this.activeLocation.name}] Penalidade elemental ${atkEl}: -${locEf.penalties[atkEl]} dano.`);
                }
            }
            if (locEf.type === "first_attack_tribe_bonus" && this.activeCombat && this.activeCombat.isFirstAttack && attacker.tribe === locEf.tribe) {
                totalDamage += locEf.value;
                this.log(`📍 [${this.activeLocation.name}] ${attacker.tribe} primeiro ataque: +${locEf.value} dano!`);
            }
            if (locEf.type === "first_attack_element_bonus" && this.activeCombat && this.activeCombat.isFirstAttack && (attacker.elements||[]).includes(locEf.element)) {
                totalDamage += locEf.value;
                this.log(`📍 [${this.activeLocation.name}] ${locEf.element} primeiro ataque: +${locEf.value} dano!`);
            }
            if (locEf.type === "first_attack_zero_if_lower_speed" && this.activeCombat && this.activeCombat.isFirstAttack && effAtk.speed < effDef.speed) {
                totalDamage = 0;
                this.log(`📍 [${this.activeLocation.name}] ${attacker.name} tem menos Speed — primeiro ataque causa 0!`);
            }
            if (locEf.type === "underworld_city_bonus" && attacker.tribe === 'UnderWorld' && effAtk.power >= effDef.power + 15) {
                totalDamage += 5;
                this.log(`📍 [${this.activeLocation.name}] UnderWorld Challenge Power 15: +5 dano!`);
            }
            if (locEf.type === "heal_on_water_attack" && atkEl === 'Water' && hasEl && totalDamage > 0) {
                attacker.energy = Math.min(attacker.maxEnergy || attacker.energy + 99, attacker.energy + locEf.value);
                this.log(`📍 [${this.activeLocation.name}] ${attacker.name} curou ${locEf.value} ao causar dano de Água!`);
            }
        }

        // ─── Passivas de defesa e reduções ───────────────────────────────────
        this.applyPassives('damageTaken', defender, attacker);
        if (defender._damageReduction && defender._damageReduction > 0) {
            const red = Math.min(totalDamage, defender._damageReduction);
            totalDamage = Math.max(0, totalDamage - red);
            this.log(`🛡️ ${defender.name} [Resistência]: -${red} de dano!`);
        }
        // Stone Mail: todo dano recebido é aumentado em 5
        if (defender._damagePenalty && defender._damagePenalty > 0) {
            totalDamage += defender._damagePenalty;
            this.log(`⚠️ ${defender.name} [Stone Mail]: +${defender._damagePenalty} de dano recebido!`);
        }

        // Reduções elementais (Cascade Symphony, OverWorld Aria, etc.)
        try {
            const atkElement = atkCard.elementRequirement || null;
            if (atkElement && defender._elementalReductions) {
                let elementalReduction = 0;
                defender._elementalReductions.forEach(r => {
                    if (!r || !r.elements) return;
                    if (r.expiresOnTurn !== this.turn) return;
                    if (r.elements.includes(atkElement)) elementalReduction += (r.amount || 0);
                });
                if (elementalReduction > 0) {
                    totalDamage = Math.max(0, totalDamage - elementalReduction);
                    this.log(`🔰 Redução Elemental: -${elementalReduction} (${atkElement})`);
                }
            }
        } catch(e) { console.error('Erro redução elemental:', e); }

        // Melody of Mirage cancela o ataque
        if (this._cancelNextAttack) {
            this._cancelNextAttack = false;
            totalDamage = 0;
            this.log(`🌫️ Ataque cancelado por Melody of Mirage! 0 de dano.`);
        }

        // ─── Aplicar dano e cura ──────────────────────────────────────────────
        if (this.activeCombat) {
            this.activeCombat.rounds++;
            this.activeCombat.attackHistory.push({ round: this.activeCombat.rounds, attacker: attacker.name, defender: defender.name, attack: atkCard.name, baseDamage: atkCard.baseDamage, totalDamage });
        }

        const energyBefore = defender.energy;
        defender.energy -= totalDamage;

        if (this.activeCombat) {
            this.activeCombat.damageHistory.push({ round: this.activeCombat.rounds, target: defender.name, damage: totalDamage, energyBefore, energyAfter: defender.energy });
        }

        this.log(`💥 ${attacker.name} usou ${atkCard.name} e causou ${totalDamage} de dano a ${defender.name}! (Vida restante: ${Math.max(0, defender.energy)})`);

        // Cura do atacante (Evaporize, Flash Mend, Telekinetic Bolt)
        if (totalHeal > 0) {
            attacker.energy = Math.min(attacker.maxEnergy || attacker.energy + 999, attacker.energy + totalHeal);
            this.log(`💚 ${attacker.name} curou ${totalHeal} de Energia!`);
            if (this.activeCombat) this.activeCombat.healHistory.push({ targetName: attacker.name, amount: totalHeal, source: atkCard.name });
        }

        // Penalidade de Reckless — atacante sofre dano próprio
        if (attacker._recklessPenalty && attacker._recklessPenalty > 0) {
            attacker.energy -= attacker._recklessPenalty;
            this.log(`💢 ${attacker.name} [Reckless]: sofre ${attacker._recklessPenalty} de dano por usar ataque imprudente!`);
            attacker._recklessPenalty = 0;
        }

        this.renderBoard();

        if (defender.energy <= 0) {
            this.log(`💀 ${defender.name} foi derrotado!`);
        }
    }

    async executeMugic(item) {
        const mg = item.mugic;
        const caster = item.caster;
        const sourceName = caster ? caster.name : item.source;
        
        if (!this.activeCombat) {
            this.log(`⚠️ ${mg.name} falhou: Combate já terminou.`);
            return;
        }

        const p1Card = this.activeCombat.p1Card;
        const p2Card = this.activeCombat.p2Card;
        
        // Determina quem é aliado e quem é inimigo baseado em quem jogou o Mugic
        const isPlayer1 = item.source === 'Jogador 1';
        const allyCard = isPlayer1 ? p1Card : p2Card;
        const enemyCard = isPlayer1 ? p2Card : p1Card;

        this.log(`✨ Efeito Mágico: ${mg.name} ativado!`);
        if (this.activeCombat) {
            this.activeCombat.mugicHistory.push({
                player: item.source,
                mugicName: mg.name,
                targetName: caster ? caster.name : '?'
            });
        }
        let alertMsg = `✨ MUGIC RESOLVIDA: ${mg.name}\n\n`;
        let oldVal;

        switch (mg.effectType) {

            // ── CURA ─────────────────────────────────────────────────────────
            case "heal":
                oldVal = allyCard.energy;
                allyCard.energy = Math.min(allyCard.maxEnergy, allyCard.energy + mg.effectValue);
                alertMsg += `Alvo: ${allyCard.name}\nCurou ${mg.effectValue} de Energia! (${oldVal} → ${allyCard.energy})`;
                this.log(`💚 ${allyCard.name} curou ${mg.effectValue} de Energia!`);
                if (this.activeCombat) this.activeCombat.healHistory.push({ targetName: allyCard.name, amount: mg.effectValue, source: mg.name });
                break;

            case "conditional_heal": {
                const hasEl = (allyCard.elements || []).some(e => (mg.conditionElements || []).includes(e));
                if (hasEl) {
                    oldVal = allyCard.energy;
                    allyCard.energy = Math.min(allyCard.maxEnergy, allyCard.energy + mg.effectValue);
                    alertMsg += `Alvo: ${allyCard.name}\nTem o elemento necessário! Curou ${mg.effectValue}. (${oldVal} → ${allyCard.energy})`;
                    this.log(`💚 ${allyCard.name} curou ${mg.effectValue} de Energia!`);
                } else {
                    alertMsg += `Alvo: ${allyCard.name}\nNão possui o elemento necessário (${(mg.conditionElements||[]).join('/')}). Mugic sem efeito.`;
                    this.log(`⚠️ ${mg.name} sem efeito: ${allyCard.name} não tem ${(mg.conditionElements||[]).join('/')}.`);
                }
                break;
            }

            case "heal_and_grant_element": {
                oldVal = allyCard.energy;
                allyCard.energy = Math.min(allyCard.maxEnergy, allyCard.energy + (mg.healValue || 0));
                alertMsg += `Alvo: ${allyCard.name}\nCurou ${mg.healValue} de Energia. Ganhou elemento ${mg.grantElement}!`;
                this.log(`💚 ${allyCard.name} curou ${mg.healValue} de Energia!`);
                if (mg.grantElement && !(allyCard.elements || []).includes(mg.grantElement)) {
                    if (!allyCard.elements) allyCard.elements = [];
                    allyCard.elements.push(mg.grantElement);
                    this.log(`✨ ${allyCard.name} ganhou o elemento ${mg.grantElement}!`);
                }
                break;
            }

            case "heal_and_reduce_fire": {
                // OverWorld Aria: cura aliada OverWorld + reduz dano de Fire
                const target = (allyCard.tribe === 'OverWorld') ? allyCard : null;
                if (target) {
                    oldVal = target.energy;
                    target.energy = Math.min(target.maxEnergy, target.energy + (mg.healValue || 10));
                    if (!target._elementalReductions) target._elementalReductions = [];
                    target._elementalReductions.push({ elements: ['Fire'], amount: mg.reductionValue || 5, expiresOnTurn: this.turn });
                    alertMsg += `Alvo: ${target.name}\nCurou ${mg.healValue} de Energia. Dano de Fogo reduzido em ${mg.reductionValue} até o fim do turno.`;
                    this.log(`💚 ${target.name} curou ${mg.healValue} e ficou resistente a Fogo!`);
                } else {
                    alertMsg += `Alvo deve ser uma criatura OverWorld aliada. Sem efeito.`;
                    this.log(`⚠️ ${mg.name}: nenhuma criatura OverWorld aliada engajada.`);
                }
                break;
            }

            // ── DANO ─────────────────────────────────────────────────────────
            case "damage":
                oldVal = enemyCard.energy;
                enemyCard.energy -= mg.effectValue;
                alertMsg += `Alvo: ${enemyCard.name}\nSofreu ${mg.effectValue} de dano mágico! (${oldVal} → ${Math.max(0,enemyCard.energy)})`;
                this.log(`💥 ${mg.name} causou ${mg.effectValue} de dano a ${enemyCard.name}!`);
                if (enemyCard.energy <= 0) this.log(`💀 ${enemyCard.name} foi destruído pelo Mugic!`);
                break;

            case "damage_if_element": {
                const req = mg.requireElements || [];
                const hasReq = (enemyCard.elements || []).some(e => req.includes(e));
                if (hasReq) {
                    oldVal = enemyCard.energy;
                    enemyCard.energy -= mg.effectValue;
                    alertMsg += `Alvo: ${enemyCard.name}\nPossui ${req.join('/')} — sofreu ${mg.effectValue} de dano! (${oldVal} → ${Math.max(0,enemyCard.energy)})`;
                    this.log(`💥 ${mg.name} causou ${mg.effectValue} de dano a ${enemyCard.name}!`);
                } else {
                    alertMsg += `Alvo: ${enemyCard.name}\nNão possui ${req.join('/')}. Mugic sem efeito.`;
                    this.log(`⚠️ ${mg.name}: ${enemyCard.name} não tem ${req.join('/')}.`);
                }
                break;
            }

            case "damage_and_grant_element": {
                // Song of Fury: dano no inimigo + grant elemento em outra criatura (aliada engajada)
                oldVal = enemyCard.energy;
                enemyCard.energy -= mg.effectValue;
                alertMsg += `Alvo: ${enemyCard.name}\nSofreu ${mg.effectValue} de dano!`;
                this.log(`💥 ${mg.name} causou ${mg.effectValue} de dano a ${enemyCard.name}!`);
                if (mg.grantElement && !(allyCard.elements || []).includes(mg.grantElement)) {
                    if (!allyCard.elements) allyCard.elements = [];
                    allyCard.elements.push(mg.grantElement);
                    alertMsg += `\n${allyCard.name} ganhou o elemento ${mg.grantElement}!`;
                    this.log(`✨ ${allyCard.name} ganhou o elemento ${mg.grantElement}!`);
                }
                break;
            }

            // ── BUFFS ─────────────────────────────────────────────────────────
            case "buff_all_stats":
                // Fortissimo: +5 Courage, Power, Wisdom, Speed, Energy
                allyCard.courage += mg.effectValue;
                allyCard.power   += mg.effectValue;
                allyCard.wisdom  += mg.effectValue;
                allyCard.speed   += mg.effectValue;
                allyCard.energy  = Math.min(allyCard.maxEnergy, allyCard.energy + mg.effectValue);
                alertMsg += `Alvo: ${allyCard.name}\n+${mg.effectValue} em Courage, Power, Wisdom, Speed e Energia!`;
                this.log(`💫 ${allyCard.name} ganhou +${mg.effectValue} em todos os atributos!`);
                break;

            case "buff_combat_stats":
                // Song of Focus: +10 Courage, Power, Wisdom, Speed (sem Energy)
                allyCard.courage += mg.effectValue;
                allyCard.power   += mg.effectValue;
                allyCard.wisdom  += mg.effectValue;
                allyCard.speed   += mg.effectValue;
                alertMsg += `Alvo: ${allyCard.name}\n+${mg.effectValue} em Courage, Power, Wisdom e Speed!`;
                this.log(`⚡ ${allyCard.name} ganhou +${mg.effectValue} em todos os stats de combate!`);
                break;

            case "debuff_all_stats":
                // Song of Treachery: -15 em todos os stats de combate
                enemyCard.courage = Math.max(0, enemyCard.courage - mg.effectValue);
                enemyCard.power   = Math.max(0, enemyCard.power   - mg.effectValue);
                enemyCard.wisdom  = Math.max(0, enemyCard.wisdom  - mg.effectValue);
                enemyCard.speed   = Math.max(0, enemyCard.speed   - mg.effectValue);
                alertMsg += `Alvo: ${enemyCard.name}\n-${mg.effectValue} em Courage, Power, Wisdom e Speed!`;
                this.log(`📉 ${enemyCard.name} perdeu ${mg.effectValue} em todos os stats!`);
                break;

            case "buff_per_danian": {
                // Song of Mandiblor: +5 por criatura Danian aliada em campo
                let danianCount = 0;
                const myBoard = isPlayer1 ? this.boardP1 : this.boardP2;
                for (const row of myBoard) for (const c of row) if (c && c.tribe === 'Danian') danianCount++;
                const bonus = mg.effectValue * danianCount;
                if (bonus > 0) {
                    allyCard.courage += bonus; allyCard.power += bonus;
                    allyCard.wisdom  += bonus; allyCard.speed += bonus;
                    alertMsg += `Alvo: ${allyCard.name}\n${danianCount} Danians em campo → +${bonus} em todos os stats!`;
                    this.log(`🐜 ${allyCard.name} ganhou +${bonus} em todos os stats (${danianCount} Danians)!`);
                } else {
                    alertMsg += `Nenhuma criatura Danian aliada em campo. Sem efeito.`;
                    this.log(`⚠️ ${mg.name}: nenhum Danian aliado em campo.`);
                }
                break;
            }

            // ── ELEMENTOS ────────────────────────────────────────────────────
            case "grant_element_choice": {
                // Hymn of the Elements: prompt para escolher elemento
                const elements = ['Fire','Water','Earth','Air'];
                const icons = { Fire:'🔥', Water:'💧', Earth:'🪨', Air:'🌪️' };
                const chosenEl = await new Promise(resolve => {
                    const modal = document.createElement('div');
                    modal.className = 'modal-overlay flex-modal';
                    modal.innerHTML = `<div style="background:#1e293b;border:2px solid #f1c40f;border-radius:12px;padding:25px;width:380px;color:white;text-align:center;">
                        <h2 style="color:#f1c40f;margin-bottom:15px;">Hymn of the Elements</h2>
                        <p>Escolha o elemento para ${allyCard.name}:</p>
                        <div style="display:flex;gap:10px;justify-content:center;margin-top:15px;">
                            ${elements.map(e=>`<button onclick="this.closest('.modal-overlay').resolve('${e}')" style="background:#2c3e50;border:2px solid #7f8c8d;border-radius:8px;padding:12px 18px;color:white;cursor:pointer;font-size:18px;" title="${e}">${icons[e]}<br><small>${e}</small></button>`).join('')}
                        </div></div>`;
                    modal._resolveEl = resolve;
                    modal.querySelectorAll('button').forEach(btn => {
                        btn.onclick = () => { resolve(btn.title); modal.remove(); };
                    });
                    document.body.appendChild(modal);
                });
                if (chosenEl && !(allyCard.elements||[]).includes(chosenEl)) {
                    if (!allyCard.elements) allyCard.elements = [];
                    allyCard.elements.push(chosenEl);
                }
                alertMsg += `Alvo: ${allyCard.name}\nGanhou o elemento ${chosenEl}!`;
                this.log(`✨ ${allyCard.name} ganhou o elemento ${chosenEl}!`);
                break;
            }

            case "grant_elements": {
                // Song of Asperity: Fire 5 + Air 5
                const toGrant = mg.grantElements || [];
                const granted = [];
                toGrant.forEach(el => {
                    if (!(allyCard.elements||[]).includes(el)) {
                        if (!allyCard.elements) allyCard.elements = [];
                        allyCard.elements.push(el);
                        granted.push(el);
                    }
                });
                alertMsg += `Alvo: ${allyCard.name}\nGanhou os elementos: ${toGrant.join(', ')}!`;
                this.log(`✨ ${allyCard.name} ganhou ${toGrant.join(' e ')}!`);
                break;
            }

            // ── TRANSFERÊNCIA DE ENERGIA ──────────────────────────────────────
            case "energy_steal":
                // Melody of Malady: aliado +10 energia, inimigo -5
                allyCard.energy = Math.min(allyCard.maxEnergy, allyCard.energy + (mg.gainValue||0));
                enemyCard.energy -= (mg.lossValue||0);
                alertMsg += `${allyCard.name} ganhou ${mg.gainValue} de Energia.\n${enemyCard.name} perdeu ${mg.lossValue} de Energia.`;
                this.log(`🔄 Energia transferida: +${mg.gainValue} para ${allyCard.name}, -${mg.lossValue} para ${enemyCard.name}.`);
                break;

            case "energy_transfer":
                // Song of Symmetry: aliado +10, inimigo -10
                allyCard.energy = Math.min(allyCard.maxEnergy, allyCard.energy + (mg.gainValue||0));
                enemyCard.energy -= (mg.lossValue||0);
                alertMsg += `${allyCard.name} ganhou ${mg.gainValue} de Energia.\n${enemyCard.name} perdeu ${mg.lossValue} de Energia.`;
                this.log(`🔄 Simetria de Energia: +${mg.gainValue}/${allyCard.name}, -${mg.lossValue}/${enemyCard.name}.`);
                break;

            // ── REDUÇÃO DE DANO ───────────────────────────────────────────────
            case "reduce_elemental_damage":
                if (!allyCard._elementalReductions) allyCard._elementalReductions = [];
                allyCard._elementalReductions.push({ elements: mg.effectElements||[], amount: mg.effectValue, expiresOnTurn: this.turn });
                alertMsg += `Alvo: ${allyCard.name}\nDano de ${(mg.effectElements||[]).join('/')} reduzido em ${mg.effectValue} até fim do turno.`;
                this.log(`🔰 ${allyCard.name}: dano de ${(mg.effectElements||[]).join('/')} reduzido em ${mg.effectValue}!`);
                break;

            case "damage_reduction_aura":
                // Song of Resistance: o caster recebe -5 em todo dano até fim do combate
                if (!allyCard._damageReduction) allyCard._damageReduction = 0;
                allyCard._damageReduction += mg.effectValue;
                alertMsg += `Alvo: ${allyCard.name}\nReceberá -${mg.effectValue} de dano em todos os ataques até fim do combate.`;
                this.log(`🛡️ ${allyCard.name} ganhou redução de ${mg.effectValue} de dano!`);
                break;

            // ── CANCEL / CONTROLE ─────────────────────────────────────────────
            case "cancel_attack":
                // Melody of Mirage: cancela o próximo ataque na pilha de burst
                this._cancelNextAttack = true;
                alertMsg += `O próximo ataque na pilha causará 0 de dano!`;
                this.log(`🌫️ Melody of Mirage: o próximo ataque causará 0 de dano!`);
                break;

            case "destroy_battlegear":
                if (enemyCard.battlegear) {
                    const bgName = enemyCard.battlegear.name;
                    // Remove elemento concedido pelo BG se houver
                    if (enemyCard.battlegear.elementGranted && enemyCard.elements) {
                        const idx = enemyCard.elements.indexOf(enemyCard.battlegear.elementGranted);
                        if (idx >= 0) enemyCard.elements.splice(idx, 1);
                    }
                    enemyCard.battlegear = null;
                    alertMsg += `Alvo: ${enemyCard.name}\nBattlegear [${bgName}] foi destruído!`;
                    this.log(`💥 Battlegear [${bgName}] de ${enemyCard.name} foi destruído!`);
                } else {
                    alertMsg += `${enemyCard.name} não possui Battlegear.`;
                    this.log(`⚠️ ${enemyCard.name} não possui Battlegear equipado.`);
                }
                break;

            case "disable_location":
                if (this.activeLocation) {
                    const locName = this.activeLocation.name;
                    this.activeLocation = { ...this.activeLocation, modifiers: {}, initiative: 'speed', description: '(Habilidades removidas por Notes of Neverwhere)' };
                    alertMsg += `Local [${locName}] perdeu todas as habilidades!`;
                    this.log(`🚫 Notes of Neverwhere: [${locName}] perdeu todos os efeitos!`);
                    this.renderLocation();
                } else {
                    alertMsg += `Nenhum local ativo.`;
                }
                break;

            case "prevent_movement":
                allyCard._cannotMove = true;
                alertMsg += `Alvo: ${allyCard.name}\nNão pode se mover neste turno.`;
                this.log(`🧊 ${allyCard.name} está imóvel até o fim do turno!`);
                break;

            case "grant_invisibility":
                allyCard._invisibility = { strikeBonus: mg.strikeValue || 15 };
                allyCard._invisibilityTurn = this.turn; // expira no próximo turno
                alertMsg += `Alvo: ${allyCard.name}\nGanhou Invisibility: Strike ${mg.strikeValue||15}!`;
                this.log(`👻 ${allyCard.name} ganhou Invisibility: Strike ${mg.strikeValue||15}! (dura até o próximo turno)`);
                break;

            case "remove_invisibility":
                if (enemyCard._invisibility) {
                    enemyCard._invisibility = null;
                    alertMsg += `Alvo: ${enemyCard.name}\nInvisibility removida!`;
                    this.log(`👁️ ${enemyCard.name} perdeu a Invisibility!`);
                } else {
                    alertMsg += `${enemyCard.name} não possui Invisibility.`;
                }
                break;

            case "remove_abilities":
                enemyCard._abilitiesRemoved = true;
                enemyCard._savedPassives = enemyCard.passives;
                enemyCard.passives = [];
                alertMsg += `Alvo: ${enemyCard.name}\nPerdeu todas as habilidades até o fim do combate!`;
                this.log(`🔇 ${enemyCard.name} perdeu todas as habilidades!`);
                break;

            case "activate_hive": {
                // Chorus of the Hive: +5 em todos stats para cada Danian aliado
                const myBoardH = isPlayer1 ? this.boardP1 : this.boardP2;
                let buffed = 0;
                for (const row of myBoardH) for (const card of row) {
                    if (card && card.tribe === 'Danian') {
                        card.courage += 5; card.power += 5; card.wisdom += 5; card.speed += 5;
                        buffed++;
                    }
                }
                alertMsg += `Hive ativado! ${buffed} criatura(s) Danian ganharam +5 em todos os stats!`;
                this.log(`🐜 Hive ativado: ${buffed} Danians ganharam +5 em todos os stats!`);
                break;
            }

            case "grant_range_swift":
                allyCard._hasRange = true;
                allyCard._swiftValue = mg.effectValue || 1;
                alertMsg += `Alvo: ${allyCard.name}\nGanhou Range e Swift ${mg.effectValue}!`;
                this.log(`🏃 ${allyCard.name} ganhou Range e Swift ${mg.effectValue}!`);
                break;

            case "shuffle_deck":
                // Embaralha o deck de ataque do oponente
                for (let i = this.p2AttackDeck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [this.p2AttackDeck[i], this.p2AttackDeck[j]] = [this.p2AttackDeck[j], this.p2AttackDeck[i]];
                }
                alertMsg += `O Attack Deck do oponente foi embaralhado!`;
                this.log(`🔀 Interlude of Consequence: deck do oponente embaralhado!`);
                break;

            case "peek_deck": {
                const deck = isPlayer1 ? this.p2AttackDeck : this.p1AttackDeck;
                const top = deck.slice(-mg.effectValue).reverse();
                const names = top.map(c => c.name).join(', ') || '(vazio)';
                alertMsg += `Topo do deck adversário:\n${names}`;
                this.log(`🔍 Song of Futuresight: topo do deck do oponente → ${names}`);
                break;
            }

            case "negate_mugic": {
                // Procura na pilha (de cima para baixo) a próxima mugic que passa no filtro
                const filter = mg.negateFilter; // "any" | string | string[]
                const matchesTribe = (tribe) => {
                    if (filter === "any") return true;
                    if (Array.isArray(filter)) return filter.includes(tribe);
                    return filter === tribe;
                };

                // burstStack[0] = fundo, burstStack[length-1] = topo
                // Procuramos de cima (último) para baixo, pulando itens já negados
                let targetIdx = -1;
                for (let i = this.burstStack.length - 1; i >= 0; i--) {
                    const candidate = this.burstStack[i];
                    if (candidate.type === 'mugic' && !candidate.negated && matchesTribe(candidate.mugic.tribe)) {
                        targetIdx = i;
                        break;
                    }
                }

                if (targetIdx === -1) {
                    alertMsg += `❌ Nenhuma Mugic válida na pilha para negar.`;
                    this.log(`❌ ${mg.name}: nenhum alvo válido na pilha.`);
                } else {
                    const target = this.burstStack[targetIdx];
                    target.negated = true;
                    alertMsg += `❌ [${target.mugic.name}] foi negada por ${mg.name}!`;
                    this.log(`❌ ${mg.name} negou [${target.mugic.name}]! Ela não terá efeito.`);
                    // Atualiza descrição visual na pilha
                    target.description = `[NEGADA] ${target.description}`;
                }
                break;
            }

            case "retarget_mugic":
                alertMsg += `(Song of Deflection: mecânica de redirecionamento de alvo — sem efeito automático neste turno.)`;
                this.log(`↩️ Song of Deflection: nenhum alvo redirecionado.`);
                break;

            case "return_mugic": {
                // Retorna a última Mugic do discard do lançador para a mão
                const disc = isPlayer1 ? this.p1MugicDiscard : this.p2MugicDiscard;
                const hand = isPlayer1 ? this.playerMugics : this.p2Mugics;
                if (disc.length === 0) {
                    alertMsg += `Descarte de Mugics vazio — sem efeito.`;
                    this.log(`♻️ Mugic Reprise: descarte vazio.`);
                } else {
                    const recovered = disc.pop();
                    hand.push(recovered);
                    alertMsg += `♻️ [${recovered.name}] retornou do descarte para a mão!`;
                    this.log(`♻️ Mugic Reprise: [${recovered.name}] voltou para a mão do Jogador ${isPlayer1 ? 1 : 2}!`);
                    this.renderMugics();
                }
                break;
            }

            case "revive_creature": {
                // Retorna a última criatura UnderWorld destruída do lançador para um slot vazio
                const crDisc = isPlayer1 ? this.p1CreatureDiscard : this.p2CreatureDiscard;
                const board  = isPlayer1 ? this.boardP1 : this.boardP2;
                // Filtra apenas UnderWorld
                const uwIdx = [...crDisc].map((c,i) => ({c,i})).reverse().find(({c}) => c.tribe === 'UnderWorld');
                if (!uwIdx) {
                    alertMsg += `Nenhuma criatura UnderWorld no descarte.`;
                    this.log(`💀 Song of Revival: descarte UnderWorld vazio.`);
                } else {
                    // Encontra um slot vazio no board
                    let placed = false;
                    outer: for (let r = 0; r < board.length; r++) {
                        for (let col = 0; col < board[r].length; col++) {
                            if (!board[r][col]) {
                                const revived = crDisc.splice(uwIdx.i, 1)[0];
                                revived.energy = Math.ceil(revived.maxEnergy * 0.5); // Volta com 50% de vida
                                board[r][col] = revived;
                                placed = true;
                                alertMsg += `💀 [${revived.name}] foi ressuscitado com ${revived.energy} de Energia!`;
                                this.log(`💀 Song of Revival: [${revived.name}] voltou ao campo com ${revived.energy} Energia!`);
                                this.renderBoard();
                                break outer;
                            }
                        }
                    }
                    if (!placed) {
                        alertMsg += `Sem espaço no tabuleiro para ressuscitar.`;
                        this.log(`💀 Song of Revival: sem slot vazio no tabuleiro.`);
                    }
                }
                break;
            }

            default:
                alertMsg += `Efeito "${mg.effectType}" de ${mg.name} não possui implementação.`;
                this.log(`❓ Efeito ${mg.effectType} de ${mg.name} ainda não implementado.`);
                break;
        }
        
        // Alerta na tela para dar feedback super visual do que aconteceu
        await this.showAlert(`✨ ${mg.name}`, alertMsg.replace(`✨ MUGIC RESOLVIDA: ${mg.name}\n\n`, ''));
        
        this.renderBoard();
    }

    _showCombatSummary(combat, loserCard, winnerCard) {
        const modal = document.getElementById('combat-summary-modal');
        if (!modal) return;

        const p1 = combat.p1Card;
        const p2 = combat.p2Card;

        // Calcular totais de dano por criatura
        const dmgBy = {};
        combat.damageHistory.forEach(({ target, damage }) => {
            // damage dealt TO target means it was dealt BY the other side
            dmgBy[target] = (dmgBy[target] || 0) + damage;
        });

        const totalDmgOnP1 = dmgBy[p1.name] || 0;
        const totalDmgOnP2 = dmgBy[p2.name] || 0;

        const isP1Winner = winnerCard === p1;
        const winnerLabel = isP1Winner ? 'Jogador 1' : 'Jogador 2';
        const loserLabel  = isP1Winner ? 'Jogador 2' : 'Jogador 1';

        // Header
        document.getElementById('cs-winner-name').textContent = winnerCard.name;
        document.getElementById('cs-loser-name').textContent  = loserCard.name;
        document.getElementById('cs-winner-label').textContent = winnerLabel;
        document.getElementById('cs-loser-label').textContent  = loserLabel;
        document.getElementById('cs-winner-img').src = winnerCard.image || '';
        document.getElementById('cs-loser-img').src  = loserCard.image || '';
        document.getElementById('cs-rounds').textContent = combat.rounds;

        // Dano total
        const dmgOnWinner = isP1Winner ? totalDmgOnP1 : totalDmgOnP2;
        const dmgOnLoser  = isP1Winner ? totalDmgOnP2 : totalDmgOnP1;
        document.getElementById('cs-dmg-winner').textContent = dmgOnWinner;
        document.getElementById('cs-dmg-loser').textContent  = dmgOnLoser;

        // Linha do tempo de ataques
        const timeline = document.getElementById('cs-timeline');
        let tlHtml = '';
        combat.attackHistory.forEach(({ round, attacker, attack, totalDamage }) => {
            const isWinner = attacker === winnerCard.name;
            const color = isWinner ? '#22c55e' : '#ef4444';
            const side  = isWinner ? '⚔️' : '🛡️';
            tlHtml += `
                <div class="cs-tl-row">
                    <span class="cs-tl-round">#${round}</span>
                    <span class="cs-tl-icon">${side}</span>
                    <span class="cs-tl-name" style="color:${color}">${attacker}</span>
                    <span class="cs-tl-arrow">→</span>
                    <span class="cs-tl-attack">${attack}</span>
                    <span class="cs-tl-dmg" style="color:${totalDamage>0?'#fbbf24':'#94a3b8'}">${totalDamage > 0 ? `💥 ${totalDamage}` : '0'}</span>
                </div>`;
        });
        timeline.innerHTML = tlHtml || '<span style="color:#64748b;font-size:12px">Nenhum ataque registrado.</span>';

        // Mugics usadas
        const mugicList = document.getElementById('cs-mugics');
        let mgHtml = '';
        combat.mugicHistory.forEach(({ player, mugicName, targetName }) => {
            mgHtml += `<div class="cs-mg-row"><span class="cs-mg-player">${player}</span><span class="cs-mg-name">🎶 ${mugicName}</span><span class="cs-mg-target">→ ${targetName}</span></div>`;
        });
        mugicList.innerHTML = mgHtml || '<span style="color:#64748b;font-size:12px">Nenhuma mugic usada.</span>';

        // Curas
        const healList = document.getElementById('cs-heals');
        let healHtml = '';
        combat.healHistory.forEach(({ targetName, amount, source }) => {
            healHtml += `<div class="cs-heal-row"><span style="color:#4ade80">💚 +${amount}</span> <span style="color:#94a3b8">${targetName}</span> <span style="color:#475569;font-size:10px">via ${source}</span></div>`;
        });
        healList.innerHTML = healHtml || '<span style="color:#64748b;font-size:12px">Nenhuma cura.</span>';

        modal.classList.remove('hidden');
        modal.classList.add('flex-modal');
        setTimeout(() => modal.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    }

    endCombatTurn() {
        if (!this.activeCombat) return;
        const { p1Card, p2Card, p1R, p1C, p2R, p2C } = this.activeCombat;

        // Cleanup
        if (p1Card.energy <= 0) {
            const combatSnapshot = { ...this.activeCombat, attackHistory: [...this.activeCombat.attackHistory], damageHistory: [...this.activeCombat.damageHistory], mugicHistory: [...this.activeCombat.mugicHistory], healHistory: [...this.activeCombat.healHistory] };
            this._discardCreature(p1Card);
            this.boardP1[p1R][p1C] = null;
            this.activeCombat = null;
            this.selectedAttacker = null;

            // Renova o local para o próximo combate
            if (this.locationDeck.length > 0) {
                this.activeLocation = this.locationDeck.pop();
                this.log(`📍 Novo Local Revelado para a próxima batalha: ${this.activeLocation.name}!`);
                this.renderLocation();
                this.showLocationToast(this.activeLocation, true);
            }

            this.renderBoard();
            this.log("Fim do Combate! A carta do Jogador 1 foi destruída.");
            this._showCombatSummary(combatSnapshot, p1Card, p2Card);
            if (this.checkWinCondition()) return;
            setTimeout(() => this.nextTurn(), 1500);
            return;
        }
        if (p2Card.energy <= 0) {
            const combatSnapshot = { ...this.activeCombat, attackHistory: [...this.activeCombat.attackHistory], damageHistory: [...this.activeCombat.damageHistory], mugicHistory: [...this.activeCombat.mugicHistory], healHistory: [...this.activeCombat.healHistory] };
            this._discardCreature(p2Card);
            this.boardP2[p2R][p2C] = null;
            this.activeCombat = null;
            this.selectedAttacker = null;

            // Renova o local para o próximo combate
            if (this.locationDeck.length > 0) {
                this.activeLocation = this.locationDeck.pop();
                this.log(`📍 Novo Local Revelado para a próxima batalha: ${this.activeLocation.name}!`);
                this.renderLocation();
                this.showLocationToast(this.activeLocation, true);
            }

            this.renderBoard();
            this.log("Fim do Combate! A carta do Jogador 2 foi destruída.");
            this._showCombatSummary(combatSnapshot, p2Card, p1Card);
            if (this.checkWinCondition()) return;
            setTimeout(() => this.nextTurn(), 1500);
            return;
        }

        this.activeCombat.isFirstAttack = false;
        this.activeCombat.currentStriker = this.activeCombat.currentStriker === 1 ? 2 : 1;
        this.log(`Próximo turno (Strike): Jogador ${this.activeCombat.currentStriker} ataca!`);
        
        setTimeout(() => {
            this.processCombatTurn();
        }, 1000);
    }

    cancelAttackModal() {
        const modal = document.getElementById("attack-modal");
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex-modal');
        }
        this.selectedAttacker = null;
        this.gameState = 'IDLE';
        this.activeCombat = null;
        
        // Mantém o Local ativo intacto para quando o ataque real ocorrer

        this.renderBoard();
        this.log("Ataque cancelado.");
    }

    resolveAttack(attacker, defender, atkR, atkC, defR, defC, attackingPlayer, attackCardIndex) {
        if (this.activeCombat) {
            this.activeCombat.isFirstAttack = false;
        }
        const atkSyn = this.getSynergyBonus(attackingPlayer, atkR, atkC);
        const defSyn = this.getSynergyBonus(attackingPlayer === 1 ? 2 : 1, defR, defC);
        const locMod = this.activeLocation && this.activeLocation.modifiers ? this.activeLocation.modifiers : { courage: 0, power: 0, wisdom: 0, speed: 0 };
        const atkBgMod = attacker.bgRevealed && attacker.battlegear && attacker.battlegear.modifiers ? attacker.battlegear.modifiers : { courage: 0, power: 0, wisdom: 0, speed: 0 };
        const defBgMod = defender.bgRevealed && defender.battlegear && defender.battlegear.modifiers ? defender.battlegear.modifiers : { courage: 0, power: 0, wisdom: 0, speed: 0 };

        const effAtk = {
            courage: attacker.courage + (atkSyn ? atkSyn.courage : 0) + (locMod.courage || 0) + (atkBgMod.courage || 0),
            power: attacker.power + (atkSyn ? atkSyn.power : 0) + (locMod.power || 0) + (atkBgMod.power || 0),
            wisdom: attacker.wisdom + (atkSyn ? atkSyn.wisdom : 0) + (locMod.wisdom || 0) + (atkBgMod.wisdom || 0),
            speed: attacker.speed + (atkSyn ? atkSyn.speed : 0) + (locMod.speed || 0) + (atkBgMod.speed || 0)
        };
        const effDef = {
            courage: defender.courage + (defSyn ? defSyn.courage : 0) + (locMod.courage || 0) + (defBgMod.courage || 0),
            power: defender.power + (defSyn ? defSyn.power : 0) + (locMod.power || 0) + (defBgMod.power || 0),
            wisdom: defender.wisdom + (defSyn ? defSyn.wisdom : 0) + (locMod.wisdom || 0) + (defBgMod.wisdom || 0),
            speed: defender.speed + (defSyn ? defSyn.speed : 0) + (locMod.speed || 0) + (defBgMod.speed || 0)
        };

        const atkHand = attackingPlayer === 1 ? this.p1AttackHand : this.p2AttackHand;
        const atkDeck = attackingPlayer === 1 ? this.p1AttackDeck : this.p2AttackDeck;
        
        let attackCard = null;
        if (atkHand.length > 0 && attackCardIndex !== undefined) {
            attackCard = atkHand[attackCardIndex];
            atkHand.splice(attackCardIndex, 1);
            if (atkDeck.length > 0) atkHand.push(atkDeck.pop());
        } else if (atkHand.length > 0) {
            // IA escolhe a carta de ataque com maior dano esperado
            let bestIndex = 0;
            let bestScore = -Infinity;
            atkHand.forEach((card, idx) => {
                let score = card.baseDamage || 0;
                if (card.statRequirement) {
                    const statKey = card.statRequirement.toLowerCase();
                    const atkVal = effAtk[statKey] || 0;
                    const defVal = effDef[statKey] || 0;
                    if (atkVal > defVal) score += card.statDamage || 0;
                }
                if (card.elementRequirement) {
                    const hasElement = attacker.elements && attacker.elements.includes(card.elementRequirement);
                    if (hasElement) score += card.elementDamage || 0;
                }
                score += (card.baseDamage || 0) * 0.1; // leve preferência por maior base
                if (score > bestScore) {
                    bestScore = score;
                    bestIndex = idx;
                }
            });
            attackCard = atkHand[bestIndex];
            atkHand.splice(bestIndex, 1);
            if (atkDeck.length > 0) atkHand.push(atkDeck.pop());
        } else {
            attackCard = { name: "Ataque Básico", baseDamage: 10, statRequirement: "courage", statDamage: 5, elementRequirement: null, elementDamage: 0 };
        }
        
        let damage = attackCard.baseDamage;
        const pAtk = attackingPlayer === 1 ? "Você" : "Oponente";
        this.log(`⚔️ ${pAtk} usou o ataque [${attackCard.name}]! (Dano Base: ${damage})`);
        
        if (attackCard.statRequirement) {
            const statKey = attackCard.statRequirement.toLowerCase();
            const atkVal = effAtk[statKey] || 0;
            const defVal = effDef[statKey] || 0;
            
            if (atkVal > defVal) {
                damage += attackCard.statDamage;
                this.log(`🔥 CHECK DE ATRIBUTO: ${atkVal} ${statKey.toUpperCase()} supera ${defVal}. Bônus: +${attackCard.statDamage} dano!`);
            } else {
                this.log(`🛡️ CHECK FALHOU: ${atkVal} ${statKey.toUpperCase()} não supera ${defVal}.`);
            }
        }
        
        if (attackCard.elementRequirement) {
            const hasElement = attacker.elements && attacker.elements.includes(attackCard.elementRequirement);
            if (hasElement) {
                damage += attackCard.elementDamage;
                this.log(`🌋 DOMÍNIO ELEMENTAL! Bônus de ${attackCard.elementRequirement}: +${attackCard.elementDamage} dano!`);
            } else {
                this.log(`❄️ O ataque exigia o elemento ${attackCard.elementRequirement}, mas ${attacker.name} não o possui.`);
            }
        }
        
        defender.energy -= damage;
        const targetBoard = attackingPlayer === 1 ? this.boardP2 : this.boardP1;

        // Configura animação de combate para renderização
        this.combatAnimationState = {
            attacker: { player: attackingPlayer, r: atkR, c: atkC },
            defender: { player: attackingPlayer === 1 ? 2 : 1, r: defR, c: defC },
            damageDealt: true,
            destroyed: defender.energy <= 0
        };

        this.log(`💥 ${attacker.name} causou ${damage} de dano a ${defender.name}. Vida restante: ${Math.max(0, defender.energy)}`);
        
        if (defender.energy <= 0) {
            this.log(`💀 ${defender.name} foi destruído! O combate terminou.`);
            
            attacker.energy = attacker.maxEnergy;
            this.log(`✨ ${attacker.name} venceu o combate e recuperou toda a sua energia!`);
            
            this.renderBoard();

            setTimeout(() => {
                targetBoard[defR][defC] = null; // Retira do tabuleiro após animação
                this.activeCombat = null;
                this.pendingCombat = null;
                this.selectedAttacker = null;
                this.gameState = 'IDLE';
                this.combatAnimationState = null;
                this.renderBoard();
            }, 800);
            
            if (this.turn === 1) {
                setTimeout(() => this.nextTurn(), 1500);
            } else {
                setTimeout(() => this.nextTurn(), 1500); // P2 encerrou turno com abate
            }
        } else {
            // Combate continua, troca o turno do striker
            if (this.activeCombat) {
                this.activeCombat.currentStriker = attackingPlayer === 1 ? 2 : 1;
                this.renderBoard();
                setTimeout(() => {
                    this.combatAnimationState = null;
                    this.renderBoard();
                }, 800);
                setTimeout(() => this.processCombatTurn(), 1000);
            }
        }
    }

    resolveMove(player, fromR, fromC, toR, toC, fromRemote = false) {
        const board = player === 1 ? this.boardP1 : this.boardP2;
        const card = board[fromR][fromC];

        // Realiza o movimento na matriz
        board[toR][toC] = card;
        board[fromR][fromC] = null;

        this.log(`🚶‍♂️ ${card.name} se moveu para uma nova posição estratégica!`);

        if (!fromRemote) {
            this.sendAction('move', { player, fromR, fromC, toR, toC });
        }

        if (!fromRemote) {
            this.selectedAttacker = null;
            this.gameState = 'IDLE';
            this.renderBoard();
            setTimeout(() => this.nextTurn(), 1000);
        } else {
            this.selectedAttacker = null;
            this.gameState = 'IDLE';
            this.renderBoard();
            // nextTurn virá via socket do outro jogador
        }
    }

    renderBoard() {
        // Cabeçalho adaptativo baseado no estado
        let msgEstado = this.turn === 1 ? 'Sua vez de jogar. Clique em uma carta.' : 'Aguarde o movimento do Oponente...';
        if (this.gameState === 'SELECT_TARGET') msgEstado = 'ESCOLHA O ALVO INIMIGO!';
        if (this.gameState === 'SELECT_MUGIC_CASTER') msgEstado = 'QUEM VAI PAGAR O CUSTO DA MÁGICA? CLIQUE EM UMA DE SUAS CRIATURAS. <button onclick="game.cancelMugicCaster()" style="margin-left: 10px; padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8em; font-family: Inter, sans-serif;">Cancelar Escolha</button>';
        
        this.boardElement.innerHTML = `<div style="width: 100%; text-align: center; margin-bottom: 20px;">
            <h3 style="color: var(--accent); margin-bottom: 5px;">Turno Atual: Jogador ${this.turn}</h3>
            <p style="color: ${this.gameState === 'SELECT_TARGET' || this.gameState === 'SELECT_MUGIC_CASTER' ? 'var(--danger)' : 'var(--text-muted)'}; font-weight: bold; font-size: 1.1em;">${msgEstado}</p>
        </div>`;
        
        const renderPlayerBoard = (board, player) => {
            let html = `<div style="display: flex; flex-direction: row; gap: 10px; align-items: center; justify-content: center;">`;
            // Para P1 (Esquerda), as linhas (agora colunas verticais) da esq para dir são: Trás(2), Meio(1), Frente(0)
            // Para P2 (Direita), as linhas da esq para dir são: Frente(0), Meio(1), Trás(2)
            const rows = player === 1 ? [2, 1, 0] : [0, 1, 2];
            
            rows.forEach(r => {
                html += `<div style="display: flex; flex-direction: column; gap: 20px; justify-content: center; height: 100%;">`;
                for(let c = 0; c < board[r].length; c++) {
                    const card = board[r][c];
                    const isSelected = this.selectedAttacker && this.selectedAttacker.player === player && this.selectedAttacker.r === r && this.selectedAttacker.c === c;
                    const exposed = this.isExposed(player, r, c);
                    
                    const borderStyle = isSelected ? '3px solid #f1c40f' : `2px solid ${player === 2 ? '#c0392b' : '#2980b9'}`;
                    const shadowStyle = isSelected ? 'box-shadow: 0 0 15px #f1c40f; transform: scale(1.05);' : '';
                    
                    let cursorStyle = '';
                    let opacityStyle = '';

                    if (card) {
                        if (!exposed) {
                            cursorStyle = 'cursor: not-allowed;';
                            opacityStyle = 'opacity: 0.6; filter: grayscale(30%);';
                        } else {
                            const myP = this.multiplayerMode ? this.myPlayerNumber : 1;
                            const enemyP = myP === 1 ? 2 : 1;
                            cursorStyle = (this.isMyTurn() && player === myP) || (this.isMyTurn() && this.gameState === 'SELECT_TARGET' && player === enemyP) ? 'cursor: pointer;' : '';
                        }
                    }

                    if (card) {
                        const animState = this.combatAnimationState || {};
                        const isAttackerAnim = animState.attacker && animState.attacker.player === player && animState.attacker.r === r && animState.attacker.c === c;
                        const isDefenderAnim = animState.defender && animState.defender.player === player && animState.defender.r === r && animState.defender.c === c;
                        const animClass = isDefenderAnim && animState.destroyed ? 'defeat-anim' : isAttackerAnim ? 'attack-anim' : isDefenderAnim ? 'hit-anim' : '';

                        // Preview de combate: só em cartas inimigas quando atacante selecionado
                        const myP    = this.multiplayerMode ? this.myPlayerNumber : 1;
                        const enemyP = myP === 1 ? 2 : 1;
                        let previewHtml = '';
                        if (this.gameState === 'SELECT_TARGET' && this.selectedAttacker && player === enemyP && !card._invisibility) {
                            const myBoard  = myP === 1 ? this.boardP1 : this.boardP2;
                            const attCard  = myBoard[this.selectedAttacker.r][this.selectedAttacker.c];
                            if (attCard) {
                                const prev = this._getCombatPreview(
                                    attCard, this.selectedAttacker.r, this.selectedAttacker.c, myP,
                                    card, r, c
                                );
                                previewHtml = `
                                    <div style="
                                        position:absolute; inset:0; border-radius:8px; z-index:5;
                                        background: linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.88) 70%);
                                        display:flex; flex-direction:column; justify-content:flex-end;
                                        padding:6px; pointer-events:none;
                                    ">
                                        <div style="text-align:center; line-height:1.3;">
                                            <div style="font-size:16px;">${prev.emoji}</div>
                                            <div style="font-size:10px; font-weight:800; color:${prev.color}; letter-spacing:0.5px;">${prev.verdict}</div>
                                            <div style="font-size:9px; color:#cbd5e1; margin-top:2px;">${prev.initLabel}</div>
                                            <div style="display:flex; justify-content:center; gap:6px; margin-top:3px; font-size:9px;">
                                                <span style="color:#22c55e;">💥 ${prev.myDmg}</span>
                                                <span style="color:#94a3b8;">vs</span>
                                                <span style="color:#f87171;">💥 ${prev.theirDmg}</span>
                                            </div>
                                        </div>
                                    </div>`;
                            }
                        }
                        const syn = this.getSynergyBonus(player, r, c);
                        let displayMaxEnergy = card.maxEnergy;
                        let displayEnergy = card.energy;
                        let displayCourage = card.courage;
                        let displayPower = card.power;
                        let displayWisdom = card.wisdom;
                        let displaySpeed = card.speed;
                        
                        if (syn) {
                            displayMaxEnergy += syn.energy;
                            displayEnergy += syn.energy;
                            displayCourage += syn.courage;
                            displayPower += syn.power;
                            displayWisdom += syn.wisdom;
                            displaySpeed += syn.speed;
                        }

                        let bgDisplayHtml = '';
                        if (card.bgRevealed && card.battlegear) {
                            const mod = card.battlegear.modifiers || {};
                            displayMaxEnergy += mod.energy || 0;
                            displayEnergy += mod.energy || 0;
                            displayCourage += mod.courage || 0;
                            displayPower += mod.power || 0;
                            displayWisdom += mod.wisdom || 0;
                            displaySpeed += mod.speed || 0;
                            bgDisplayHtml = `<div style="text-align: center; font-size: 10px; color: #f1c40f; background: rgba(0,0,0,0.8); margin: 2px 0; padding: 2px; border-radius: 3px;">Equipado: ${card.battlegear.name}</div>`;
                        } else if (card.battlegear && !card.bgRevealed) {
                            if (player === 1) {
                                bgDisplayHtml = `<div style="text-align: center; font-size: 10px; color: #bdc3c7; background: rgba(0,0,0,0.8); margin: 2px 0; padding: 2px; border-radius: 3px; border: 1px dashed #7f8c8d;" title="Oculto para o oponente">[Escondido] ${card.battlegear.name}</div>`;
                            } else {
                                bgDisplayHtml = `<div style="text-align: center; font-size: 10px; color: #7f8c8d; background: rgba(0,0,0,0.8); margin: 2px 0; padding: 2px; border-radius: 3px;">Item: Face Down</div>`;
                            }
                        }

                        // Borda colorida pelo veredito quando é alvo potencial
                        let finalBorder = borderStyle;
                        let finalShadow = shadowStyle;
                        if (previewHtml) {
                            const prev = this._getCombatPreview(
                                (myP===1?this.boardP1:this.boardP2)[this.selectedAttacker.r][this.selectedAttacker.c],
                                this.selectedAttacker.r, this.selectedAttacker.c, myP, card, r, c
                            );
                            finalBorder = `3px solid ${prev.border}`;
                            finalShadow = `box-shadow: 0 0 14px ${prev.border}88;`;
                        }

                        html += `
                            <div class="card ${animClass}" onclick="game.handleCardClick(${player}, ${r}, ${c})" title="${this.getPassiveDescription(card).replace(/"/g, '&quot;')}" style="border: ${finalBorder}; ${finalShadow} ${cursorStyle} ${opacityStyle} transition: all 0.2s; position:relative; overflow:hidden;">
                                ${previewHtml}
                                <div class="card-header">
                                    <div class="card-rarity-icon rarity-${(card.rarity || 'Common').toLowerCase().replace(/\s+/g, '-')}" title="${card.rarity || 'Common'}">${card.rarity === 'Ultra Rare' ? '💎' : card.rarity === 'Super Rare' ? '🔷' : card.rarity === 'Rare' ? '🔶' : card.rarity === 'Legendary' ? '🌟' : '⚪'}</div>
                                    <div class="card-tribe">${card.tribe}</div>
                                    <div class="card-name">${card.name}</div>
                                </div>
                                <div class="card-image-container">
                                    ${card.image ? `<img src="${card.image}" class="card-image" alt="${card.name}">` : `<div class="card-image-placeholder">Sem Imagem</div>`}
                                </div>
                                ${bgDisplayHtml}
                                ${(() => {
                                    let eHtml = '';
                                    if (card.elements && card.elements.length > 0) {
                                        const iconMap = { "Fire": "🔥", "Water": "💧", "Earth": "🪨", "Air": "🌪️" };
                                        eHtml = `<div style="display: flex; gap: 5px; justify-content: center; margin-top: -10px; z-index: 2; position: relative;">`;
                                        card.elements.forEach(el => {
                                            eHtml += `<div title="${el}" style="background: rgba(0,0,0,0.8); border: 1px solid #7f8c8d; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px;">${iconMap[el] || '✨'}</div>`;
                                        });
                                        eHtml += `</div>`;
                                    }
                                    return eHtml;
                                })()}
                                
                                ${this._getPassiveBadgesHtml(card)}
                                ${(() => {
                                    let badges = '';
                                    if (card._hasRange)      badges += `<span title="Range: pode atacar criaturas protegidas" style="background:#e67e22;color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;margin:0 2px;">🏹 Range</span>`;
                                    if (card._invisibility)  badges += `<span title="Invisível: não pode ser alvo de ataques" style="background:#8e44ad;color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;margin:0 2px;">👻 Invisível</span>`;
                                    if (card._cannotMove)    badges += `<span title="Não pode se mover este turno" style="background:#7f8c8d;color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;margin:0 2px;">🔒 Imóvel</span>`;
                                    return badges ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px;padding:2px 0;">${badges}</div>` : '';
                                })()}
                                ${syn ? `<div style="text-align: center; font-size: 10px; background: rgba(52, 152, 219, 0.2); color: #3498db; padding: 2px; border-bottom: 1px solid #3498db; font-weight: bold;">${syn.description}</div>` : ''}
                                <div class="card-stats">
                                    <div class="stat-box" data-tip="Coragem — define quem ataca primeiro na iniciativa. Usada em ataques de Courage e pela passiva Intimidate."><span class="stat-icon">⚔️</span><span class="stat-label">COR</span><span class="stat-value" style="${syn && syn.courage ? 'color:#3498db;font-weight:bold;' : ''}">${displayCourage}</span></div>
                                    <div class="stat-box" data-tip="Poder — usado em ataques físicos de Poder. Quanto maior, mais dano em ataques de Power."><span class="stat-icon">💪</span><span class="stat-label">POD</span><span class="stat-value" style="${syn && syn.power ? 'color:#3498db;font-weight:bold;' : ''}">${displayPower}</span></div>
                                    <div class="stat-box" data-tip="Sabedoria — usado em ataques mágicos de Sabedoria. Também define quem pode conjurar Mugics mais caras."><span class="stat-icon">🧠</span><span class="stat-label">SAB</span><span class="stat-value" style="${syn && syn.wisdom ? 'color:#3498db;font-weight:bold;' : ''}">${displayWisdom}</span></div>
                                    <div class="stat-box" data-tip="Velocidade — usado em ataques de Speed e na disputa de iniciativa. Swift aumenta este valor."><span class="stat-icon">⚡</span><span class="stat-label">VEL</span><span class="stat-value" style="${syn && syn.speed ? 'color:#3498db;font-weight:bold;' : ''}">${displaySpeed}</span></div>
                                </div>
                                <div class="card-energy-container" style="padding: 6px; background: #c0392b; border-top: 2px solid #7f8c8d;">
                                    <div style="background-color: #2c3e50; border-radius: 4px; overflow: hidden; width: 100%; position: relative; height: 22px; border: 1px solid #000;">
                                        <div style="width: ${Math.max(0, (displayEnergy / displayMaxEnergy) * 100)}%; height: 100%; background-color: ${(displayEnergy / displayMaxEnergy) > 0.5 ? '#2ecc71' : (displayEnergy / displayMaxEnergy) > 0.2 ? '#f1c40f' : '#e74c3c'}; transition: width 0.4s ease-out, background-color 0.4s ease-out;"></div>
                                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; font-size: 0.9em; font-weight: bold; color: white; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);">
                                            ❤️ ${Math.max(0, displayEnergy)} / ${displayMaxEnergy}
                                        </div>
                                    </div>
                                    ${(() => {
                                        const mgCnt = card.mugicCounters || 0;
                                        if (mgCnt === 0) return '';
                                        let mHtml = '<div style="display: flex; justify-content: center; gap: 2px; margin-top: 5px;">';
                                        for(let i=0; i<mgCnt; i++) mHtml += '<span style="color: #9b59b6; font-size: 14px; text-shadow: 1px 1px 2px black;">♪</span>';
                                        mHtml += '</div>';
                                        return mHtml;
                                    })()}
                                </div>
                            </div>
                        `;
                    } else {
                        // Slot vazio
                        let emptyCursor = '';
                        let emptyBorder = 'border: 2px dashed #bdc3c7;';
                        let emptyBg = '';

                        // Destacar slot vazio se puder mover para ele
                        const myPl = this.multiplayerMode ? this.myPlayerNumber : 1;
                        if (this.gameState === 'SELECT_TARGET' && player === myPl && this.selectedAttacker) {
                            if (this.isValidMove(this.selectedAttacker.r, this.selectedAttacker.c, r, c)) {
                                emptyCursor = 'cursor: pointer;';
                                emptyBorder = 'border: 2px dashed #2ecc71;'; // Verde para movimento
                                emptyBg = 'background-color: rgba(46, 204, 113, 0.15);';
                            }
                        }

                        html += `<div style="width: 110px; height: 150px; ${emptyBorder} ${emptyBg} border-radius: 8px; opacity: 0.6; ${emptyCursor} transition: all 0.2s;" onclick="game.handleCardClick(${player}, ${r}, ${c})"></div>`;
                    }
                }
                html += `</div>`;
            });
            html += `</div>`;
            return html;
        };

        let boardsHtml = '<div style="display: flex; flex-direction: row; width: 100%; justify-content: center; gap: 40px; align-items: center; margin-top: 20px;">';
        boardsHtml += renderPlayerBoard(this.boardP1, 1);
        boardsHtml += '<div style="width: 4px; height: 80%; min-height: 400px; background-color: #bdc3c7; border-radius: 2px;"></div>'; // Divisória vertical
        boardsHtml += renderPlayerBoard(this.boardP2, 2);
        boardsHtml += '</div>';
        
        this.boardElement.innerHTML += boardsHtml;

        // Dispara gotículas de sangue se houver uma criatura marcada como destruída
        const animState = this.combatAnimationState;
        if (animState && animState.destroyed) {
            // Encontra o elemento com defeat-anim recém criado e injeta as gotículas
            requestAnimationFrame(() => {
                const defeatEl = this.boardElement.querySelector('.card.defeat-anim');
                if (defeatEl) this._spawnBloodDrops(defeatEl);
            });
        }
    }

    nextTurn(fromRemote = false) {
        if (this._nextTurnLock) return;
        this._nextTurnLock = true;
        setTimeout(() => { this._nextTurnLock = false; }, 500);

        // Expira flags temporárias de turno em todas as criaturas
        const expireFlags = (board) => {
            for (const row of board) for (const card of row) {
                if (!card) continue;
                // Invisibility dura apenas 1 turno completo
                if (card._invisibility) {
                    if (card._invisibilityTurn !== undefined && card._invisibilityTurn < this.turn) {
                        delete card._invisibility;
                        delete card._invisibilityTurn;
                        this.log(`👁️ ${card.name} não está mais invisível.`);
                    }
                }
                // _cannotMove expira a cada virada de turno
                delete card._cannotMove;
            }
        };
        expireFlags(this.boardP1);
        expireFlags(this.boardP2);

        this.selectedAttacker = null;
        this.gameState = 'IDLE';
        this.turn = this.turn === 1 ? 2 : 1;

        this.log(`---------- Turno do Jogador ${this.turn} ----------`);
        this.renderBoard();
        this.renderMugics();

        // Em multiplayer: só envia nextTurn quem estava no turno que acabou
        // (evita que os dois clientes enviem e causem flip duplo)
        if (!fromRemote && this.multiplayerMode) {
            const turnThatJustEnded = this.turn === 1 ? 2 : 1; // turn já virou, então quem mandou era o anterior
            if (turnThatJustEnded === this.myPlayerNumber) {
                this.sendAction('nextTurn');
            }
        }

        if (this.turn === 2) {
            if (!this.multiplayerMode) {
                setTimeout(() => this.aiTurn(), 1000);
            }
        }
    }

    aiTurn() {
        // ── Candidatos atacantes: criaturas expostas da IA ───────────────────
        let p2Alive = [];
        for (let r = 0; r < this.boardP2.length; r++) {
            for (let c = 0; c < this.boardP2[r].length; c++) {
                if (this.boardP2[r][c] && this.isExposed(2, r, c)) {
                    p2Alive.push({ card: this.boardP2[r][c], r, c });
                }
            }
        }

        // ── Candidatos alvo: criaturas do P1 visíveis (não invisíveis) ───────
        // Se o atacante escolhido tiver Range, considera TODAS (expostas ou não).
        // Calculamos isso depois de escolher o atacante.
        let p1All = [];
        for (let r = 0; r < this.boardP1.length; r++) {
            for (let c = 0; c < this.boardP1[r].length; c++) {
                const card = this.boardP1[r][c];
                if (card && !card._invisibility) {          // invisíveis são ignoradas
                    p1All.push({ card, r, c, exposed: this.isExposed(1, r, c) });
                }
            }
        }

        if (p2Alive.length === 0 || p1All.length === 0) {
            this.checkWinCondition();
            return;
        }

        // Escolhe o atacante exposto mais forte
        const attacker = p2Alive.reduce((best, candidate) => {
            const score = (candidate.card.power || 0) * 2 + (candidate.card.courage || 0) * 1.5
                        + (candidate.card.speed || 0) + (candidate.card.energy || 0) * 0.5;
            return !best || score > best.score ? { candidate, score } : best;
        }, null).candidate;

        const hasRange = !!(attacker.card._hasRange);

        // Filtra alvos permitidos baseado em Range
        const validTargets = p1All.filter(t => t.exposed || hasRange);

        if (validTargets.length === 0) {
            // Nenhum alvo válido disponível — IA passa o turno
            this.log("⏭️ IA não tem alvos disponíveis e passa o turno.");
            setTimeout(() => this.nextTurn(), 800);
            return;
        }

        if (hasRange) this.log(`🏹 ${attacker.card.name} tem Range — pode atacar criaturas protegidas!`);

        // Escolhe o alvo mais fácil de matar (menos vida/ameaça)
        const defender = validTargets.reduce((best, candidate) => {
            const rowPenalty = candidate.r * 2;
            const threat = (candidate.card.energy || 0) * 3 + (candidate.card.power || 0) * 2
                         + (candidate.card.courage || 0) * 1.5 + rowPenalty;
            return !best || threat < best.threat ? { candidate, threat } : best;
        }, null).candidate;

        this.selectedAttacker = { player: 2, r: attacker.r, c: attacker.c };
        this.renderBoard();

        setTimeout(() => {
            this.startCombat(attacker.card, defender.card, attacker.r, attacker.c, defender.r, defender.c, 2);
        }, 1000);
    }

    // ─── Verificação de Vitória ────────────────────────────────────────────────

    _countAlive(board) {
        let count = 0;
        for (const row of board) for (const card of row) if (card) count++;
        return count;
    }

    checkWinCondition() {
        const p1Alive = this._countAlive(this.boardP1);
        const p2Alive = this._countAlive(this.boardP2);
        if (p1Alive > 0 && p2Alive > 0) return false; // ainda não acabou

        const myNum = this.myPlayerNumber;
        let winner; // 1 ou 2
        if (p1Alive === 0 && p2Alive === 0) {
            winner = 0; // empate improvável mas tratado
        } else {
            winner = p1Alive > 0 ? 1 : 2;
        }

        // Em multiplayer só mostra a tela para ambos os jogadores
        if (this.multiplayerMode && !this._winSent) {
            this._winSent = true;
            this.sendAction('gameOver', { winner });
        }

        const isWin = (!this.multiplayerMode && winner === 1) ||
                      (this.multiplayerMode  && winner === myNum) ||
                      winner === 0;
        const isDraw = winner === 0;

        this._showWinScreen(isWin, isDraw, winner);
        return true;
    }

    _showWinScreen(isWin, isDraw, winner) {
        // Remove overlay anterior se existir
        const old = document.getElementById('win-overlay');
        if (old) old.remove();

        const winnerLabel = winner === 1 ? 'Jogador 1' : winner === 2 ? 'Jogador 2' : '—';

        let title, subtitle, emoji, bgColor;
        if (isDraw) {
            title = 'Empate!';
            subtitle = 'Todas as criaturas foram destruídas ao mesmo tempo.';
            emoji = '🤝';
            bgColor = 'linear-gradient(135deg, #636e72, #2d3436)';
        } else if (isWin) {
            title = 'Vitória!';
            subtitle = `Parabéns! Você derrotou todas as criaturas do oponente.`;
            emoji = '🏆';
            bgColor = 'linear-gradient(135deg, #f9ca24, #f0932b)';
        } else {
            title = 'Derrota!';
            subtitle = `${winnerLabel} destruiu todas as suas criaturas.`;
            emoji = '💀';
            bgColor = 'linear-gradient(135deg, #636e72, #e17055)';
        }

        const overlay = document.createElement('div');
        overlay.id = 'win-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.85);
            animation: fadeInOverlay 0.5s ease-out;
        `;

        overlay.innerHTML = `
            <style>
                @keyframes fadeInOverlay { from { opacity:0; } to { opacity:1; } }
                @keyframes popIn { from { transform: scale(0.5); opacity:0; } to { transform: scale(1); opacity:1; } }
                @keyframes floatEmoji { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
                #win-card { animation: popIn 0.4s cubic-bezier(.175,.885,.32,1.275) forwards; }
                #win-emoji { animation: floatEmoji 2s ease-in-out infinite; display: inline-block; }
            </style>
            <div id="win-card" style="
                background: ${bgColor};
                border-radius: 20px;
                padding: 50px 60px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.7);
                max-width: 420px;
                width: 90%;
            ">
                <div id="win-emoji" style="font-size: 80px; margin-bottom: 20px;">${emoji}</div>
                <h1 style="color: #fff; font-size: 2.8em; margin: 0 0 10px; text-shadow: 2px 2px 8px rgba(0,0,0,0.5);">${title}</h1>
                <p style="color: rgba(255,255,255,0.9); font-size: 1.1em; margin: 0 0 30px;">${subtitle}</p>
                <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="location.reload()" style="
                        background: rgba(255,255,255,0.25);
                        border: 2px solid rgba(255,255,255,0.6);
                        color: #fff;
                        font-size: 1em;
                        font-weight: bold;
                        padding: 12px 28px;
                        border-radius: 30px;
                        cursor: pointer;
                        transition: all 0.2s;
                        backdrop-filter: blur(4px);
                    " onmouseover="this.style.background='rgba(255,255,255,0.4)'" onmouseout="this.style.background='rgba(255,255,255,0.25)'">
                        🔄 Jogar Novamente
                    </button>
                    <button onclick="document.getElementById('win-overlay').remove()" style="
                        background: transparent;
                        border: 2px solid rgba(255,255,255,0.35);
                        color: rgba(255,255,255,0.75);
                        font-size: 1em;
                        padding: 12px 28px;
                        border-radius: 30px;
                        cursor: pointer;
                        transition: all 0.2s;
                    " onmouseover="this.style.borderColor='rgba(255,255,255,0.7)';this.style.color='#fff'" onmouseout="this.style.borderColor='rgba(255,255,255,0.35)';this.style.color='rgba(255,255,255,0.75)'">
                        Ver Tabuleiro
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.log(`${emoji} ${title} — ${subtitle}`);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const cards = window.cardsDatabase || [];
    const mugics = window.mugicsDatabase || [];
    const attacks = window.attacksDatabase || [];
    const locations = window.locationsDatabase || [];
    const battlegears = window.battlegearDatabase || [];
    const game = new GameEngine(cards, mugics, attacks, locations, battlegears);
    game.init();
    window.game = game;
});
