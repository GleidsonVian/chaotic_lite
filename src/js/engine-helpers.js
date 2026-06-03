// engine-helpers.js
Object.assign(GameEngine.prototype, {

    /**
     * Inicializa um card bruto (vindo de JSON) para uso no tabuleiro.
     * Define player, maxEnergy, mugicCounters e associa battlegear se fornecido.
     * @param {object} baseCard  - card original (será copiado via JSON)
     * @param {number} playerNum - 1 ou 2
     * @param {object} [bg]      - battlegear a equipar (opcional)
     * @returns {object} card pronto para o tabuleiro
     */
    _initCard(baseCard, playerNum, bg = null) {
        const card = JSON.parse(JSON.stringify(baseCard));
        card.player = playerNum;
        card.maxEnergy = card.energy;
        if (card.mugicCounters === undefined) card.mugicCounters = 0;
        if (bg) {
            card.battlegear = JSON.parse(JSON.stringify(bg));
            if (card.battlegear.faceUp) {
                // Deixa _revealBattlegear definir bgRevealed e aplicar todos os efeitos
                // (elemento, passivas, stats, Range…). NÃO setar bgRevealed antes.
                this._revealBattlegear(card);
            } else {
                card.bgRevealed = false;
            }
        }
        return card;
    },

    /**
     * Itera sobre todas as criaturas vivas de um tabuleiro.
     * @param {number} playerNum - 1 ou 2 (ou passa a matriz diretamente)
     * @param {function} fn - callback(card, r, c, board)
     */
    _boardWalk(playerNum, fn) {
        const board = playerNum === 1 ? this.boardP1 : this.boardP2;
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                if (board[r][c]) fn(board[r][c], r, c, board);
            }
        }
    },

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
    _mugicCountersHtml(card, pendingCounter = false) {
        const n = card.mugicCounters || 0;
        if (n === 0 && !pendingCounter) return '';

        // Counter pendente (será dado ao entrar em combate pelo local ativo)
        if (n === 0 && pendingCounter) {
            return `
                <div style="display:flex;justify-content:center;margin-top:3px;" title="Ganhará 1 ♪ ao entrar em combate (efeito do local)">
                    <div style="
                        display:inline-flex;align-items:center;gap:1px;
                        background:rgba(109,40,217,0.25);
                        border:1px dashed rgba(139,92,246,0.5);
                        border-radius:20px;padding:2px 6px;
                        opacity:0.7;
                    ">
                        <span style="font-size:11px;color:#c4b5fd;line-height:1;">♪</span>
                        <span style="font-size:9px;color:#7c3aed;margin-left:2px;">+1</span>
                    </div>
                </div>`;
        }

        // Badge pequeno para 1 counter, badge maior e pulsante para 2+
        const isRich = n >= 2;
        const bgColor   = isRich ? 'linear-gradient(135deg,#6d28d9,#9333ea)' : 'rgba(109,40,217,0.5)';
        const border    = isRich ? '1px solid rgba(167,139,250,0.8)' : '1px solid rgba(139,92,246,0.4)';
        const fontSize  = isRich ? '13px' : '11px';
        const padding   = isRich ? '3px 9px' : '2px 6px';
        const shadow    = isRich ? 'box-shadow:0 0 8px rgba(139,92,246,0.6),0 2px 6px rgba(0,0,0,0.4);' : '';
        const pulse     = isRich ? 'animation:mugic-counter-pulse 1.6s ease-in-out infinite;' : '';
        const numBadge  = n > 1
            ? `<span style="background:rgba(0,0,0,0.35);border-radius:50%;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;margin-left:3px;color:#e9d5ff;">×${n}</span>`
            : '';

        return `
            <div style="display:flex;justify-content:center;margin-top:3px;">
                <div style="
                    display:inline-flex;align-items:center;gap:1px;
                    background:${bgColor};
                    border:${border};
                    border-radius:20px;
                    padding:${padding};
                    ${shadow}
                    ${pulse}
                ">
                    <span style="font-size:${fontSize};color:#e9d5ff;line-height:1;filter:drop-shadow(0 0 3px rgba(167,139,250,0.8));">♪</span>
                    ${numBadge}
                </div>
            </div>`;
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

        // Atualiza o texto de instrução conforme o modo
        const instrEl = document.getElementById('draft-instructions');
        if (instrEl) {
            const modeLabel = this.gameMode === '1v1' ? '1 criatura'
                            : this.gameMode === '3v3' ? '3 criaturas'
                            : '6 criaturas';
            instrEl.textContent = `Selecione exatamente ${modeLabel} para formar o seu exército!`;
        }
        const full = this.draftedCards.length === limit;
        const btnStart = document.getElementById('btn-start-battle');
        if (btnStart) {
            btnStart.classList.toggle('hidden', !full);
            btnStart.style.display = full ? 'block' : 'none';
        }
        // Botões salvar/exportar: visíveis assim que tiver pelo menos 1 criatura
        const hasDraft = this.draftedCards.length > 0;
        const btnSave   = document.getElementById('btn-save-deck');
        const btnExport = document.getElementById('btn-export-deck');
        if (btnSave)   { btnSave.classList.toggle('hidden', !hasDraft);   btnSave.style.display   = hasDraft ? 'inline-block' : 'none'; }
        if (btnExport) { btnExport.classList.toggle('hidden', !hasDraft); btnExport.style.display = hasDraft ? 'inline-block' : 'none'; }
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
                const bgForCard = battlegears && battlegears[cardIdx] ? battlegears[cardIdx] : null;
                board[pos.r][pos.c] = this._initCard(baseCard, playerNum, bgForCard);
            });
        } else {
            // Sem formação customizada — usa ordem padrão (_getFormation)
            const formation = this._getFormation();
            cards.forEach((baseCard, i) => {
                if (i >= formation.length) return;
                const pos  = formation[i];
                board[pos.r][pos.c] = this._initCard(baseCard, playerNum, battlegears?.[i] ?? null);
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

                const bg = draftIdx >= 0 ? (this.draftedBattlegears?.[draftIdx] ?? null) : null;
                this.boardP1[pos.r][pos.c] = this._initCard(baseCard, 1, bg);
            });
        } else {
            // Formação padrão (sem tela de formação customizada)
            const p1Formation = this._getFormation();
            let p1Index = 0;
            p1Formation.forEach(pos => {
                if (p1Index < this.draftedCards.length) {
                    const bg = this.draftedBattlegears?.[p1Index] ?? null;
                    this.boardP1[pos.r][pos.c] = this._initCard(this.draftedCards[p1Index], 1, bg);
                    p1Index++;
                }
            });
        }

        // Posiciona cartas do oponente (P2/IA) respeitando formação customizada se disponível
        this._placeCardsOnBoard(aiCards, aiBg, this.boardP2, 2, opponentFormationOrder);
    },

    log(message) {
        console.log(message);
        this._appendStructuredLog(message);
    },

    _appendStructuredLog(message) {
        if (!this.logElement) return;

        // ── Mensagens filtradas (ruído técnico) ──────────────────────────────
        const noise = [
            /^Chaotic Lite Engine/,
            /^Jogador \d passou a prioridade/,
            /^IA passou a prioridade/,
            /^📤 Seu draft/,
            /^📦 Draft do oponente/,
            /^Modo Multiplayer/,
            /^⏳ Aguardando/,
            /^🟢 Oponente conectado/,
            /^---------- Turno do Jogador/,
            /Executando: Ataque Declarado/,
            /Executando: Mugic Cast/,
            /^🔔 BURST (ABERTO|FECHADO)/,
        ];
        if (noise.some(r => r.test(message))) return;

        // ── Detectores de estrutura ──────────────────────────────────────────
        const isCombatStart = /⚔️ COMBATE INICIADO/.test(message);
        const isNewRound    = /Próximo turno \(Strike\): Jogador/.test(message);
        const isNewTurn     = /📍.*Novo Local Revelado|Fim do Combate/.test(message);

        // ── Novo combate → header de combate ────────────────────────────────
        if (isCombatStart) {
            this._logRound = 0;
            const header = document.createElement('div');
            header.className = 'log-combat-header';
            // Extrai "Jogador X ataca primeiro (STAT)"
            const m = message.match(/Jogador (\d) ataca primeiro \((\w+)\)/);
            header.innerHTML = m
                ? `<span>⚔️ Novo Combate</span><span class="log-combat-init">⚡ J${m[1]} inicia · ${m[2].toUpperCase()}</span>`
                : `<span>⚔️ Novo Combate</span>`;
            this.logElement.appendChild(header);
            // Não exibe a mensagem crua, só o header
            this.logElement.scrollTop = this.logElement.scrollHeight;
            return;
        }

        // ── Novo round → header de round ────────────────────────────────────
        if (isNewRound) {
            this._logRound = (this._logRound || 0) + 1;
            const m = message.match(/Jogador (\d) ataca/);
            const striker = m ? (m[1] === '1' ? 'Você' : 'Oponente') : '';
            const div = document.createElement('div');
            div.className = 'log-round-header';
            div.innerHTML = `Round ${this._logRound} <span class="log-round-striker">${striker} ataca</span>`;
            this.logElement.appendChild(div);
            this.logElement.scrollTop = this.logElement.scrollHeight;
            return;
        }

        // ── Fim de combate → separador ────────────────────────────────────
        if (isNewTurn) {
            const sep = document.createElement('div');
            sep.className = 'log-turn-sep';
            sep.textContent = message.replace(/^Fim do Combate! /, '');
            this.logElement.appendChild(sep);
            this.logElement.scrollTop = this.logElement.scrollHeight;
            return;
        }

        // ── Entrada normal colorida por tipo ─────────────────────────────────
        const type = this._logEntryType(message);
        if (!type) return; // filtra mensagens sem categoria

        const entry = document.createElement('div');
        entry.className = `log-entry log-entry-${type}`;
        entry.dataset.logType = type;
        entry.textContent = message.replace(/^[💥💚🎶🪄🎵🔮✨📍📊⚡🛡️💢💪😰🔄⚔️💀📉🌋❄️🧯⬆️↩️♪🗑️🔭👁️💫🔰]/u, '').trim();

        // Aplica filtro de tab ativo
        const activeTab = this._activeLogTab || 'all';
        if (activeTab !== 'all') {
            const show = (activeTab === 'combat' && ['combat','death','initiative'].includes(type))
                      || (activeTab === 'mugic'  && type === 'mugic')
                      || (activeTab === 'damage' && ['damage','heal','death'].includes(type));
            if (!show) entry.style.display = 'none';
        }

        this.logElement.appendChild(entry);
        this.logElement.scrollTop = this.logElement.scrollHeight;
    },

    // ── Funções do painel de log ─────────────────────────────────────────────

    _switchLogTab(tab) {
        this._activeLogTab = tab;
        // Destaca tab ativa
        ['all','combat','mugic','damage'].forEach(t => {
            const btn = document.getElementById(`log-tab-${t}`);
            if (btn) btn.classList.toggle('log-tab-active', t === tab);
        });
        // Filtra entradas visíveis
        if (!this.logElement) return;
        const entries = this.logElement.querySelectorAll('.log-entry, .log-combat-header, .log-round-header, .log-turn-sep');
        entries.forEach(el => {
            const type = el.dataset.logType || '';
            if (tab === 'all') {
                el.style.display = '';
            } else if (tab === 'combat') {
                el.style.display = ['combat','death','initiative','','round','turn'].includes(type) ? '' : 'none';
            } else if (tab === 'mugic') {
                el.style.display = type === 'mugic' ? '' : 'none';
            } else if (tab === 'damage') {
                el.style.display = ['damage','heal','death'].includes(type) ? '' : 'none';
            }
        });
    },

    _clearLog() {
        if (this.logElement) {
            this.logElement.innerHTML = '';
            this.log('🗑️ Log limpo.');
        }
    },

    _logEntryType(msg) {
        if (/💀/.test(msg))                                    return 'death';
        if (/💥/.test(msg))                                    return 'damage';
        if (/💚|curou|Curou|\+\d+ de Energia/.test(msg))       return 'heal';
        if (/🎶|🪄|✨ Efeito Mágico|conjurou/.test(msg))       return 'mugic';
        if (/📍/.test(msg))                                    return 'location';
        if (/📊 Challenge/.test(msg))                          return 'stat';
        if (/🔮.*revelou|ganhou.*elemento|Battlegear/.test(msg)) return 'info';
        if (/🛡️|💢|⚡.*Strike|💨.*Swift|😰.*Intimidate/.test(msg)) return 'passive';
        if (/reciclado|🔄/.test(msg))                          return 'info';
        if (/Iniciativa|inicia/.test(msg))                     return 'initiative';
        return null; // ignora o resto
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

    /** Avaliação básica (rápida, sem contexto de posição) */
    evaluateAttack(atkCard, attacker, defender) {
        return this.evaluateAttackFull(atkCard, attacker, defender, null, null, null, null);
    },

    /**
     * Avaliação completa do dano esperado de um ataque.
     * Considera: stats efetivos (synergy + battlegear + local), elementos, challenges, specials.
     * Usada pela IA no modo Médio/Difícil.
     *
     * @param {object} atkCard   - carta de ataque
     * @param {object} attacker  - criatura atacante
     * @param {object} defender  - criatura defensora
     * @param {number} atkR/atkC - posição do atacante (para synergy)
     * @param {number} defR/defC - posição do defensor
     * @returns {number} dano esperado
     */
    evaluateAttackFull(atkCard, attacker, defender, atkR, atkC, defR, defC) {
        // Stats efetivos — inclui synergy + battlegear + local se posições disponíveis
        const atkSyn   = (atkR !== null && atkC !== null) ? (this.getSynergyBonus(2, atkR, atkC) || {}) : {};
        const defSyn   = (defR !== null && defC !== null) ? (this.getSynergyBonus(1, defR, defC) || {}) : {};
        const locMod   = (this.activeLocation && this.activeLocation.modifiers) || {};
        const atkBgMod = (attacker.bgRevealed && attacker.battlegear && attacker.battlegear.modifiers) || {};
        const defBgMod = (defender.bgRevealed && defender.battlegear && defender.battlegear.modifiers) || {};

        const effAtk = {
            courage: (attacker.courage||0) + (atkSyn.courage||0) + (locMod.courage||0) + (atkBgMod.courage||0),
            power:   (attacker.power  ||0) + (atkSyn.power  ||0) + (locMod.power  ||0) + (atkBgMod.power  ||0),
            wisdom:  (attacker.wisdom ||0) + (atkSyn.wisdom ||0) + (locMod.wisdom ||0) + (atkBgMod.wisdom ||0),
            speed:   (attacker.speed  ||0) + (atkSyn.speed  ||0) + (locMod.speed  ||0) + (atkBgMod.speed  ||0),
        };
        const effDef = {
            courage: (defender.courage||0) + (defSyn.courage||0) + (locMod.courage||0) + (defBgMod.courage||0),
            power:   (defender.power  ||0) + (defSyn.power  ||0) + (locMod.power  ||0) + (defBgMod.power  ||0),
            wisdom:  (defender.wisdom ||0) + (defSyn.wisdom ||0) + (locMod.wisdom ||0) + (defBgMod.wisdom ||0),
            speed:   (defender.speed  ||0) + (defSyn.speed  ||0) + (locMod.speed  ||0) + (defBgMod.speed  ||0),
        };

        // Elementos efetivos do atacante (base + battlegear)
        const atkElements = new Set([
            ...(attacker.elements || []),
            ...(attacker.bgRevealed && attacker.battlegear?.elementGranted ? [attacker.battlegear.elementGranted] : []),
        ]);

        let expected = atkCard.baseDamage || 0;

        // Bônus elemental
        if (atkCard.elementRequirement) {
            if (atkElements.has(atkCard.elementRequirement)) {
                expected += atkCard.elementDamage || 0;
            }
        }

        // Stat challenge / check
        if (atkCard.statRequirement) {
            const stat    = atkCard.statRequirement.toLowerCase();
            const av      = effAtk[stat] || 0;
            const dv      = effDef[stat] || 0;
            const threshold = atkCard.statThreshold || 0;
            const passed  = atkCard.statMode === 'challenge'
                ? av > dv + threshold
                : av >= threshold;
            if (passed) expected += atkCard.statDamage || 0;
        }

        // Efeitos especiais — valor estimado
        if (atkCard.specialEffect) {
            const sp = atkCard.specialEffect;
            if (sp.type === 'megaroar') {
                ['courage','power','wisdom','speed'].forEach(s => {
                    if ((effAtk[s] || 0) >= sp.threshold) expected += sp.value;
                });
            } else if (sp.type === 'double_challenge') {
                let allPass = true;
                (sp.checks || []).forEach(ck => {
                    const av = effAtk[ck.stat] || 0;
                    const dv = effDef[ck.stat] || 0;
                    if (!(av > dv + ck.threshold)) allPass = false;
                });
                if (allPass) expected += sp.bonusDamage || 0;
            } else if (sp.type === 'destroy_battlegear') {
                expected += defender.bgRevealed && defender.battlegear ? 8 : 2; // valor tático
            }
        }

        // Penalidade Reckless: IA evita ataques que a matariam
        if (attacker._recklessPenalty && attacker._recklessPenalty > 0) {
            const selfDmg = attacker._recklessPenalty;
            if (attacker.energy - selfDmg <= 0) expected -= 50; // suicídio — evita
            else expected -= selfDmg * 0.5; // penalidade parcial
        }

        // Tough do defensor reduz dano
        const tough = (defender.passives || []).find(p => (typeof p==='string'?p:p.id) === 'tough');
        if (tough) {
            const reduction = typeof tough === 'object' ? tough.value : 5;
            expected = Math.max(0, expected - reduction);
        }

        // Bônus: se o ataque mata o defensor, enorme valor tático
        if (expected >= defender.energy) expected += 30;

        return expected;
    },

    _countAlive(board) {
        let count = 0;
        for (const row of board) for (const card of row) if (card) count++;
        return count;
    },

});
