// engine-ai.js
Object.assign(GameEngine.prototype, {

    // ─── Dificuldade ─────────────────────────────────────────────────────────

    setAiTribe(tribe) {
        this.aiTribeChoice = tribe;

        const tribeColors = {
            auto:       '#3b82f6',
            OverWorld:  '#0ea5e9',
            UnderWorld: '#dc2626',
            Mipedian:   '#d97706',
            Danian:     '#9333ea',
        };
        const tribeDescs = {
            auto:       'IA escolhe a tribo conforme a dificuldade.',
            OverWorld:  'IA usa criaturas OverWorld — fortes em Coragem e Sabedoria.',
            UnderWorld: 'IA usa criaturas UnderWorld — alto Poder e agressivas.',
            Mipedian:   'IA usa criaturas Mipedian — rápidas, focadas em Velocidade.',
            Danian:     'IA usa criaturas Danian — sinergia crescente conforme o time.',
        };

        const descEl = document.getElementById('ai-tribe-desc');
        if (descEl) descEl.textContent = tribeDescs[tribe] || '';

        // Destaca botão ativo
        ['auto','OverWorld','UnderWorld','Mipedian','Danian'].forEach(t => {
            const btn = document.getElementById(`ai-tribe-${t}`);
            if (!btn) return;
            const color = tribeColors[t];
            const active = t === tribe;
            btn.style.borderColor = active ? color  : '#475569';
            btn.style.color       = active ? color  : '#94a3b8';
            btn.style.background  = active ? `rgba(${t==='auto'?'59,130,246':t==='OverWorld'?'14,165,233':t==='UnderWorld'?'220,38,38':t==='Mipedian'?'217,119,6':'147,51,234'},0.18)` : 'transparent';
        });
    },

    setDifficulty(level) {
        this.aiDifficulty = level;
        const descs = {
            easy:   'IA escolhe ataques e alvos aleatoriamente.',
            medium: 'IA prioriza alvos fracos e usa mugics para sobreviver.',
            hard:   'IA avalia sinergia, sacrifica battlegears e usa mugics estrategicamente.'
        };
        const desc = document.getElementById('diff-desc');
        if (desc) desc.textContent = descs[level] || '';

        // Destaca botão ativo
        ['easy','medium','hard'].forEach(l => {
            const btn = document.getElementById(`diff-${l}`);
            if (!btn) return;
            const colors = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' };
            const active = l === level;
            btn.style.borderColor = active ? colors[l] : '#475569';
            btn.style.color       = active ? colors[l] : '#94a3b8';
            btn.style.background  = active ? `rgba(${l==='easy'?'16,185,129':l==='medium'?'245,158,11':'239,68,68'},0.2)` : 'transparent';
        });
    },

    // ─── Helpers de avaliação ────────────────────────────────────────────────

    /** Score de ameaça de uma carta (quanto ela pode causar de dano) */
    _aiThreatScore(card) {
        return (card.power || 0) * 2 + (card.courage || 0) * 1.5
             + (card.speed || 0) + (card.energy || 0) * 0.5;
    },

    /** Retorna stats efetivos de uma carta (com sinergia + battlegear) */
    _aiEffectiveStats(card, player, r, c) {
        const syn = this.getSynergyBonus(player, r, c) || {};
        const bg  = card.bgRevealed && card.battlegear && card.battlegear.modifiers
                    ? card.battlegear.modifiers : {};
        return {
            courage: (card.courage || 0) + (syn.courage || 0) + (bg.courage || 0),
            power:   (card.power   || 0) + (syn.power   || 0) + (bg.power   || 0),
            wisdom:  (card.wisdom  || 0) + (syn.wisdom  || 0) + (bg.wisdom  || 0),
            speed:   (card.speed   || 0) + (syn.speed   || 0) + (bg.speed   || 0),
            energy:  card.energy,
            maxEnergy: card.maxEnergy || card.energy
        };
    },

    /** Estima rounds para matar defensor dado atacante (stats efetivos) */
    _aiEstimateRoundsToKill(atkStats, defStats, defCard) {
        // Usa melhor dano possível de ataque: baseDamage + stat relevante simplificado
        const atkHand = this.p2AttackHand || [];
        const atkDeck = this.p2AttackDeck || [];
        const pool    = [...atkHand, ...atkDeck].slice(0, 6);
        let bestDmg   = 0;
        for (const atk of pool) {
            let dmg = atk.baseDamage || 0;
            if (atk.statRequirement) {
                const av = atkStats[atk.statRequirement] || 0;
                const dv = defStats[atk.statRequirement] || 0;
                if (av > dv) dmg += atk.statDamage || 0;
            }
            if (atk.elementRequirement && (defCard.elements || []).includes(atk.elementRequirement)) {
                dmg += atk.elementDamage || 0;
            }
            bestDmg = Math.max(bestDmg, dmg);
        }
        if (bestDmg <= 0) bestDmg = 5; // fallback mínimo
        return Math.ceil(defCard.energy / bestDmg);
    },

    // ─── Battlegear ativo ────────────────────────────────────────────────────

    /**
     * Decide se a IA deve sacrificar o battlegear no burst.
     * Considera: Nexus Fuse (dano), Aqua Shield (cura), grant_element.
     */
    _aiConsiderBattlegearSacrifice() {
        if (!this.activeCombat) return false;
        const { p1Card, p2Card } = this.activeCombat;
        const aiCard   = p2Card;
        const enemy    = p1Card;

        const bg = aiCard.battlegear;
        if (!bg || aiCard.bgRevealed === false) return false; // não revelado ainda
        if (!bg.sacrificeEffect) return false;

        const diff = this.aiDifficulty || 'easy';

        // Fácil: nunca sacrifica
        if (diff === 'easy') return false;

        const eff = bg.sacrificeEffect;

        // damage_target: sacrifica se inimigo tiver pouca vida (Médio >= 50%, Difícil: sempre convém)
        if (eff.type === 'damage_target') {
            const threshold = diff === 'hard' ? enemy.maxEnergy * 0.6 : enemy.maxEnergy * 0.35;
            if (enemy.energy <= threshold || enemy.energy <= eff.value) {
                this.log(`🤖 IA sacrifica [${bg.name}] para causar ${eff.value} de dano a ${enemy.name}!`);
                return true;
            }
        }

        // heal_target: sacrifica se própria vida estiver crítica
        if (eff.type === 'heal_target') {
            const hpPct = aiCard.energy / (aiCard.maxEnergy || aiCard.energy);
            const hpThreshold = diff === 'hard' ? 0.5 : 0.25;
            if (hpPct <= hpThreshold) {
                this.log(`🤖 IA sacrifica [${bg.name}] para curar ${eff.value} de ${aiCard.name}!`);
                return true;
            }
        }

        // grant_element: Difícil usa para amplificar dano elemental quando inimigo tem 50%+ vida
        if (eff.type === 'grant_element' && diff === 'hard') {
            // Verifica se algum ataque da mão usa esse elemento
            const elem = eff.element;
            const hand = this.p2AttackHand || [];
            const hasElemAtk = hand.some(a => a.elementRequirement === elem);
            if (hasElemAtk) {
                this.log(`🤖 IA sacrifica [${bg.name}] para ganhar elemento ${elem}!`);
                return true;
            }
        }

        // drain_stat: Difícil usa para enfraquecer inimigo se ele for mais forte
        if (eff.type === 'drain_stat' && diff === 'hard') {
            const atkStat = aiCard[eff.stat] || 0;
            const defStat = enemy[eff.stat] || 0;
            if (defStat > atkStat + 10) {
                this.log(`🤖 IA sacrifica [${bg.name}] para drenar ${eff.value} de ${eff.stat} do inimigo!`);
                return true;
            }
        }

        // add_mugic_counter: Difícil usa se tiver mugics boas e sem counters
        if (eff.type === 'add_mugic_counter' && diff === 'hard') {
            const noCounters = aiCard.mugicCounters === 0;
            const hasMugics  = (this.p2Mugics || []).length > 0;
            if (noCounters && hasMugics) {
                this.log(`🤖 IA sacrifica [${bg.name}] para ganhar Mugic Counter!`);
                return true;
            }
        }

        return false;
    },

    // ─── Burst decision ──────────────────────────────────────────────────────

    aiBurstDecision() {
        const diff = this.aiDifficulty || 'easy';

        // Fácil: só passa (raramente usa mugic)
        if (diff === 'easy') {
            if (Math.random() < 0.15 && this.p2Mugics && this.p2Mugics.length > 0) {
                const chosen = this._aiPickMugic();
                if (chosen) { this._aiCastMugic(chosen); return; }
            }
            this.passBurst();
            return;
        }

        // Médio / Difícil: considera sacrifício de battlegear primeiro
        if (diff !== 'easy' && this._aiConsiderBattlegearSacrifice()) {
            this.sacrificeBattlegear();
            return;
        }

        // Médio / Difícil: lógica de mugic
        if (this.p2Mugics && this.p2Mugics.length > 0) {
            const chosen = this._aiPickMugic();
            if (chosen) { this._aiCastMugic(chosen); return; }
        }

        this.passBurst();
    },

    _aiCastMugic({ mg, idx, casterCard }) {
        casterCard.mugicCounters -= mg.cost;
        this.log(`🎶 IA conjurou [${mg.name}] via ${casterCard.name} (${mg.cost} ♪ gastos)!`);
        this.burstStack.push({
            type:      'mugic',
            source:    'IA (Oponente)',
            playerNum: 2, // IA é sempre P2
            mugic:     mg,
            caster:    casterCard,
            description: `Mugic Cast: ${mg.name} (por ${casterCard.name})`
        });
        this._discardMugic(2, this.p2Mugics, idx);
        this.burstPasses    = 0;
        this.burstPriority  = 1;
        this.openBurstModal();
    },

    // ─── Seleção de mugic ────────────────────────────────────────────────────

    _aiPickMugic() {
        if (!this.activeCombat) return null;
        const diff = this.aiDifficulty || 'easy';
        const { p1Card, p2Card } = this.activeCombat;
        const aiCard  = p2Card;
        const enemy   = p1Card;

        // Casters disponíveis
        const aiCasters = [];
        for (const row of this.boardP2) {
            for (const card of row) {
                if (card && card.mugicCounters > 0) aiCasters.push(card);
            }
        }

        const affordable = (this.p2Mugics || [])
            .map((mg, idx) => {
                if (this._ironBallsActive && mg.tribe !== 'Generic') return null;
                const caster = aiCasters.find(c => {
                    const tribeOk = mg.tribe === 'Generic' || mg.tribe === c.tribe;
                    const cost    = tribeOk ? mg.cost : mg.cost + 1;
                    return c.mugicCounters >= cost;
                });
                return caster ? { mg, idx, casterCard: caster } : null;
            })
            .filter(Boolean);

        if (affordable.length === 0) return null;

        // ── Prioridade 1: negar mugic inimiga (todos os níveis ≥ médio) ──────
        if (diff !== 'easy') {
            const enemyMugicInStack = this.burstStack.some(
                item => item.type === 'mugic' && item.source !== 'IA (Oponente)' && !item.negated
            );
            if (enemyMugicInStack) {
                const negator = affordable.find(({ mg }) => mg.effectType === 'negate_mugic');
                if (negator) {
                    this.log(`🤔 IA nega uma Mugic inimiga com [${negator.mg.name}]!`);
                    return negator;
                }
            }
        }

        const hpPct   = aiCard.energy / (aiCard.maxEnergy || aiCard.energy);
        const enemyPct = enemy.energy  / (enemy.maxEnergy  || enemy.energy);

        // ── Prioridade 2: sobrevivência (médio: ≤30%, difícil: ≤50%) ─────────
        const healThreshold = diff === 'hard' ? 0.5 : 0.3;
        if (hpPct <= healThreshold) {
            const healer = affordable.find(({ mg }) =>
                ['heal','conditional_heal','heal_and_grant_element','heal_and_reduce_fire',
                 'energy_steal','energy_transfer'].includes(mg.effectType)
            );
            if (healer) {
                this.log(`🤔 IA usa [${healer.mg.name}] para sobreviver!`);
                return healer;
            }
            const buffer = affordable.find(({ mg }) =>
                ['buff_all_stats','buff_combat_stats','damage_reduction_aura'].includes(mg.effectType)
            );
            if (buffer) {
                this.log(`🤔 IA usa [${buffer.mg.name}] para se fortalecer!`);
                return buffer;
            }
        }

        // ── Prioridade 3: kill shot ──────────────────────────────────────────
        const killShot = affordable.find(({ mg }) =>
            mg.effectType === 'damage' && (mg.effectValue || 0) >= enemy.energy
        );
        if (killShot) {
            this.log(`🤔 IA usa [${killShot.mg.name}] para eliminar ${enemy.name}!`);
            return killShot;
        }

        // ── Prioridade 4 (médio+): dano se inimigo tiver < 50% vida ──────────
        if (diff !== 'easy' && enemyPct < 0.5) {
            const dmg = affordable.find(({ mg }) => mg.effectType === 'damage');
            if (dmg) {
                this.log(`🤔 IA causa dano extra com [${dmg.mg.name}]!`);
                return dmg;
            }
        }

        // ── Prioridade 5 (difícil): debuff se inimigo muito mais forte ────────
        if (diff === 'hard') {
            const enemyStronger = (enemy.power + enemy.courage) > (aiCard.power + aiCard.courage) + 20;
            if (enemyStronger) {
                const debuffer = affordable.find(({ mg }) =>
                    ['debuff_all_stats','destroy_battlegear','remove_abilities'].includes(mg.effectType)
                );
                if (debuffer) {
                    this.log(`🤔 IA enfraquece o inimigo com [${debuffer.mg.name}]!`);
                    return debuffer;
                }
            }

            // Difícil: buff proativo se for mais fraco e tiver vida ok
            if (hpPct > 0.5) {
                const booster = affordable.find(({ mg }) =>
                    ['buff_all_stats','grant_element','buff_combat_stats'].includes(mg.effectType)
                );
                if (booster) {
                    this.log(`🤔 IA usa [${booster.mg.name}] proativamente!`);
                    return booster;
                }
            }
        }

        return null;
    },

    // ─── Turno da IA ────────────────────────────────────────────────────────

    aiTurn() {
        const diff = this.aiDifficulty || 'easy';

        // Candidatos atacantes expostos
        let p2Alive = [];
        for (let r = 0; r < this.boardP2.length; r++) {
            for (let c = 0; c < this.boardP2[r].length; c++) {
                const card = this.boardP2[r][c];
                if (card && this.isExposed(2, r, c)) {
                    p2Alive.push({ card, r, c });
                }
            }
        }

        // Candidatos alvo
        let p1All = [];
        for (let r = 0; r < this.boardP1.length; r++) {
            for (let c = 0; c < this.boardP1[r].length; c++) {
                const card = this.boardP1[r][c];
                if (card && !card._invisibility) {
                    p1All.push({ card, r, c, exposed: this.isExposed(1, r, c) });
                }
            }
        }

        if (p2Alive.length === 0 || p1All.length === 0) {
            this.checkWinCondition();
            return;
        }

        let attacker, defender;

        if (diff === 'easy') {
            // Fácil: aleatório
            attacker = p2Alive[Math.floor(Math.random() * p2Alive.length)];
            const hasRange    = !!attacker.card._hasRange;
            const validTargets = p1All.filter(t => t.exposed || hasRange);
            if (validTargets.length === 0) {
                this.log('⏭️ IA não tem alvos e passa o turno.');
                setTimeout(() => this.nextTurn(), 800);
                return;
            }
            defender = validTargets[Math.floor(Math.random() * validTargets.length)];

        } else if (diff === 'medium') {
            // Médio: atacante mais forte, alvo com menos vida
            attacker = p2Alive.reduce((best, c) => {
                const s = this._aiThreatScore(c.card);
                return !best || s > best.score ? { ...c, score: s } : best;
            }, null);

            const hasRange     = !!attacker.card._hasRange;
            const validTargets = p1All.filter(t => t.exposed || hasRange);
            if (validTargets.length === 0) {
                this.log('⏭️ IA não tem alvos e passa o turno.');
                setTimeout(() => this.nextTurn(), 800);
                return;
            }

            // Alvo com menos vida (mais fácil de matar)
            defender = validTargets.reduce((best, c) => {
                const threat = c.card.energy + (c.card.power || 0) + c.r * 2;
                return !best || threat < best.threat ? { ...c, threat } : best;
            }, null);

        } else {
            // Difícil: avalia combate inteiro, prioriza matar antes de ser morto
            // Enriquece candidatos com stats efetivos
            const enriched = p2Alive.map(a => ({
                ...a,
                eff: this._aiEffectiveStats(a.card, 2, a.r, a.c)
            }));

            // Para cada par atacante/alvo, calcula vantagem
            let bestScore  = -Infinity;
            let bestPair   = null;

            for (const atk of enriched) {
                const hasRange     = !!atk.card._hasRange;
                const validTargets = p1All.filter(t => t.exposed || hasRange);

                for (const def of validTargets) {
                    const defEff = this._aiEffectiveStats(def.card, 1, def.r, def.c);

                    const roundsToKillEnemy = this._aiEstimateRoundsToKill(atk.eff, defEff, def.card);
                    const roundsToKillMe    = this._aiEstimateRoundsToKill(defEff, atk.eff, atk.card);

                    // Score: matar rápido e morrer devagar
                    const score = roundsToKillMe - roundsToKillEnemy
                        + (def.card.energy / (def.card.maxEnergy || def.card.energy)) * 3  // prefere inimigos com pouca vida
                        + (atk.card.energy / (atk.card.maxEnergy || atk.card.energy)) * 2; // prefere atacante com mais vida

                    if (score > bestScore) {
                        bestScore = score;
                        bestPair  = { attacker: atk, defender: def };
                    }
                }
            }

            if (!bestPair) {
                this.log('⏭️ IA não tem alvos e passa o turno.');
                setTimeout(() => this.nextTurn(), 800);
                return;
            }

            attacker = bestPair.attacker;
            defender = bestPair.defender;

            this.log(`🤖 IA [Difícil] escolheu ${attacker.card.name} → ${defender.card.name}`);
        }

        if (attacker.card._hasRange) {
            this.log(`🏹 ${attacker.card.name} tem Range — pode atacar criaturas protegidas!`);
        }

        this.selectedAttacker = { player: 2, r: attacker.r, c: attacker.c };
        this.renderBoard();

        setTimeout(() => {
            this.startCombat(attacker.card, defender.card, attacker.r, attacker.c, defender.r, defender.c, 2);
        }, 1000);
    },

});
