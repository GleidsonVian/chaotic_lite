// engine-burst.js
Object.assign(GameEngine.prototype, {

    openBurstModal() {
        const modal = document.getElementById('burst-modal');
        if (!modal) {
            this.resolveBurst();
            return;
        }
        this.sfxBurstOpen && this.sfxBurstOpen();

        // Pisca o título da aba quando o burst abre e o jogador pode não estar olhando
        // (multiplayer: sempre; solo: só quando for turno da IA, i.e. não é a vez do jogador)
        if (!this.isMyTurn()) {
            this._startTabFlash('Burst Aberto!');
        }

        // Render Stack — com descrição rica para mugics
        const container = document.getElementById('burst-stack-container');
        const ac = this.activeCombat;
        let html = '';
        [...this.burstStack].reverse().forEach((item, i) => {
            const negStyle = item.negated
                ? 'text-decoration:line-through;opacity:0.45;color:#e74c3c;'
                : 'color:#ecf0f1;';
            const negTag = item.negated ? ' <span style="color:#e74c3c;font-size:10px;">🚫 NEGADA</span>' : '';

            let extraHtml = '';
            if (item.type === 'mugic' && item.mugic && !item.negated) {
                const mg   = item.mugic;
                const caster = item.caster ? item.caster.name : '?';
                const ally  = ac ? (item.playerNum === 1 ? ac.p1Card : ac.p2Card) : null;
                const enemy = ac ? (item.playerNum === 1 ? ac.p2Card : ac.p1Card) : null;

                // Determina quem serão alvo/beneficiário baseado no efeito
                let targetDesc = '';
                if (['heal','conditional_heal','heal_and_grant_element','heal_and_reduce_fire'].includes(mg.effectType)) {
                    targetDesc = ally ? `→ cura <b style="color:#4ade80">${ally.name}</b>` : '';
                } else if (mg.effectType === 'damage') {
                    targetDesc = enemy ? `→ dano em <b style="color:#f87171">${enemy.name}</b>` : '';
                } else if (mg.effectType === 'energy_steal') {
                    targetDesc = enemy && ally ? `→ rouba vida de <b style="color:#f87171">${enemy.name}</b> para <b style="color:#4ade80">${ally.name}</b>` : '';
                } else if (mg.effectType === 'energy_transfer') {
                    targetDesc = ally && enemy ? `→ transfere energia entre <b style="color:#4ade80">${ally.name}</b> e <b style="color:#f87171">${enemy.name}</b>` : '';
                } else if (['buff_all_stats','buff_combat_stats'].includes(mg.effectType)) {
                    targetDesc = ally ? `→ booste <b style="color:#60a5fa">${ally.name}</b>` : '';
                } else if (['debuff_all_stats','destroy_battlegear'].includes(mg.effectType)) {
                    targetDesc = enemy ? `→ enfraquece <b style="color:#f87171">${enemy.name}</b>` : '';
                }

                extraHtml = `
                    <div style="margin-top:4px;padding:6px 8px;background:rgba(0,0,0,0.3);border-radius:6px;border-left:3px solid #8b5cf6;">
                        <div style="font-size:11px;color:#c4b5fd;font-weight:700;margin-bottom:2px;">🎶 ${mg.name} — por ${caster}</div>
                        <div style="font-size:10px;color:#94a3b8;margin-bottom:2px;">${mg.description || ''}</div>
                        ${targetDesc ? `<div style="font-size:11px;margin-top:3px;">${targetDesc}</div>` : ''}
                    </div>`;
            }

            // Para ataques: nome clicável com hover tooltip mostrando efeitos
            let itemContent = '';
            if (item.type === 'attack') {
                const atkName = item.atkCard ? item.atkCard.name : item.description;
                const hasCard = !!item.atkCard;
                // Serializa o atkCard para acesso no tooltip (evita closures complexas)
                const atkIdx  = this.burstStack.length - 1 - i; // índice no array original
                itemContent = `
                    <span style="color:#fbbf24;">⚔️ Ataque:</span>
                    <b style="cursor:${hasCard?'help':'default'};border-bottom:${hasCard?'1px dashed #f59e0b44':''};padding-bottom:1px;"
                       ${hasCard ? `
                           onmouseenter="game._showAttackTooltip(event, game.burstStack[${atkIdx}]?.atkCard, game.burstStack[${atkIdx}]?.attacker)"
                           onmouseleave="game._hideAttackTooltip()"
                           onmousemove="game._positionTooltip(event, document.getElementById('mugic-tooltip'))"
                       ` : ''}>
                        ${atkName}
                    </b>
                    por <span style="color:#94a3b8">${item.source}</span>
                    ${hasCard ? '<span style="font-size:9px;color:#475569;margin-left:4px;">(hover p/ detalhes)</span>' : ''}
                `;
            } else {
                itemContent = `[${item.source}] ${item.description}`;
            }

            html += `<div style="padding:8px;border-bottom:1px solid #2d3748;text-align:left;${negStyle}">
                <span style="color:#f1c40f;">${this.burstStack.length - i}.</span>
                ${itemContent}${negTag}
                ${extraHtml}
            </div>`;
        });
        container.innerHTML = html;

        // ── Atualiza o HUD de combate ─────────────────────────────────────────
        if (typeof this._updateCombatHudFighters    === 'function') this._updateCombatHudFighters();
        if (typeof this._updateCombatHudBurstSummary === 'function') this._updateCombatHudBurstSummary();

        // ── Reposiciona painéis flutuantes dentro do board ────────────────────
        if (typeof this._positionPanels === 'function') this._positionPanels();

        // ── Sincroniza painel lateral de burst ──────────────────────────────
        const _bsp = document.getElementById('burst-side-panel');
        const _bss = document.getElementById('burst-side-stack');
        if (_bsp && _bss) {
            this._syncBurstSidePanel();
            _bsp.classList.add('visible');
        }

        // ── Painel de log do burst ───────────────────────────────────────────
        const _blp = document.getElementById('burst-log-panel');
        const _ble = document.getElementById('burst-log-entries');
        if (_blp && _ble) {
            // Copia as últimas 15 entradas do log de combate
            const _srcEntries = this.logElement
                ? Array.from(this.logElement.querySelectorAll('.log-entry, .log-combat-header, .log-round-header, .log-turn-sep')).slice(-15)
                : [];
            _ble.innerHTML = '';
            _srcEntries.forEach(el => {
                const clone = el.cloneNode(true);
                // Transforma em burst-log-entry style
                const typeMatch = [...el.classList].find(c => c.startsWith('log-entry-'));
                const type = typeMatch ? typeMatch.replace('log-entry-', '') : 'info';
                const entry = document.createElement('div');
                entry.className = `burst-log-entry ${type}`;
                entry.textContent = el.textContent;
                _ble.appendChild(entry);
            });
            _ble.scrollTop = _ble.scrollHeight;
            _blp.classList.add('visible');
            // Guarda referência para atualizações em tempo real
            this._burstLogEl = _ble;
        }

        // Controle de Prioridade
        const passBtn      = document.getElementById('btn-burst-pass');
        const playBtn      = document.getElementById('btn-burst-play');
        const sacrificeBtn = document.getElementById('btn-burst-sacrifice');
        const mugicSel     = document.getElementById('burst-mugic-selection');
        mugicSel.classList.add('hidden');

        // Mostrar botão de sacrifício se o jogador da vez tiver battlegear sacrificável
        // Iron Pillar (no_battlegear_abilities) desativa completamente o sacrifício
        const noBgAbilities = this.activeLocation?.effect?.type === 'no_battlegear_abilities';
        if (sacrificeBtn) {
            const myCard = this.activeCombat
                ? (this.burstPriority === 1 ? this.activeCombat.p1Card : this.activeCombat.p2Card)
                : null;
            const hasSacrifice = !noBgAbilities
                && myCard && myCard.battlegear && myCard.bgRevealed
                && myCard.battlegear.sacrificeEffect;
            sacrificeBtn.style.display = hasSacrifice ? 'inline-block' : 'none';
        }

        // Determina se é minha vez no burst
        // Guard: em multiplayer, myPlayerNumber deve estar definido
        // Se por algum motivo não estiver, assume P1 para não travar
        if (this.multiplayerMode && !this.myPlayerNumber) {
            console.warn('[BURST] myPlayerNumber indefinido em modo multiplayer — assumindo P1');
            this.myPlayerNumber = 1;
        }
        const isMyBurstTurn = this.multiplayerMode
            ? this.burstPriority === this.myPlayerNumber
            : this.burstPriority === 1;

        console.log(`[BURST] priority=${this.burstPriority} myPN=${this.myPlayerNumber} passes=${this.burstPasses} isMyTurn=${isMyBurstTurn} mp=${this.multiplayerMode}`);

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
                promptText = `Turno de Resposta: ${this.burstPriority === 1 ? (this.p1Name||'Jogador 1') : 'IA (Oponente)'}`;
            }
        }
        document.getElementById('burst-prompt').innerText = promptText;

        // ── Atualiza painel de decisões do HUD ────────────────────────────────
        if (typeof this._updateCombatHudDecisions === 'function') {
            const noBgAb = this.activeLocation?.effect?.type === 'no_battlegear_abilities';
            const myCardHud = this.activeCombat
                ? (this.burstPriority === 1 ? this.activeCombat.p1Card : this.activeCombat.p2Card)
                : null;
            const hasSacHud = !noBgAb && myCardHud && myCardHud.battlegear
                && myCardHud.bgRevealed && myCardHud.battlegear.sacrificeEffect;
            this._updateCombatHudDecisions(isMyBurstTurn, hasSacHud);
            // Atualiza turno label
            const _tl = document.getElementById('chud-turn-label');
            if (_tl) _tl.textContent = isMyBurstTurn ? '🔔 Sua decisão' : '⏳ Aguardando...';
        }

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

        // ── Preview de dano do ataque inimigo ─────────────────────────────────
        const previewEl = document.getElementById('burst-damage-preview');
        if (previewEl) {
            const topAttack = [...this.burstStack].reverse().find(i => i.type === 'attack' && !i.negated);
            const myPlayerNum = this.multiplayerMode ? this.myPlayerNumber : 1;

            if (topAttack && topAttack.attackingPlayer !== myPlayerNum && this.activeCombat) {
                // É um ataque do INIMIGO — calcula quanto vai doer
                const { attacker, defender, atkR, atkC, defR, defC, attackingPlayer, atkCard } = topAttack;

                const atkSyn   = this.getSynergyBonus(attackingPlayer, atkR, atkC) || {};
                const defSyn   = this.getSynergyBonus(attackingPlayer === 1 ? 2 : 1, defR, defC) || {};
                const locMod   = (this.activeLocation && this.activeLocation.modifiers) || {};
                const atkBgMod = (attacker.bgRevealed && attacker.battlegear && attacker.battlegear.modifiers) || {};
                const defBgMod = (defender.bgRevealed && defender.battlegear && defender.battlegear.modifiers) || {};

                const effAtk = {
                    courage: attacker.courage + (atkSyn.courage||0) + (locMod.courage||0) + (atkBgMod.courage||0),
                    power:   attacker.power   + (atkSyn.power  ||0) + (locMod.power  ||0) + (atkBgMod.power  ||0),
                    wisdom:  attacker.wisdom  + (atkSyn.wisdom ||0) + (locMod.wisdom ||0) + (atkBgMod.wisdom ||0),
                    speed:   attacker.speed   + (atkSyn.speed  ||0) + (locMod.speed  ||0) + (atkBgMod.speed  ||0),
                };
                const effDef = {
                    courage: defender.courage + (defSyn.courage||0) + (locMod.courage||0) + (defBgMod.courage||0),
                    power:   defender.power   + (defSyn.power  ||0) + (locMod.power  ||0) + (defBgMod.power  ||0),
                    wisdom:  defender.wisdom  + (defSyn.wisdom ||0) + (locMod.wisdom ||0) + (defBgMod.wisdom ||0),
                    speed:   defender.speed   + (defSyn.speed  ||0) + (locMod.speed  ||0) + (defBgMod.speed  ||0),
                };

                // Calcula dano estimado
                let est = atkCard.baseDamage || 0;

                if (atkCard.statRequirement) {
                    const av = effAtk[atkCard.statRequirement] || 0;
                    const dv = effDef[atkCard.statRequirement] || 0;
                    const passed = atkCard.statMode === 'challenge'
                        ? av > dv + (atkCard.statThreshold || 0)
                        : av >= (atkCard.statThreshold || 0);
                    if (passed) est += atkCard.statDamage || 0;
                }
                if (atkCard.elementRequirement) {
                    const hasEl = (attacker.elements || []).includes(atkCard.elementRequirement);
                    if (hasEl) est += atkCard.elementDamage || 0;
                }

                // Tough passive reduz dano
                const tough = (defender.passives || []).find(p => (typeof p==='string'?p:p.id) === 'tough');
                if (tough) est = Math.max(0, est - (typeof tough === 'object' ? tough.value : 5));

                // Cor e urgência
                const hpPct   = defender.energy / (defender.maxEnergy || defender.energy);
                const lethal  = est >= defender.energy;
                const color   = lethal ? '#ef4444' : est >= defender.energy * 0.4 ? '#f59e0b' : '#94a3b8';
                const urgency = lethal ? '💀 LETAL — você vai morrer!' : est > 0 ? `⚠️ Você vai tomar dano` : '✅ Ataque inofensivo';
                const bgColor = lethal ? 'rgba(239,68,68,0.15)' : est > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.08)';
                const borderColor = lethal ? '#ef444466' : est > 0 ? '#f59e0b44' : '#22c55e44';

                previewEl.style.display = 'block';
                previewEl.innerHTML = `
                    <div style="
                        background:${bgColor}; border:1px solid ${borderColor};
                        border-radius:10px; padding:12px 16px;
                        display:flex; align-items:center; justify-content:space-between; gap:12px;
                        flex-wrap:wrap;
                    ">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div style="font-size:28px;font-weight:900;color:${color};">${est > 0 ? `💥 ${est}` : '0'}</div>
                            <div>
                                <div style="font-size:12px;font-weight:700;color:${color};">${urgency}</div>
                                <div style="font-size:11px;color:#64748b;margin-top:2px;">
                                    ${atkCard.name} · ${defender.name} ❤️ ${defender.energy}/${defender.maxEnergy}
                                </div>
                            </div>
                        </div>
                        <div style="font-size:11px;color:#64748b;text-align:right;">
                            Vida após: <span style="font-weight:700;color:${lethal?'#ef4444':'#f8fafc'};">
                                ${Math.max(0, defender.energy - est)}
                            </span>
                        </div>
                    </div>`;
            } else {
                previewEl.style.display = 'none';
            }
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex-modal');

        // Auto-scroll apenas se o HUD de combate NÃO estiver ativo
        if (!document.body.classList.contains('chud-active')) {
            setTimeout(() => {
                modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
        }
    },

    showBurstMugicSelection() {
        if (this.isSpectator) return;
        const mugicSel = document.getElementById('burst-mugic-selection');
        const handContainer = document.getElementById('burst-hand-container');
        if (!mugicSel || !handContainer) return;

        // Limpar
        handContainer.innerHTML = '';

        const playerMugics = this.burstPriority === 1 ? this.playerMugics : this.p2Mugics;

        if (!playerMugics || playerMugics.length === 0) {
            handContainer.innerHTML = '<span style="color:#e74c3c;">Nenhuma Mugic na mão!</span>';
        } else {
            const tribeColors = { OverWorld:'#2980b9', UnderWorld:'#8e44ad', Mipedian:'#e67e22', Danian:'#27ae60', Generic:'#7f8c8d' };
            const ac = this.activeCombat;
            const isP1 = this.burstPriority === 1;
            const myCard    = ac ? (isP1 ? ac.p1Card : ac.p2Card) : null;
            const enemyCard = ac ? (isP1 ? ac.p2Card : ac.p1Card) : null;

            // Gera texto de impacto contextual para cada mugic
            const impactText = (mg) => {
                const healTypes = ['heal','conditional_heal','heal_and_grant_element','heal_and_reduce_fire'];
                const et = mg.effectType;
                if (healTypes.includes(et)) {
                    const v = mg.effectValue || mg.healValue || '?';
                    return { icon:'💚', text: `Cura +${v} HP em ${myCard ? myCard.name : 'aliada'}`, color:'#4ade80' };
                }
                if (et === 'damage') {
                    const v = mg.effectValue || '?';
                    return { icon:'💥', text: `Causa ${v} de dano em ${enemyCard ? enemyCard.name : 'inimiga'}`, color:'#f87171' };
                }
                if (et === 'energy_steal') {
                    return { icon:'🔄', text: `+${mg.gainValue||'?'} para ${myCard?.name||'aliada'}, -${mg.lossValue||'?'} para ${enemyCard?.name||'inimiga'}`, color:'#c4b5fd' };
                }
                if (et === 'energy_transfer') {
                    return { icon:'🔄', text: `Transfere vida entre ${myCard?.name||'aliada'} e ${enemyCard?.name||'inimiga'}`, color:'#c4b5fd' };
                }
                if (['buff_all_stats','buff_combat_stats'].includes(et)) {
                    return { icon:'⬆️', text: `Aumenta stats de ${myCard?.name||'aliada'}`, color:'#60a5fa' };
                }
                if (et === 'damage_reduction_aura') {
                    return { icon:'🛡️', text: `Reduz dano elemental recebido por ${myCard?.name||'aliada'}`, color:'#34d399' };
                }
                if (['debuff_all_stats','debuff_combat_stats'].includes(et)) {
                    return { icon:'⬇️', text: `Reduz stats de ${enemyCard?.name||'inimiga'}`, color:'#f87171' };
                }
                if (et === 'destroy_battlegear') {
                    return { icon:'🗡️', text: `Destrói o battlegear de ${enemyCard?.name||'inimiga'}`, color:'#fb923c' };
                }
                if (et === 'negate_mugic') {
                    return { icon:'🚫', text: 'Nega a próxima mugic inimiga no burst', color:'#ef4444' };
                }
                if (et === 'grant_element') {
                    return { icon:'✨', text: `Concede elemento ${mg.grantElement||'?'} à ${myCard?.name||'aliada'}`, color:'#fbbf24' };
                }
                if (et === 'remove_abilities') {
                    return { icon:'🔕', text: `Remove habilidades de ${enemyCard?.name||'inimiga'}`, color:'#94a3b8' };
                }
                return { icon:'🎶', text: mg.description || 'Efeito especial', color:'#94a3b8' };
            };

            playerMugics.forEach((mg, i) => {
                const tc = tribeColors[mg.tribe] || '#7f8c8d';
                const { icon, text, color } = impactText(mg);

                // Calcula quem pode pagar, incluindo penalidade tribal
                const myBoard = isP1 ? this.boardP1 : this.boardP2;
                const payers  = []; // { name, cost, canPay, penalty }
                for (const row of myBoard) for (const c of row) {
                    if (!c) continue;
                    const penalty = (mg.tribe !== 'Generic' && mg.tribe !== c.tribe) ? 1 : 0;
                    const realCost = mg.cost + penalty;
                    payers.push({ name: c.name, cost: realCost, canPay: c.mugicCounters >= realCost, penalty, counters: c.mugicCounters });
                }
                const canAfford = payers.some(p => p.canPay);

                // Mostra quem pode pagar
                const payersHtml = payers.map(p => {
                    const penaltyTxt = p.penalty ? ` <span style="color:#f59e0b;font-size:9px;">(+1 tribo diferente)</span>` : '';
                    const costColor  = p.canPay ? '#4ade80' : '#ef4444';
                    return `<div style="font-size:10px;color:${costColor};">
                        ${p.canPay ? '✅' : '❌'} ${p.name}: ${p.counters}/${p.cost}♪${penaltyTxt}
                    </div>`;
                }).join('');

                handContainer.innerHTML += `
                    <div onclick="${canAfford ? `game.selectMugicToPlay(${i})` : ''}"
                         style="background:#0f1a24;border:2px solid ${canAfford?tc:'#334155'};padding:10px;border-radius:10px;
                                cursor:${canAfford?'pointer':'not-allowed'};width:190px;display:flex;flex-direction:column;gap:5px;
                                transition:all 0.15s;opacity:${canAfford?1:0.45};"
                         ${canAfford ? `onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 6px 18px rgba(0,0,0,0.6)'"
                         onmouseout="this.style.transform='';this.style.boxShadow=''"` : ''}>

                        <!-- Header: nome + custo base -->
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px;">
                            <div style="font-weight:800;color:#f1c40f;font-size:12px;line-height:1.2;flex:1;">${mg.name}</div>
                            <div style="font-size:13px;color:#9b59b6;font-weight:800;flex-shrink:0;">${mg.cost}♪</div>
                        </div>

                        <!-- Tribo + raridade -->
                        <div style="display:flex;align-items:center;gap:4px;">
                            <span style="font-size:9px;background:${tc};color:#fff;border-radius:4px;padding:1px 6px;font-weight:700;">${mg.tribe}</span>
                            <span style="font-size:9px;color:#64748b;">${mg.rarity||''}</span>
                        </div>

                        <!-- Separador -->
                        <div style="height:1px;background:rgba(255,255,255,0.08);"></div>

                        <!-- IMPACTO -->
                        <div style="background:${color}18;border:1px solid ${color}44;border-radius:6px;padding:5px 7px;">
                            <div style="font-size:10px;font-weight:700;color:${color};margin-bottom:2px;">${icon} ${text}</div>
                        </div>

                        <!-- Quem pode pagar -->
                        <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:5px 7px;">
                            <div style="font-size:9px;color:#64748b;margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em;">Quem pode pagar:</div>
                            ${payersHtml}
                        </div>

                        ${!canAfford ? `<div style="font-size:10px;color:#ef4444;text-align:center;font-weight:700;">❌ Nenhuma criatura tem counters suficientes</div>` : ''}
                    </div>
                `;
            });
        }

        mugicSel.classList.remove('hidden');
    },

    selectMugicToPlay(index, fromRemote = false) {
        // Se é chamada REMOTA: não fazer nada — o burst stack é atualizado quando
        // resolveMugicCaster chegar com os dados completos.
        if (fromRemote) return;

        // É o turno LOCAL do jogador atual? (funciona para P1 e P2 em multiplayer)
        const myPNum = this.multiplayerMode ? this.myPlayerNumber : 1;
        const isMyLocalBurstTurn = this.burstPriority === myPNum;

        const playerMugics = this.playerMugics; // minha mão (sempre playerMugics do lado local)
        const mg = playerMugics[index];
        if (!mg) return;

        // Envia para o oponente com dados completos da mugic
        this.sendAction('selectMugic', { index, mugicData: mg, casterPlayerNum: myPNum });

        if (isMyLocalBurstTurn) {
            // É a vez do JOGADOR LOCAL — entra em SELECT_MUGIC_CASTER
            this.pendingMugicIndex = index;
            this.gameState = 'SELECT_MUGIC_CASTER';
            this.closeBurstModal();
            this.log(`🪄 Você escolheu [${mg.name}] (custo base: ${mg.cost}♪). Clique na criatura que vai pagar — criaturas de tribo diferente pagam +1♪ extra!`);
            this.renderBoard();
        } else {
            // É a vez da IA (solo) — adiciona direto ao burst
            this.burstStack.push({
                type:      'mugic',
                source:    'IA (Oponente)',
                playerNum: 2,
                mugic:     mg,
                caster:    null,
                description: `Mugic Cast: ${mg.name} (por ?)`
            });
            if (typeof this._syncBurstSidePanel === 'function') this._syncBurstSidePanel();
            this._discardMugic(2, this.p2Mugics, index);
            this.burstPasses   = 0;
            this.burstPriority = 1;
            this.openBurstModal();
        }
    },

    resolveMugicCaster(r, c, fromRemote = false) {
        if (!fromRemote) {
            if (this.gameState !== 'SELECT_MUGIC_CASTER') return;
            if (this.pendingMugicIndex === null || this.pendingMugicIndex === undefined) return;
        }

        // ── Determina contexto ───────────────────────────────────────────────
        const myPNum    = this.multiplayerMode ? this.myPlayerNumber : 1;
        const isLocalP2 = !fromRemote && myPNum === 2;

        // ── Caminho REMOTO: oponente resolveu um caster ───────────────────────
        if (fromRemote) {
            // Qual jogador fez o cast? (guardado antes de chamar esta função)
            const casterPN    = this._pendingRemoteCasterPlayerNum || 2;
            const remoteMg    = this._pendingRemoteMugicData;
            const casterBoard = casterPN === 1 ? this.boardP1 : this.boardP2;
            const casterCard  = casterBoard[r] && casterBoard[r][c];

            if (remoteMg && casterCard) {
                // Adiciona ao burst stack com source/playerNum corretos
                const srcName = casterPN === 1
                    ? (this.p1Name || 'Jogador 1')
                    : (this.p2Name || 'Jogador 2');
                this.burstStack.push({
                    type:      'mugic',
                    source:    srcName,
                    playerNum: casterPN,
                    mugic:     remoteMg,
                    caster:    casterCard,
                    description: `Mugic Cast: ${remoteMg.name} (por ${casterCard.name})`
                });
                if (typeof this._syncBurstSidePanel === 'function') this._syncBurstSidePanel();
                // Descarta da mão do caster remoto
                if (casterPN === 1) this._discardMugic(1, this.playerMugics, this.pendingMugicIndex || 0);
                // (P2's mugic já foi descartada no lado do P2 antes de enviar)
            }

            this._pendingRemoteMugicData      = null;
            this._pendingRemoteCasterPlayerNum = null;

            // Depois do cast remoto, é a VEZ DO RECEPTOR responder
            this.burstPasses   = 0;
            this.burstPriority = this.multiplayerMode ? this.myPlayerNumber : 1;
            this.openBurstModal();
            return;
        }

        // ── Caminho LOCAL ────────────────────────────────────────────────────
        const localPlayerNum = isLocalP2 ? 2 : 1;
        const mg   = this.playerMugics[this.pendingMugicIndex];
        const card = isLocalP2 ? this.boardP2[r][c] : this.boardP1[r][c];

        if (!mg)   { this.cancelMugicCaster(); return; }
        if (!card) { this.cancelMugicCaster(); return; }

        // Envia para o oponente com dados completos
        this.sendAction('resolveMugicCaster', { r, c, mugicData: mg, casterPlayerNum: localPlayerNum });

        // Verificar penalidade tribal
        let cost = mg.cost;
        if (mg.tribe !== "Generic" && mg.tribe !== card.tribe) {
            cost += 1;
        }

        // Iron Balls
        if (this._ironBallsActive && mg.tribe !== 'Generic') {
            this.showAlert("Bloqueado por Iron Balls", `🚫 Iron Balls está ativo!\nApenas Mugics Genéricas podem ser jogadas neste burst.`).then(() => this.openBurstModal());
            return;
        }

        // Restrições do Local
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
            if (locEffect.type === 'mugic_discount_tribe_first' && mg.tribe === locEffect.tribe) {
                // Desconto só se a criatura ainda não usou a primeira mugic da tribo neste combate
                const discountKey = `_usedMugicDiscount_${this.activeLocation.id}`;
                if (!card[discountKey]) {
                    const discount = locEffect.value || 1;
                    cost = Math.max(0, cost - discount);
                    card[discountKey] = true;
                    this.log(`📍 [${this.activeLocation.name}] ${card.name} (${mg.tribe}): -${discount} ♪ de desconto na primeira Mugic!`);
                }
            }
        }

        if (card.mugicCounters < cost) {
            const errorMsg = `⚠️ ${card.name} não tem contadores suficientes!\nA Mugic custa ${cost} ♪ (Custo Base: ${mg.cost} + Penalidade de Tribo: ${cost - mg.cost}).\nA criatura tem apenas ${card.mugicCounters} ♪.`;
            this.log(errorMsg);
            this.showAlert("Custo Insuficiente", errorMsg).then(() => { this.openBurstModal(); });
            return;
        }

        // Paga o custo
        card.mugicCounters -= cost;
        this.log(`🎶 ${card.name} pagou ${cost} ♪ e conjurou [${mg.name}]!`);

        // Adiciona à pilha com playerNum correto
        const mySource = isLocalP2 ? (this.p2Name || 'Jogador 2') : (this.p1Name || 'Jogador 1');
        this.burstStack.push({
            type:      'mugic',
            source:    mySource,
            playerNum: localPlayerNum,
            mugic:     mg,
            caster:    card,
            description: `Mugic Cast: ${mg.name} (por ${card.name})`
        });
        if (typeof this._syncBurstSidePanel === 'function') this._syncBurstSidePanel();

        // Remove da mão correta → discard pile
        this._discardMugic(localPlayerNum, this.playerMugics, this.pendingMugicIndex);

        // Limpa estado
        this.pendingMugicIndex = null;
        this.gameState         = 'ENGAGED_COMBAT';

        // Passa a vez para o oponente no burst
        this.burstPasses   = 0;
        this.burstPriority = isLocalP2 ? 1 : 2; // oposto de quem acabou de agir
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
        if (this.isSpectator && !fromRemote) return;
        if (!fromRemote) {
            this.sendAction('passBurst');
            this.sfxPass && this.sfxPass();
        }
        const passerLabel = this.burstPriority === 1
            ? (this.p1Name || 'Jogador 1')
            : (this.multiplayerMode ? (this.p2Name || 'Jogador 2') : 'IA (Oponente)');
        this.log(`${passerLabel} passou a prioridade.`);
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
        // Iron Pillar: battlegears não têm habilidades neste local
        if (this.activeLocation?.effect?.type === 'no_battlegear_abilities') {
            this.showAlert('⛔ Iron Pillar', 'Neste local, Battlegears não possuem habilidades e não podem ser sacrificados!');
            return;
        }
        const myCard = this.burstPriority === 1 ? this.activeCombat.p1Card : this.activeCombat.p2Card;
        const oppCard = this.burstPriority === 1 ? this.activeCombat.p2Card : this.activeCombat.p1Card;
        if (!myCard || !myCard.battlegear || !myCard.battlegear.sacrificeEffect) return;

        const bg  = myCard.battlegear;
        const eff = bg.sacrificeEffect;
        this.log(`⚔️ ${myCard.name} sacrificou [${bg.name}]!`);
        this.sfxSacrifice && this.sfxSacrifice();

        switch (eff.type) {
            case 'grant_element':
                if (!myCard.elements) myCard.elements = [];
                if (!myCard.elements.includes(eff.element)) {
                    myCard.elements.push(eff.element);
                    this.log(`✨ ${myCard.name} ganhou ${eff.element} até o fim do combate!`);
                }
                break;
            case 'heal_target':
                myCard.energy = Math.min(myCard.maxEnergy, myCard.energy + eff.value);
                this.log(`💚 ${myCard.name} curou ${eff.value} de Energia! (agora ${myCard.energy})`);
                this._spawnFloatingNumber(myCard, eff.value, 'heal');
                break;
            case 'damage_target':
                oppCard.energy = Math.max(0, oppCard.energy - eff.value);
                this.log(`💥 [${bg.name}] causou ${eff.value} de dano a ${oppCard.name}! (${oppCard.energy} restante)`);
                this._spawnFloatingNumber(oppCard, eff.value, 'sacrifice');
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
        this._stopTabFlash(); // para o pisca-pisca ao fechar
    },

    /** Atualiza o painel lateral de burst stack (side panel) */
    _syncBurstSidePanel() {
        const _bss = document.getElementById('burst-side-stack');
        if (!_bss) return;
        _bss.innerHTML = [...this.burstStack].reverse().map((item, idx) => {
            const neg = item.negated ? ' <span style="color:#e74c3c;font-size:9px;font-weight:700;">🚫 NEGADA</span>' : '';
            const isAtk = item.type === 'attack';
            const icon = isAtk ? '⚔️' : '🎶';
            const label = isAtk ? (item.atkCard ? item.atkCard.name : item.description)
                                : (item.mugic?.name || item.description || '?');
            const img = isAtk && item.atkCard?.image
                ? `<img src="${item.atkCard.image}" style="width:32px;height:42px;object-fit:cover;border-radius:4px;flex-shrink:0;border:1px solid #334155;" alt="">`
                : (item.mugic?.image ? `<img src="${item.mugic.image}" style="width:32px;height:42px;object-fit:cover;border-radius:4px;flex-shrink:0;border:1px solid #7c3aed44;" alt="">` : `<div style="width:32px;height:42px;background:#1e293b;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${icon}</div>`);
            const typeLabel = isAtk ? 'ATAQUE' : 'MUGIC';
            const typeColor = isAtk ? '#f59e0b' : '#a855f7';
            return `<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);${item.negated?'opacity:0.5;':''}">
                ${img}
                <div style="flex:1;min-width:0;">
                    <div style="font-size:8px;font-weight:700;color:${typeColor};text-transform:uppercase;letter-spacing:.08em;">${typeLabel}${neg}</div>
                    <div style="font-size:11px;font-weight:700;color:#f1f5f9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${label}</div>
                    <div style="font-size:9px;color:#64748b;">${item.source || ''}</div>
                </div>
                <div style="font-size:10px;font-weight:900;color:#f1c40f;flex-shrink:0;">${this.burstStack.length - idx}</div>
            </div>`;
        }).join('') || '<div style="font-size:11px;color:#475569;padding:6px 0;">Pilha vazia</div>';
    },

    async resolveBurst() {
        // Esconde painéis laterais de burst
        const _bspEl = document.getElementById('burst-side-panel');
        if (_bspEl) _bspEl.classList.remove('visible');
        const _blpEl = document.getElementById('burst-log-panel');
        if (_blpEl) _blpEl.classList.remove('visible');
        this._burstLogEl = null;

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

        // Determina quem é aliado e quem é inimigo baseado no playerNum
        // (não usar item.source pois pode ser nome personalizado como 'sacticio')
        const isPlayer1 = item.playerNum === 1;
        // Song of Deflection: se retargeted, inverte aliado/inimigo
        const allyCard  = item.retargeted
            ? (isPlayer1 ? p2Card : p1Card)
            : (isPlayer1 ? p1Card : p2Card);
        const enemyCard = item.retargeted
            ? (isPlayer1 ? p1Card : p2Card)
            : (isPlayer1 ? p2Card : p1Card);

        // Log descritivo: quem usou, quem pagou, qual mugic
        const casterLabel = caster ? ` (paga por ${caster.name})` : '';
        this.log(`🎶 ${item.source}${casterLabel} usou [${mg.name}]!`);
        if (this.activeCombat) {
            this.activeCombat.mugicHistory.push({
                player: item.source,
                mugicName: mg.name,
                targetName: caster ? caster.name : '?'
            });
        }
        let alertMsg = `🎶 MUGIC: ${mg.name}\nUsada por: ${item.source}${casterLabel}\n\n`;
        let oldVal;

        // Contador de mugics para a tela de fim de jogo
        if (this._stats) this._stats.mugics++;

        // Som de mugic
        if (mg.effectType === 'negate_mugic') this.sfxMugicNegate && this.sfxMugicNegate();
        else this.sfxMugic && this.sfxMugic();

        switch (mg.effectType) {

            // ── CURA ─────────────────────────────────────────────────────────
            case "heal":
                oldVal = allyCard.energy;
                allyCard.energy = Math.min(allyCard.maxEnergy, allyCard.energy + mg.effectValue);
                alertMsg += `✅ Alvo da cura: ${allyCard.name}\n+${mg.effectValue} de Energia (${oldVal} → ${allyCard.energy})`;
                this.log(`💚 [${mg.name}] curou ${allyCard.name} em +${mg.effectValue} HP! (${oldVal} → ${allyCard.energy})`);
                if (this.activeCombat) this.activeCombat.healHistory.push({ targetName: allyCard.name, amount: mg.effectValue, source: mg.name });
                this._spawnFloatingNumber(allyCard, mg.effectValue, 'heal');
                break;

            case "conditional_heal": {
                const hasEl = (allyCard.elements || []).some(e => (mg.conditionElements || []).includes(e));
                if (hasEl) {
                    oldVal = allyCard.energy;
                    allyCard.energy = Math.min(allyCard.maxEnergy, allyCard.energy + mg.effectValue);
                    alertMsg += `Alvo: ${allyCard.name}\nTem o elemento necessário! Curou ${mg.effectValue}. (${oldVal} → ${allyCard.energy})`;
                    this.log(`💚 ${allyCard.name} curou ${mg.effectValue} de Energia!`);
                    this._spawnFloatingNumber(allyCard, mg.effectValue, 'heal');
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
                this._spawnFloatingNumber(allyCard, mg.healValue, 'heal');
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
                    this._spawnFloatingNumber(target, mg.healValue, 'heal');
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
                alertMsg += `🎯 Alvo do dano: ${enemyCard.name}\n-${mg.effectValue} HP (${oldVal} → ${Math.max(0,enemyCard.energy)})`;
                this.log(`💥 [${mg.name}] causou ${mg.effectValue} de dano a ${enemyCard.name}! (${oldVal} → ${Math.max(0,enemyCard.energy)})`);
                this._spawnFloatingNumber(enemyCard, mg.effectValue, 'mugic');
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
                    this._spawnFloatingNumber(enemyCard, mg.effectValue, 'mugic');
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
                this._spawnFloatingNumber(enemyCard, mg.effectValue, 'mugic');
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
                alertMsg += `💚 Beneficiada: ${allyCard.name} +${mg.gainValue} HP\n💥 Prejudicada: ${enemyCard.name} -${mg.lossValue} HP`;
                this.log(`🔄 [${mg.name}]: ${allyCard.name} +${mg.gainValue} HP 💚 / ${enemyCard.name} -${mg.lossValue} HP 💥`);
                this._spawnFloatingNumber(allyCard, mg.gainValue, 'heal');
                this._spawnFloatingNumber(enemyCard, mg.lossValue, 'drain');
                break;

            case "energy_transfer":
                // Song of Symmetry: aliado +10, inimigo -10
                allyCard.energy = Math.min(allyCard.maxEnergy, allyCard.energy + (mg.gainValue||0));
                enemyCard.energy -= (mg.lossValue||0);
                alertMsg += `💚 Beneficiada: ${allyCard.name} +${mg.gainValue} HP\n💥 Prejudicada: ${enemyCard.name} -${mg.lossValue} HP`;
                this.log(`🔄 [${mg.name}]: ${allyCard.name} +${mg.gainValue} HP 💚 / ${enemyCard.name} -${mg.lossValue} HP 💥`);
                this._spawnFloatingNumber(allyCard, mg.gainValue, 'heal');
                this._spawnFloatingNumber(enemyCard, mg.lossValue, 'drain');
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
                // Lake Ken-I-Po: Mugics são untargetable — não podem ser negadas
                const locEfNeg = this.activeLocation && this.activeLocation.effect;
                if (locEfNeg && locEfNeg.type === 'mugic_untargetable') {
                    alertMsg += `🛡️ [Lake Ken-I-Po] Mugics são Untargetable neste local — negação bloqueada!`;
                    this.log(`📍 [Lake Ken-I-Po] ${mg.name} não pode negar Mugics aqui!`);
                    break;
                }
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

            case "retarget_mugic": {
                // Encontra a mugic de alvo único mais recente não negada na pilha
                const singleTargetTypes = [
                    'heal','damage','buff_combat_stats','debuff_all_stats','buff_all_stats',
                    'grant_element_choice','grant_elements','heal_and_grant_element',
                    'damage_and_grant_element','energy_steal','grant_invisibility',
                    'remove_invisibility','remove_abilities','destroy_battlegear',
                    'grant_range_swift','damage_reduction_aura','buff_per_danian',
                    'conditional_heal','damage_if_element','prevent_movement'
                ];
                let retargetIdx = -1;
                for (let i = this.burstStack.length - 1; i >= 0; i--) {
                    const item = this.burstStack[i];
                    if (item.type === 'mugic' && !item.negated
                        && singleTargetTypes.includes(item.mugic.effectType)) {
                        retargetIdx = i;
                        break;
                    }
                }
                if (retargetIdx === -1) {
                    alertMsg += `↩️ Nenhuma Mugic de alvo único válida na pilha para redirecionar.`;
                    this.log(`↩️ Song of Deflection: nenhum alvo válido.`);
                } else {
                    const target = this.burstStack[retargetIdx];
                    // Inverte o alvo: marca o item como "retargeted"
                    target.retargeted = !target.retargeted;
                    const newTarget = target.retargeted ? 'criatura inimiga' : 'criatura aliada';
                    target.description = `[REDIRECIONADA → ${newTarget}] ${target.mugic.name}`;
                    alertMsg += `↩️ [${target.mugic.name}] foi redirecionada para a ${newTarget}!`;
                    this.log(`↩️ Song of Deflection: [${target.mugic.name}] agora afeta a ${newTarget}!`);
                }
                break;
            }

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
