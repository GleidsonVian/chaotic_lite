// engine-burst.js
Object.assign(GameEngine.prototype, {

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
    },

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
    },

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
    },

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
    },

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
    },

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
    },

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
    },

    closeBurstModal() {
        const modal = document.getElementById('burst-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex-modal', 'modal-minimized');
        }
        this.restoreModal && this.restoreModal('burst-modal');
    },

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
    },

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
    },

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
    },

});
