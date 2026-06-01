// engine-helpers.js
Object.assign(GameEngine.prototype, {

    /** Remove mugic[index] da mão do player (1 ou 2) e joga no discard pile */
    _discardMugic(playerNum, handArray, index) {
        const mg = handArray.splice(index, 1)[0];
        if (!mg) return null;
        if (playerNum === 1) this.p1MugicDiscard.push(mg);
        else                 this.p2MugicDiscard.push(mg);
        this.log(`🗑️ [${mg.name}] foi para o descarte do Jogador ${playerNum}.`);
        return mg;
    },

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

        // Bônus de energia dos modifiers (ex: Stone Mail +50, Aqua Shield +5, Nexus Fuse +5)
        // Aplicado permanentemente para que attack modal, combate e tabuleiro mostrem o mesmo valor
        if (bg.modifiers && bg.modifiers.energy) {
            card.energy    += bg.modifiers.energy;
            card.maxEnergy += bg.modifiers.energy;
            this.log(`❤️ ${card.name} [${bg.name}]: +${bg.modifiers.energy} Energia máxima!`);
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
    },

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
    },

    /** Empurra carta de criatura no discard pile correto */
    _discardCreature(card) {
        if (!card) return;
        if (card.player === 1) this.p1CreatureDiscard.push(card);
        else                   this.p2CreatureDiscard.push(card);
    },

    /** Ícone de raridade da carta */
    _rarityIcon(rarity) {
        if (rarity === 'Ultra Rare')  return '💎';
        if (rarity === 'Super Rare')  return '🔷';
        if (rarity === 'Rare')        return '🔶';
        if (rarity === 'Legendary')   return '🌟';
        return '⚪';
    },

    /** HTML dos ícones de elemento de uma carta */
    _elementsHtml(card) {
        if (!card.elements || card.elements.length === 0) return '';
        const iconMap = { Fire: '🔥', Water: '💧', Earth: '🪨', Air: '🌪️' };
        let html = `<div style="display:flex;gap:5px;justify-content:center;margin-top:-10px;z-index:2;position:relative;">`;
        card.elements.forEach(el => {
            html += `<div title="${el}" style="background:rgba(0,0,0,0.8);border:1px solid #7f8c8d;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:12px;">${iconMap[el] || '✨'}</div>`;
        });
        html += `</div>`;
        return html;
    },

    /** HTML dos contadores de mugic (♪♪♪) */
    _mugicCountersHtml(card) {
        const n = card.mugicCounters || 0;
        if (n === 0) return '';
        let html = '<div style="display:flex;justify-content:center;gap:3px;">';
        for (let i = 0; i < n; i++) {
            html += '<span style="color:#9b59b6;font-size:14px;text-shadow:1px 1px 2px black;line-height:1;">♪</span>';
        }
        html += '</div>';
        return html;
    },

    /** HTML de uma carta no draft (card grid) */
    _draftCardHtml(card, index) {
        const limit      = this._getDraftLimit();
        const count      = this.draftedCards.filter(c => c.name === card.name).length;
        const disabled   = this.draftedCards.length >= limit || count >= 2;
        const borderStyle  = count > 0 ? 'border:3px solid #2ecc71;box-shadow:0 0 15px #2ecc71;' : 'border:2px solid #7f8c8d;';
        const opacityStyle = disabled ? 'opacity:0.5;filter:grayscale(80%);cursor:not-allowed;' : 'cursor:pointer;';
        const rarity = card.rarity || 'Common';

        // Barra de afinidade — só mostra quando há pelo menos 1 carta no time
        let affinityHtml = '';
        if (this.draftedCards.length > 0 && count === 0) {
            const score = this._calcCardAffinity(card);
            const color = this._affinityColor(score);
            const label = score >= 70 ? 'Ótima sinergia' : score >= 40 ? 'Boa sinergia' : 'Sinergia baixa';
            affinityHtml = `
                <div style="padding:4px 8px 6px;border-top:1px solid #1e293b;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                        <span style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Afinidade</span>
                        <span style="font-size:10px;font-weight:700;color:${color};">${score}%</span>
                    </div>
                    <div style="height:4px;background:#1e293b;border-radius:2px;overflow:hidden;">
                        <div style="width:${score}%;height:100%;background:${color};border-radius:2px;transition:width 0.4s ease;"></div>
                    </div>
                    <div style="font-size:9px;color:${color};margin-top:2px;">${label}</div>
                </div>`;
        }

        return `
            <div class="card" onclick="game.addDraftCard(${index})" title="${this.getPassiveDescription(card).replace(/"/g, '&quot;')}" style="${borderStyle}${opacityStyle}">
                <div class="card-header">
                    <div class="card-rarity-icon rarity-${rarity.toLowerCase().replace(/\s+/g,'-')}" title="${rarity}">${this._rarityIcon(rarity)}</div>
                    <div class="card-tribe">${card.tribe}</div>
                    <div class="card-name">${card.name}${count > 0 ? ` (x${count})` : ''}</div>
                </div>
                <div class="card-image-container">
                    ${card.image ? `<img src="${card.image}" class="card-image" alt="${card.name}">` : `<div class="card-image-placeholder">Sem Imagem</div>`}
                </div>
                ${this._elementsHtml(card)}
                ${this._getPassiveBadgesHtml(card)}
                <div class="card-stats">
                    <div class="stat-box" data-tip="Coragem — define quem ataca primeiro na iniciativa. Usada em ataques de Courage e pela passiva Intimidate."><span class="stat-icon">⚔️</span><span class="stat-label">COR</span><span class="stat-value">${card.courage}</span></div>
                    <div class="stat-box" data-tip="Poder — usado em ataques físicos de Poder. Quanto maior, mais dano em ataques de Power."><span class="stat-icon">💪</span><span class="stat-label">POD</span><span class="stat-value">${card.power}</span></div>
                    <div class="stat-box" data-tip="Sabedoria — usado em ataques mágicos de Sabedoria. Também define quem pode conjurar Mugics mais caras."><span class="stat-icon">🧠</span><span class="stat-label">SAB</span><span class="stat-value">${card.wisdom}</span></div>
                    <div class="stat-box" data-tip="Velocidade — usado em ataques de Speed e na disputa de iniciativa. Swift aumenta este valor."><span class="stat-icon">⚡</span><span class="stat-label">VEL</span><span class="stat-value">${card.speed}</span></div>
                </div>
                <div class="card-energy-container">
                    ❤️ ${card.energy}
                    ${this._mugicCountersHtml(card)}
                </div>
                ${affinityHtml}
            </div>`;
    },

    /** Atualiza o painel de cartas selecionadas, contador e botão de início */
    _syncDraftControls() {
        const draftedContainer = document.getElementById('drafted-deck');
        if (draftedContainer) {
            draftedContainer.innerHTML = this.draftedCards.map((c, i) => `
                <div onclick="game.removeDraftCard(${i})" style="width:80px;height:80px;cursor:pointer;border:2px solid #e74c3c;border-radius:5px;overflow:hidden;position:relative;">
                    ${c.image ? `<img src="${c.image}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="background:#2c3e50;width:100%;height:100%;"></div>`}
                    <div style="background:rgba(0,0,0,0.7);color:white;font-size:10px;position:absolute;bottom:0;width:100%;text-align:center;padding:2px 0;">Remover</div>
                </div>`).join('');
        }
        const counter = document.getElementById('draft-counter');
        const limit = this._getDraftLimit();
        if (counter) counter.innerText = `${this.draftedCards.length} / ${limit} Escolhidas`;
        const full = this.draftedCards.length === limit;
        const btnStart = document.getElementById('btn-start-battle');
        if (btnStart) {
            btnStart.classList.toggle('hidden', !full);
            btnStart.style.display = full ? 'block' : 'none';
        }
        this.updateSynergyPreview();
        this.updateDeckStats();
    },

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
    },

    cloneCard(baseCard) {
        let cloned = JSON.parse(JSON.stringify(baseCard));
        cloned.maxEnergy = cloned.energy; // Guarda a vida máxima
        cloned.baseCourage = cloned.courage;
        cloned.basePower = cloned.power;
        cloned.baseWisdom = cloned.wisdom;
        cloned.baseSpeed = cloned.speed;
        cloned.baseEnergy = cloned.energy;
        return cloned;
    },

    /**
     * Posiciona um array de cartas no tabuleiro respeitando a formationOrder se disponível.
     * @param {Array} cards        - cartas a posicionar
     * @param {Array} battlegears  - battlegears correspondentes (mesmo índice)
     * @param {Array} board        - boardP1 ou boardP2
     * @param {number} playerNum   - 1 ou 2
     * @param {Array|null} formationOrder - array de nomes de cartas na ordem da tela de formação (opcional)
     */
    _placeCardsOnBoard(cards, battlegears, board, playerNum, formationOrder) {
        const grid = this._getFormationGrid(); // ordem da tela de formação

        if (formationOrder && formationOrder.length > 0) {
            // Usa a formação enviada — mapeia nome → card
            const usedIdx = [];
            grid.forEach((pos, i) => {
                const name = formationOrder[i];
                if (!name) return;
                // Encontra o card com esse nome (sem reutilizar o mesmo índice)
                const cardIdx = cards.findIndex((c, j) => c.name === name && !usedIdx.includes(j));
                if (cardIdx < 0) return;
                usedIdx.push(cardIdx);
                const baseCard = cards[cardIdx];
                const card = JSON.parse(JSON.stringify(baseCard));
                card.player = playerNum;
                card.maxEnergy = card.energy;
                if (card.mugicCounters === undefined) card.mugicCounters = 0;
                const bgIdx = battlegears ? cardIdx : -1;
                if (bgIdx >= 0 && battlegears && battlegears[bgIdx]) {
                    card.battlegear = JSON.parse(JSON.stringify(battlegears[bgIdx]));
                    card.bgRevealed = !!card.battlegear.faceUp;
                    if (card.bgRevealed) this._revealBattlegear(card);
                }
                board[pos.r][pos.c] = card;
            });
        } else {
            // Sem formação customizada — usa ordem padrão (_getFormation)
            const formation = this._getFormation();
            cards.forEach((baseCard, i) => {
                if (i >= formation.length) return;
                const pos  = formation[i];
                const card = JSON.parse(JSON.stringify(baseCard));
                card.player = playerNum;
                card.maxEnergy = card.energy;
                if (card.mugicCounters === undefined) card.mugicCounters = 0;
                if (battlegears && battlegears[i]) {
                    card.battlegear = JSON.parse(JSON.stringify(battlegears[i]));
                    card.bgRevealed = !!card.battlegear.faceUp;
                    if (card.bgRevealed) this._revealBattlegear(card);
                }
                board[pos.r][pos.c] = card;
            });
        }
    },

    setupBoard(aiCards, aiBg, opponentFormationOrder = null) {
        const p2Formation = this._getFormation();

        // P1: usa formação personalizada se disponível, senão usa a padrão
        if (this._customFormation && this._customFormation.length > 0) {
            // IMPORTANTE: usa _getFormationGrid() (mesma ordem da tela de formação)
            // não _getFormation() que usa ordem inversa (Trás→Frente)
            const grid        = this._getFormationGrid();
            const usedDraftIdx = []; // rastreia quais índices do draft já foram usados (evita duplicatas)

            grid.forEach((pos, i) => {
                const baseCard = this._customFormation[i];
                if (!baseCard) return;

                // Acha o próximo índice não-usado no draft para essa criatura
                let draftIdx = -1;
                for (let j = 0; j < this.draftedCards.length; j++) {
                    if (this.draftedCards[j].name === baseCard.name && !usedDraftIdx.includes(j)) {
                        draftIdx = j;
                        break;
                    }
                }
                usedDraftIdx.push(draftIdx);

                const card = JSON.parse(JSON.stringify(baseCard));
                card.player = 1;
                card.maxEnergy = card.energy;
                if (card.mugicCounters === undefined) card.mugicCounters = 0;
                if (draftIdx >= 0 && this.draftedBattlegears && this.draftedBattlegears[draftIdx]) {
                    card.battlegear = JSON.parse(JSON.stringify(this.draftedBattlegears[draftIdx]));
                    card.bgRevealed = !!card.battlegear.faceUp;
                    if (card.bgRevealed) this._revealBattlegear(card);
                }
                this.boardP1[pos.r][pos.c] = card;
            });
        } else {
            // Formação padrão (sem tela de formação customizada)
            const p1Formation = this._getFormation();
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
        }

        // Posiciona cartas do oponente (P2/IA) respeitando formação customizada se disponível
        this._placeCardsOnBoard(aiCards, aiBg, this.boardP2, 2, opponentFormationOrder);
    },

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
    },

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
    },

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
    },

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
    },

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
    },

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
    },

    applyPassives(trigger, creature, opponent) {
        if (!creature.passives || creature.passives.length === 0) return;
        const catalog = window.passivesDatabase || {};
        creature.passives.forEach(passive => {
            const def = catalog[passive.id];
            if (!def) return;
            def.execute(trigger, passive, creature, opponent, (msg) => this.log(msg), this.activeCombat, this);
        });
    },

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
    },

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
    },

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
    },

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
    },

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
    },

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
    },

    _countAlive(board) {
        let count = 0;
        for (const row of board) for (const card of row) if (card) count++;
        return count;
    },

});
