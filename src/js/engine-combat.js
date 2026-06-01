// engine-combat.js

/** Delays (ms) usados no fluxo de combate — altere aqui para ajustar o ritmo do jogo. */
const COMBAT_DELAY = {
    NEXT_TURN:      1500,   // após fim de combate → próximo turno
    NEXT_STRIKE:    1000,   // entre strikes dentro de um combate
    COMBAT_START:   2600,   // banner de iniciativa antes do 1º strike
    ANIMATION:       800,   // animação de ataque / morte
};

Object.assign(GameEngine.prototype, {

    startCombat(attacker, defender, atkR, atkC, defR, defC, initiatingPlayer, fromRemote = false) {
        this.gameState = 'ENGAGED_COMBAT';

        // O local já foi revelado na startBattle ou no fim do último combate.
        // Apenas informa no log em qual local a batalha vai acontecer:
        if (this.activeLocation) {
            this.log(`📍 Iniciando combate no local: ${this.activeLocation.name}!`);
        }

        // Battlegears são revelados apenas quando o ataque é CONFIRMADO (confirmAttack)
        // — não ao selecionar o alvo — para evitar que o jogador "espia" os equipamentos
        // inimigos cancelando o combate antes de atacar.

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
        setTimeout(() => this.processCombatTurn(), COMBAT_DELAY.COMBAT_START);
    },

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
                [c1, c2].forEach(c => {
                    c.energy -= ef.value;
                    this._spawnFloatingNumber(c, ef.value, 'location');
                });
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
                        this._spawnFloatingNumber(c, ef.value, 'location');
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
            case "extra_mugic_cost_tribe":
                this.log(`📍 [${loc}] Efeito ativo: ${this.activeLocation.description}`);
                break;

            case "no_battlegear_abilities":
                this.log(`📍 [${loc}] ⛔ Battlegears não têm habilidades neste local!`);
                break;

            case "mugic_discount_tribe_first":
            case "mugic_untargetable":
            case "underworld_city_bonus":
                // Passivos aplicados durante o combate — apenas informa
                this.log(`📍 [${loc}] Efeito ativo: ${this.activeLocation.description}`);
                break;

            case "combat_start_return_mugic": {
                // Castle Bodhran: cada jogador pode retornar uma Mugic do descarte para a mão
                let returned = false;
                if (this.p1MugicDiscard && this.p1MugicDiscard.length > 0) {
                    const mg = this.p1MugicDiscard.pop();
                    this.playerMugics.push(mg);
                    this.log(`📍 [${loc}] Jogador 1 retornou [${mg.name}] do descarte para a mão!`);
                    returned = true;
                }
                if (this.p2MugicDiscard && this.p2MugicDiscard.length > 0) {
                    const mg = this.p2MugicDiscard.pop();
                    this.p2Mugics.push(mg);
                    this.log(`📍 [${loc}] Jogador 2 retornou [${mg.name}] do descarte para a mão!`);
                    returned = true;
                }
                if (!returned) {
                    this.log(`📍 [${loc}] Nenhuma Mugic no descarte para retornar.`);
                }
                this.renderMugics();
                break;
            }
        }
    },

    /** Retorna { hand, deck, discard } do deck de ataque do player indicado. */
    _getAttackAssets(player) {
        const p = player === 1 ? 'p1' : 'p2';
        return {
            hand:    this[`${p}AttackHand`],
            deck:    this[`${p}AttackDeck`],
            discard: this[`${p}AttackDiscard`],
        };
    },

    // ── Stats efetivos de uma criatura (base + sinergia + local + battlegear) ──
    // Usado em executeAttack, showAttackModal, _getCombatPreview e resolveAttack.
    _effectiveStats(card, player, r, c) {
        const syn   = this.getSynergyBonus(player, r, c) || {};
        const loc   = (this.activeLocation && this.activeLocation.modifiers) || {};
        const bg    = (card.bgRevealed && card.battlegear && card.battlegear.modifiers) || {};
        return {
            courage: card.courage + (syn.courage||0) + (loc.courage||0) + (bg.courage||0),
            power:   card.power   + (syn.power  ||0) + (loc.power  ||0) + (bg.power  ||0),
            wisdom:  card.wisdom  + (syn.wisdom ||0) + (loc.wisdom ||0) + (bg.wisdom ||0),
            speed:   card.speed   + (syn.speed  ||0) + (loc.speed  ||0) + (bg.speed  ||0),
        };
    },

    // ── Prévia de combate ao selecionar atacante ─────────────────────────────
    // Retorna { verdict, label, initiative, myDmg, theirDmg, color, border }
    _getCombatPreview(attacker, atkR, atkC, atkPlayer, defender, defR, defC) {
        const defPlayer = atkPlayer === 1 ? 2 : 1;
        const ea = this._effectiveStats(attacker, atkPlayer, atkR, atkC);
        const ed = this._effectiveStats(defender, defPlayer, defR, defC);

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
    },

    processCombatTurn() {
        if (!this.activeCombat) return;

        const { p1Card, p2Card, currentStriker, p1R, p1C, p2R, p2C } = this.activeCombat;

        if (currentStriker === 1) {
            this.pendingCombat = {
                attacker: p1Card, defender: p2Card,
                atkR: p1R, atkC: p1C, defR: p2R, defC: p2C,
                attackingPlayer: 1
            };
            // ── Draw ANTES de mostrar o modal (P1 escolhe entre 3) ──────────
            this.drawAttackCard(1);

            if (this.multiplayerMode && this.myPlayerNumber === 2) {
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

            // ── Draw ANTES de mostrar o modal (P2 escolhe entre 3) ──────────
            this.drawAttackCard(2);

            if (this.multiplayerMode) {
                if (this.myPlayerNumber === 2) {
                    this.showAttackModal(p2Card, p1Card, p2R, p2C, p1R, p1C, 2);
                }
            } else {
                // Single-player: IA escolhe automaticamente entre 3 cartas
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
    },

    showAttackModal(attacker, defender, atkR, atkC, defR, defC, attackingPlayer) {

        const modal = document.getElementById("attack-modal");
        const container = document.getElementById("attack-cards-container");
        if (!modal || !container) {
            this.resolveAttack(attacker, defender, atkR, atkC, defR, defC, attackingPlayer);
            return;
        }

        const defPlayer = attackingPlayer === 1 ? 2 : 1;
        const effAtk = this._effectiveStats(attacker, attackingPlayer, atkR, atkC);
        const effDef = this._effectiveStats(defender, defPlayer, defR, defC);

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
                elementsHtml = `<div class="card-elements-row">`;
                card.elements.forEach(el => {
                    elementsHtml += `<div title="${el}" style="background: rgba(0,0,0,0.8); border: 1px solid #7f8c8d; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-size: 14px;">${iconMap[el] || '✨'}</div>`;
                });
                elementsHtml += `</div>`;
            }

            return `
            <div class="combat-card ${label === 'Atacante' ? 'combat-card--attacker' : 'combat-card--defender'}">
                <h3 class="${label === 'Atacante' ? 'attacker-label' : 'defender-label'}">${label}</h3>
                <div class="card-rarity-icon rarity-${(card.rarity || 'Common').toLowerCase().replace(/\s+/g, '-')}" title="${card.rarity || 'Common'}">${card.rarity === 'Ultra Rare' ? '💎' : card.rarity === 'Super Rare' ? '🔷' : card.rarity === 'Rare' ? '🔶' : card.rarity === 'Legendary' ? '🌟' : '⚪'}</div>
                <div class="card-tribe">${card.tribe}</div>
                <div class="card-name combat-card-name">${card.name}</div>
                <div class="card-image-container combat-card-image">
                    ${card.image ? `<img src="${card.image}" style="width: 100%; height: 100%; object-fit: cover;" alt="${card.name}">` : `<div class="card-image-placeholder">Sem Imagem</div>`}
                </div>
                ${card.battlegear ? `<div class="combat-card-battlegear" title="${card.battlegear.description || 'Equipamento'}">🗡️ ${card.battlegear.name}${!card.bgRevealed ? ' <span style="font-size:9px;opacity:0.6;">(oculto ao oponente)</span>' : ''}</div>` : ''}
                ${elementsHtml}

                <div class="card-stats" style="grid-template-columns: 1fr 1fr;">
                    <div class="stat-box" data-tip="Coragem — define quem ataca primeiro na iniciativa. Usada em ataques de Courage e pela passiva Intimidate."><span class="stat-icon">⚔️</span><span class="stat-label">COR</span><span class="stat-value">${effStats.courage}</span></div>
                    <div class="stat-box" data-tip="Poder — usado em ataques físicos de Poder. Quanto maior, mais dano em ataques de Power."><span class="stat-icon">💪</span><span class="stat-label">POD</span><span class="stat-value">${effStats.power}</span></div>
                    <div class="stat-box" data-tip="Sabedoria — usado em ataques mágicos de Sabedoria. Também define quem pode conjurar Mugics mais caras."><span class="stat-icon">🧠</span><span class="stat-label">SAB</span><span class="stat-value">${effStats.wisdom}</span></div>
                    <div class="stat-box" data-tip="Velocidade — usado em ataques de Speed e na disputa de iniciativa. Swift aumenta este valor."><span class="stat-icon">⚡</span><span class="stat-label">VEL</span><span class="stat-value">${effStats.speed}</span></div>
                </div>
                <div class="combat-card-hp">❤️ ${effEnergy} / ${maxEnergy}</div>
                <div class="combat-card-mugics">${mugicHtml}</div>
            </div>
            `;
        };

        const hand = attackingPlayer === 1 ? this.p1AttackHand : this.p2AttackHand;
        let handHtml = `<div class="combat-hand-col">
            <div class="combat-vs">VS</div>
            <div class="combat-select-label">Selecione sua Carta de Ataque:</div>
            <div class="combat-attack-row">`;

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
                const sp = atkCard.specialEffect;

                // ── Calcula dano estimado para cada tipo de specialEffect ────────
                if (sp.type === 'megaroar') {
                    // +value dano para cada stat do atacante ≥ threshold
                    let megaroarDmg = 0;
                    const statIcons2 = { courage:'⚔️', power:'💪', wisdom:'🧠', speed:'⚡' };
                    ['courage','power','wisdom','speed'].forEach(s => {
                        const av = effAtk[s] || 0;
                        const passes = av >= sp.threshold;
                        if (passes) megaroarDmg += sp.value;
                        rows.push({
                            ok: passes,
                            text: `${statIcons2[s]} ${s.charAt(0).toUpperCase()+s.slice(1)} ${av} ${passes ? `≥` : `<`} ${sp.threshold} → ${passes ? `+${sp.value} dano` : '0'}`
                        });
                    });
                    expectedDamage += megaroarDmg;
                } else if (sp.type === 'double_challenge') {
                    // dois challenges — bônus se ambos passarem
                    let allPass = true;
                    (sp.checks || []).forEach(ck => {
                        const av = effAtk[ck.stat] || 0;
                        const dv = effDef[ck.stat] || 0;
                        const passes = av > dv + ck.threshold;
                        if (!passes) allPass = false;
                        rows.push({ ok: passes, text: `${ck.stat.toUpperCase()} challenge ${ck.threshold} (você ${av} vs ${dv}+${ck.threshold})` });
                    });
                    if (allPass) expectedDamage += sp.bonusDamage || 0;
                } else {
                    // outros: só descrição
                    const efDesc = describeSpecial(sp);
                    if (efDesc) rows.push({ ok: 'special', text: efDesc });
                }
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

        // ── Banner de Iniciativa ───────────────────────────────────────────────
        const initStat = (this.activeLocation && this.activeLocation.initiative)
            ? this.activeLocation.initiative.toLowerCase() : 'speed';
        const initStatLabel = { courage:'Coragem', power:'Poder', wisdom:'Sabedoria', speed:'Velocidade' }[initStat] || initStat;
        const initIcon      = { courage:'⚔️', power:'💪', wisdom:'🧠', speed:'⚡' }[initStat] || '⚡';

        // Stats efetivos de iniciativa (com Swift para velocidade)
        const locMod  = (this.activeLocation && this.activeLocation.modifiers) ? this.activeLocation.modifiers : {};
        let atkInitVal = (effAtk[initStat] || 0) + (locMod[initStat] || 0);
        let defInitVal = (effDef[initStat] || 0) + (locMod[initStat] || 0);

        // Swift aumenta a velocidade efetiva de iniciativa
        const applySwift = (card, baseVal) => {
            if (initStat !== 'speed') return baseVal;
            let bonus = 0;
            (card.passives || []).forEach(p => {
                const pid = typeof p === 'string' ? p : p.id;
                if (pid === 'swift') bonus += (typeof p === 'object' ? p.value : 10);
            });
            return baseVal + bonus;
        };
        atkInitVal = applySwift(attacker, atkInitVal);
        defInitVal = applySwift(defender, defInitVal);

        const playerGoesFirst = atkInitVal >= defInitVal; // atacante = quem iniciou o combate
        const iAmAttacker     = attackingPlayer === 1;     // true se for o turno do jogador humano

        // "Você ataca primeiro" só faz sentido em single-player (P1 = humano)
        const youGoFirst   = iAmAttacker ? playerGoesFirst : !playerGoesFirst;
        const bannerColor  = youGoFirst ? '#22c55e' : '#ef4444';
        const bannerBg     = youGoFirst ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.12)';
        const bannerEmoji  = youGoFirst ? '⚡' : '⚠️';
        const bannerText   = youGoFirst ? 'Você ataca primeiro!' : 'Inimigo ataca primeiro!';

        const initiativeBannerHtml = `
            <div style="
                display:flex; align-items:center; justify-content:center; gap:16px;
                background:${bannerBg}; border:1px solid ${bannerColor}40;
                border-radius:10px; padding:10px 18px; margin-bottom:10px;
                flex-wrap:wrap;
            ">
                <div style="font-size:18px; font-weight:800; color:${bannerColor}; letter-spacing:.02em;">
                    ${bannerEmoji} ${bannerText}
                </div>
                <div style="display:flex; align-items:center; gap:10px; font-size:13px; color:#94a3b8;">
                    <span style="color:#f8fafc; font-weight:600;">${attacker.name}</span>
                    <span style="background:rgba(255,255,255,0.08); border-radius:6px; padding:3px 8px; color:#f8fafc;">
                        ${initIcon} ${atkInitVal}
                    </span>
                    <span style="color:#475569;">vs</span>
                    <span style="background:rgba(255,255,255,0.08); border-radius:6px; padding:3px 8px; color:#f8fafc;">
                        ${initIcon} ${defInitVal}
                    </span>
                    <span style="color:#f8fafc; font-weight:600;">${defender.name}</span>
                    <span style="color:#64748b; font-size:11px;">(${initStatLabel})</span>
                </div>
            </div>`;

        // ── Banner do Local Ativo ──────────────────────────────────────────────
        const locBanner = this._buildLocationBannerHtml(attacker, defender);

        container.innerHTML = `
            ${renderCard(attacker, effAtk, 'Atacante')}
            ${handHtml}
            ${renderCard(defender, effDef, 'Defensor')}
        `;

        // Injeta banner de iniciativa no topo do modal
        const modalContent = modal.querySelector('.attack-modal-content');
        const oldInitBanner = modalContent.querySelector('#initiative-banner');
        if (oldInitBanner) oldInitBanner.remove();
        const initBannerEl = document.createElement('div');
        initBannerEl.id = 'initiative-banner';
        initBannerEl.innerHTML = initiativeBannerHtml;
        modalContent.insertBefore(initBannerEl, modalContent.firstChild);

        // Injeta banner do local abaixo do container de cartas
        if (locBanner) {
            const bannerEl = document.createElement('div');
            bannerEl.innerHTML = locBanner;
            const cancelEl = document.getElementById('cancel-attack-btn');
            if (cancelEl) modalContent.insertBefore(bannerEl.firstChild, cancelEl);
            else modalContent.appendChild(bannerEl.firstChild);
        }

        // Botão de cancelar REMOVIDO intencionalmente:
        // no TCG original, uma vez que o atacante e alvo são escolhidos, o combate é obrigatório.
        // "Escolheu, cabou." — remover o cancel evita exploits de espiar battlegears.
        const existingCancelBtn = document.getElementById('cancel-attack-btn');
        if (existingCancelBtn) existingCancelBtn.remove();

        modal.classList.remove('hidden');
        modal.classList.add('flex-modal');
    },

    confirmAttack(cardIndex, fromRemote = false) {
        const modal = document.getElementById("attack-modal");
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex-modal', 'modal-minimized');
        }
        this.restoreModal && this.restoreModal('attack-modal'); // limpa pílula se existir

        if (!fromRemote) {
            this.sendAction('confirmAttack', { cardIndex });
        }

        if (!this.pendingCombat) return;
        if (!this.activeCombat) return; // Combate já terminou (desync multiplayer)
        const { attacker, defender, atkR, atkC, defR, defC, attackingPlayer } = this.pendingCombat;
        const { hand } = this._getAttackAssets(attackingPlayer);
        const atkCard = hand[cardIndex];

        // Revelar battlegears no momento em que o ataque é confirmado (1ª vez apenas)
        // _revealBattlegear é idempotente — não faz nada se já revelado
        if (this.activeCombat.isFirstAttack) {
            this._revealBattlegear(attacker);
            this._revealBattlegear(defender);
            this._applyBattlegearCombatStart(attacker);
            this._applyBattlegearCombatStart(defender);
        }

        const usedCard = hand.splice(cardIndex, 1)[0];
        this._getAttackAssets(attackingPlayer).discard.push(usedCard);
        // draw já foi feito em processCombatTurn antes de abrir o modal
        // (jogador sempre escolhe entre 3 cartas, conforme regras do Chaotic TCG)

        // Inicializar a Pilha (Burst)
        this.burstStack = [];
        this.burstPasses = 0;
        this.burstPriority = attackingPlayer; // Atacante tem a 1ª resposta

        const p2Label = this.multiplayerMode ? (this.p2Name||'Jogador 2') : 'IA (Oponente)';
        this.burstStack.push({
            type: 'attack',
            source: attackingPlayer === 1 ? (this.p1Name||'Jogador 1') : p2Label,
            attacker, defender, atkR, atkC, defR, defC, attackingPlayer, atkCard,
            description: `Ataque Declarado: ${atkCard.name}`
        });

        this.log(`🔔 BURST ABERTO: ${attackingPlayer === 1 ? 'Jogador 1' : p2Label} atacou com ${atkCard.name}`);

        // Animação de salto — abre o burst só depois que terminar
        this._playAttackAnimation(attacker, attackingPlayer).then(() => {
            this.openBurstModal();
        });
    },

    executeAttack(item) {
        const { attacker, defender, atkR, atkC, defR, defC, attackingPlayer, atkCard } = item;

        const defPlayer = attackingPlayer === 1 ? 2 : 1;
        const effAtk = this._effectiveStats(attacker, attackingPlayer, atkR, atkC);
        const effDef = this._effectiveStats(defender, defPlayer, defR, defC);

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

        // Floating numbers — aparecem APÓS renderBoard para o DOM estar atualizado
        if (totalDamage > 0) this._spawnFloatingNumber(defender, totalDamage, 'damage');
        if (totalHeal    > 0) this._spawnFloatingNumber(attacker, totalHeal,   'heal');
        if (attacker._recklessPenalty < 0) this._spawnFloatingNumber(attacker, Math.abs(attacker._recklessPenalty || 0), 'reckless');

        if (defender.energy <= 0) {
            this.log(`💀 ${defender.name} foi derrotado!`);
        }
    },

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
        const winnerLabel = isP1Winner ? (this.p1Name||'Jogador 1') : (this.p2Name||'Jogador 2');
        const loserLabel  = isP1Winner ? (this.p2Name||'Jogador 2') : (this.p1Name||'Jogador 1');

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
    },

    endCombatTurn() {
        if (!this.activeCombat) return;
        const { p1Card, p2Card, p1R, p1C, p2R, p2C } = this.activeCombat;

        // Cleanup
        const _snapshot = () => ({
            ...this.activeCombat,
            p1Card:        JSON.parse(JSON.stringify(this.activeCombat.p1Card)),
            p2Card:        JSON.parse(JSON.stringify(this.activeCombat.p2Card)),
            attackHistory: [...this.activeCombat.attackHistory],
            damageHistory: [...this.activeCombat.damageHistory],
            mugicHistory:  [...this.activeCombat.mugicHistory],
            healHistory:   [...this.activeCombat.healHistory],
        });

        // ── Empate simultâneo: ambas as criaturas chegaram a 0 ao mesmo tempo ──
        // (acontece com Reckless: atacante se fere e mata o defensor no mesmo turno)
        // Helper: envia estado autoritativo ao oponente — fecha burst e sincroniza tabuleiro
        const _syncBoard = () => {
            if (this.multiplayerMode) {
                this.sendAction('sync_board_state', {
                    boardP1:       JSON.parse(JSON.stringify(this.boardP1)),
                    boardP2:       JSON.parse(JSON.stringify(this.boardP2)),
                    activeLocation: this.activeLocation ? JSON.parse(JSON.stringify(this.activeLocation)) : null
                });
            }
        };

        if (p1Card.energy <= 0 && p2Card.energy <= 0) {
            const combatSnapshot = _snapshot();
            this._discardCreature(p1Card);
            this._discardCreature(p2Card);
            this.boardP1[p1R][p1C] = null;
            this.boardP2[p2R][p2C] = null;
            this.activeCombat = null;
            this.selectedAttacker = null;

            this._revealNextLocation();
            _syncBoard(); // ← após revelar novo local

            this.renderBoard();
            this.log("💥 Empate no combate! Ambas as criaturas foram destruídas simultaneamente!");
            this._recordMatchHistory(combatSnapshot, combatSnapshot.p1Card, combatSnapshot.p2Card);
            if (this.checkWinCondition()) return;
            setTimeout(() => this.nextTurn(), COMBAT_DELAY.NEXT_TURN);
            return;
        }

        if (p1Card.energy <= 0) {
            const combatSnapshot = _snapshot();
            this._discardCreature(p1Card);
            this.boardP1[p1R][p1C] = null;
            this.activeCombat = null;
            this.selectedAttacker = null;

            this._revealNextLocation();
            _syncBoard(); // ← após revelar novo local

            this.renderBoard();
            this.log("Fim do Combate! A carta do Jogador 1 foi destruída.");
            this._recordMatchHistory(combatSnapshot, combatSnapshot.p1Card, combatSnapshot.p2Card);
            this._showCombatSummary(combatSnapshot, combatSnapshot.p1Card, combatSnapshot.p2Card);
            if (this.checkWinCondition()) return;
            setTimeout(() => this.nextTurn(), COMBAT_DELAY.NEXT_TURN);
            return;
        }
        if (p2Card.energy <= 0) {
            const combatSnapshot = _snapshot();
            this._discardCreature(p2Card);
            this.boardP2[p2R][p2C] = null;
            this.activeCombat = null;
            this.selectedAttacker = null;

            this._revealNextLocation();
            _syncBoard(); // ← após revelar novo local

            this.renderBoard();
            this.log("Fim do Combate! A carta do Jogador 2 foi destruída.");
            this._recordMatchHistory(combatSnapshot, combatSnapshot.p2Card, combatSnapshot.p1Card);
            this._showCombatSummary(combatSnapshot, combatSnapshot.p2Card, combatSnapshot.p1Card);
            if (this.checkWinCondition()) return;
            setTimeout(() => this.nextTurn(), COMBAT_DELAY.NEXT_TURN);
            return;
        }

        this.activeCombat.isFirstAttack = false;
        this.activeCombat.currentStriker = this.activeCombat.currentStriker === 1 ? 2 : 1;
        this.log(`Próximo turno (Strike): Jogador ${this.activeCombat.currentStriker} ataca!`);

        setTimeout(() => {
            this.processCombatTurn();
        }, 1000);
    },

    // ── Revela o próximo local do deck (chamado ao fim de cada combate) ──────
    _revealNextLocation() {
        if (this.locationDeck.length === 0) return;
        this.activeLocation = this.locationDeck.pop();
        this.log(`📍 Novo Local Revelado para a próxima batalha: ${this.activeLocation.name}!`);
        this.renderLocation();
        this.showLocationToast(this.activeLocation, true);
    },

    cancelAttackModal() {
        const modal = document.getElementById("attack-modal");
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex-modal', 'modal-minimized');
        }
        this.restoreModal && this.restoreModal('attack-modal');
        this.selectedAttacker = null;
        this.gameState = 'IDLE';
        this.activeCombat = null;

        // Mantém o Local ativo intacto para quando o ataque real ocorrer

        this.renderBoard();
        this.log("Ataque cancelado.");
    },

    /** @deprecated — substituído pelo fluxo Burst + executeAttack. Mantido apenas como fallback do showAttackModal sem DOM. */
    resolveAttack(attacker, defender, atkR, atkC, defR, defC, attackingPlayer, attackCardIndex) {
        if (this.activeCombat) {
            this.activeCombat.isFirstAttack = false;
        }
        const defPlayer = attackingPlayer === 1 ? 2 : 1;
        const effAtk = this._effectiveStats(attacker, attackingPlayer, atkR, atkC);
        const effDef = this._effectiveStats(defender, defPlayer, defR, defC);

        const { hand: atkHand, deck: atkDeck } = this._getAttackAssets(attackingPlayer);

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

            setTimeout(() => this.nextTurn(), COMBAT_DELAY.NEXT_TURN);
        } else {
            // Combate continua, troca o turno do striker
            if (this.activeCombat) {
                this.activeCombat.currentStriker = attackingPlayer === 1 ? 2 : 1;
                this.renderBoard();
                setTimeout(() => {
                    this.combatAnimationState = null;
                    this.renderBoard();
                }, 800);
                setTimeout(() => this.processCombatTurn(), COMBAT_DELAY.NEXT_STRIKE);
            }
        }
    },

});
