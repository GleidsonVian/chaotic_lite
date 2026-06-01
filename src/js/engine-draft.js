// engine-draft.js
Object.assign(GameEngine.prototype, {

    // ─── Times Sugeridos ─────────────────────────────────────────────────────────

    openTeamSuggestions() {
        const modal = document.getElementById('teams-modal');
        const grid  = document.getElementById('teams-grid');
        if (!modal || !grid) return;

        const allTeams = window.teamsDatabase || [];
        const teams = allTeams.filter(t => !t.mode || t.mode === this.gameMode);
        const tribeColors = {
            OverWorld: '#0ea5e9', UnderWorld: '#dc2626',
            Mipedian: '#d97706', Danian: '#9333ea', Misto: '#64748b'
        };

        grid.innerHTML = teams.map(team => {
            // Monta prévia das criaturas: busca no banco e mostra imagem ou placeholder
            const creatureCards = team.creatures.map(name => {
                const card = this.cards.find(c => c.name === name);
                if (!card) return '';
                return `<div title="${card.name}" style="
                    width:44px;height:44px;border-radius:6px;overflow:hidden;
                    border:1px solid ${team.color}44;flex-shrink:0;
                ">
                    ${card.image && !card.image.includes('placeholder')
                        ? `<img src="${card.image}" style="width:100%;height:100%;object-fit:cover;">`
                        : `<div style="width:100%;height:100%;background:${team.color}22;display:flex;align-items:center;justify-content:center;font-size:10px;color:${team.color};">${card.name.slice(0,3)}</div>`
                    }
                </div>`;
            }).join('');

            // Conta quantas criaturas do time existem no banco
            const available = team.creatures.filter(n => this.cards.find(c => c.name === n)).length;
            const incomplete = available < team.creatures.length;

            const strengthsHtml = team.strengths.map(s =>
                `<span style="background:rgba(34,197,94,0.1);border:1px solid #22c55e44;color:#4ade80;border-radius:4px;padding:1px 6px;font-size:10px;">✅ ${s}</span>`
            ).join('');
            const weaknessesHtml = team.weaknesses.map(w =>
                `<span style="background:rgba(239,68,68,0.1);border:1px solid #ef444444;color:#f87171;border-radius:4px;padding:1px 6px;font-size:10px;">⚠️ ${w}</span>`
            ).join('');

            return `
            <div onclick="game.applyTeamSuggestion('${team.id}')" style="
                background:rgba(255,255,255,0.03);border:1px solid ${team.color}44;
                border-radius:14px;padding:16px;cursor:pointer;
                transition:all 0.2s;position:relative;overflow:hidden;
            " onmouseover="this.style.background='rgba(255,255,255,0.07)';this.style.borderColor='${team.color}aa'"
               onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='${team.color}44'">

                <!-- Header -->
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <span style="font-size:26px;">${team.emoji}</span>
                    <div>
                        <div style="font-weight:800;font-size:14px;color:#f1f5f9;">${team.name}</div>
                        <div style="font-size:11px;color:${team.color};font-weight:600;">${team.tribe} · ${team.style}</div>
                    </div>
                    ${incomplete ? `<span style="margin-left:auto;font-size:10px;color:#64748b;background:#1e293b;border-radius:4px;padding:2px 6px;">${available}/6 disponíveis</span>` : ''}
                </div>

                <!-- Descrição -->
                <p style="font-size:12px;color:#94a3b8;line-height:1.5;margin-bottom:10px;">${team.description}</p>

                <!-- Criaturas -->
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">${creatureCards}</div>

                <!-- Forças e fraquezas -->
                <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;">${strengthsHtml}</div>
                <div style="display:flex;flex-wrap:wrap;gap:4px;">${weaknessesHtml}</div>

                <!-- Barra de cor decorativa -->
                <div style="position:absolute;top:0;left:0;width:3px;height:100%;background:${team.color};border-radius:14px 0 0 14px;"></div>
            </div>`;
        }).join('');

        modal.classList.remove('hidden');
        modal.classList.add('flex-modal');
    },

    closeTeamSuggestions() {
        const modal = document.getElementById('teams-modal');
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex-modal'); }
    },

    applyTeamSuggestion(teamId) {
        const team = (window.teamsDatabase || []).find(t => t.id === teamId);
        if (!team) return;

        // Limpa seleção atual
        this.draftedCards = [];

        // Adiciona as criaturas do time (máximo = limite do modo, só as que existem no banco)
        const teamLimit = this._getDraftLimit();
        let added = 0;
        for (const name of team.creatures) {
            if (added >= teamLimit) break;
            const card = this.cards.find(c => c.name === name);
            if (card) { this.draftedCards.push(card); added++; }
        }

        this.closeTeamSuggestions();
        this._syncDraftControls();
        this.renderDraft();
        this.log(`✨ Time "${team.name}" pré-selecionado! Você pode trocar criaturas antes de continuar.`);
    },

    // ─── Score de Afinidade Dinâmica ─────────────────────────────────────────────

    /**
     * Calcula o score de afinidade (0–100) de uma carta candidata
     * com o time atual (this.draftedCards).
     */
    _calcCardAffinity(card) {
        if (this.draftedCards.length === 0) return 50; // neutro sem time

        let score = 0;
        const team = this.draftedCards;
        const n    = team.length;

        // ── 1. Sinergia tribal (até 30 pts) ──────────────────────────────────
        const tribeCounts = {};
        team.forEach(c => { tribeCounts[c.tribe] = (tribeCounts[c.tribe] || 0) + 1; });
        const dominantCount = tribeCounts[card.tribe] || 0;
        score += Math.min(30, dominantCount * 10); // +10 por aliado da mesma tribo

        // ── 2. Cobertura de stats fraco (até 20 pts) ─────────────────────────
        const stats = ['courage','power','wisdom','speed','energy'];
        const avgStats = {};
        stats.forEach(s => { avgStats[s] = team.reduce((a,c) => a+(c[s]||0), 0) / n; });
        // Pontos por cobrir o stat mais fraco do time
        const weakestStat = stats.reduce((a,b) => avgStats[a] < avgStats[b] ? a : b);
        const cardWeakest = card[weakestStat] || 0;
        if (cardWeakest > avgStats[weakestStat]) score += Math.min(20, (cardWeakest - avgStats[weakestStat]) / 5);

        // ── 3. Cobertura de elementos (até 20 pts) ────────────────────────────
        const teamElements = new Set(team.flatMap(c => c.elements || []));
        const newElements  = (card.elements || []).filter(e => !teamElements.has(e));
        score += Math.min(20, newElements.length * 10); // +10 por elemento novo

        // ── 4. Passivas complementares (até 20 pts) ───────────────────────────
        const teamPassives = new Set(team.flatMap(c => (c.passives||[]).map(p => typeof p==='string'?p:p.id)));
        const cardPassives = (card.passives || []).map(p => typeof p==='string'?p:p.id);
        const valuablePassives = ['intimidate','swift','strike','tough','berserk'];
        const usefulNew = cardPassives.filter(p => valuablePassives.includes(p) && !teamPassives.has(p));
        score += Math.min(20, usefulNew.length * 10);

        // ── 5. Diversidade de vida (até 10 pts) ──────────────────────────────
        const avgEnergy = avgStats.energy;
        if (Math.abs((card.energy||0) - avgEnergy) > 10) score += 10; // diversidade é boa

        return Math.round(Math.max(0, Math.min(100, score)));
    },

    /** Cor da barra de afinidade baseada no score */
    _affinityColor(score) {
        if (score >= 70) return '#22c55e';
        if (score >= 40) return '#f59e0b';
        return '#ef4444';
    },

    // ─── Filtro de tribo (botões antigos de tribo, mantido por compatibilidade) ─
    filterTribe(tribe) {
        this.currentTribeFilter = tribe;
        this.renderDraft();
    },

    renderDraft() {
        const container = document.getElementById('draft-cards-container');
        if (!container) return;
        container.innerHTML = this.cards
            .filter(card => this.currentTribeFilter === 'All' || card.tribe === this.currentTribeFilter)
            .map((card, index) => this._draftCardHtml(card, this.cards.indexOf(card)))
            .join('');
        this._syncDraftControls();
    },

    applyDraftFilters() {
        const tribe   = (document.getElementById('df-tribe')   || {}).value || 'All';
        const stat    = (document.getElementById('df-stat')    || {}).value || 'none';
        const statVal = parseInt((document.getElementById('df-stat-val') || {}).value) || 0;
        const passive = (document.getElementById('df-passive') || {}).value || 'none';
        const sort    = (document.getElementById('df-sort')    || {}).value || 'default';

        let filtered = this.cards.map((card, index) => ({ card, index }));
        if (tribe !== 'All')                        filtered = filtered.filter(({ card }) => card.tribe === tribe);
        if (stat !== 'none' && statVal > 0)         filtered = filtered.filter(({ card }) => (card[stat] || 0) >= statVal);
        if (passive !== 'none')                     filtered = filtered.filter(({ card }) => card.passives && card.passives.some(p => (typeof p === 'string' ? p : p.id) === passive));
        if (sort !== 'default')                     filtered.sort((a, b) => (b.card[sort] || 0) - (a.card[sort] || 0));

        const countEl = document.getElementById('df-count');
        if (countEl) countEl.textContent = `${filtered.length} de ${this.cards.length} criaturas`;

        const container = document.getElementById('draft-cards-container');
        if (!container) return;
        container.innerHTML = filtered.map(({ card, index }) => this._draftCardHtml(card, index)).join('');
        this._syncDraftControls();
    },

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
    },

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
    },

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
    },

    _hasActiveDraftFilters() {
        const tribe   = (document.getElementById('df-tribe')   || {}).value || 'All';
        const stat    = (document.getElementById('df-stat')    || {}).value || 'none';
        const statVal = parseInt((document.getElementById('df-stat-val') || {}).value) || 0;
        const passive = (document.getElementById('df-passive') || {}).value || 'none';
        const sort    = (document.getElementById('df-sort')    || {}).value || 'default';
        return tribe !== 'All' || (stat !== 'none' && statVal > 0) || passive !== 'none' || sort !== 'default';
    },

    _refreshDraftView() {
        if (this._hasActiveDraftFilters()) {
            this.applyDraftFilters();
        } else {
            this.renderDraft();
        }
    },

    addDraftCard(index) {
        if (this.appState !== 'DRAFT') return;
        const card = this.cards[index];
        const count = this.draftedCards.filter(c => c.name === card.name).length;

        if (this.draftedCards.length < this._getDraftLimit() && count < 2) {
            this.draftedCards.push(card);
            this._refreshDraftView();
        }
    },

    removeDraftCard(draftIndex) {
        if (this.appState !== 'DRAFT') return;
        this.draftedCards.splice(draftIndex, 1);
        this._refreshDraftView();
    },

    /** Volta da tela de battlegears para a tela de criaturas */
    backToCreatureDraft() {
        this.draftState = 'CREATURES';
        this._bgRecommendations = null;
        this._bgPickerOpen = null;

        // Esconde tela de battlegear
        const bgScreen = document.getElementById('battlegear-draft-screen');
        if (bgScreen) bgScreen.style.display = 'none';

        // Reexibe cabeçalho do draft (draft-header que advanceDraft escondeu)
        const draftHeader = document.querySelector('.draft-header');
        if (draftHeader) draftHeader.style.display = '';

        // Reexibe grid de cartas e filtros
        const cardGrid  = document.getElementById('draft-cards-container');
        const filterBar = document.getElementById('draft-filters');
        if (cardGrid)  cardGrid.style.display  = '';
        if (filterBar) filterBar.style.display = '';

        this.renderDraft();   // re-renderiza cartas com estado atual (selecionadas em verde)
        this._syncDraftControls(); // restaura painel, botão e seletor de dificuldade
    },

    /** Volta da tela de mugics para a tela de battlegears */
    backToBattlegearDraft() {
        this.draftState = 'BATTLEGEARS';

        const mgScreen = document.getElementById('mugic-draft-screen');
        const bgScreen = document.getElementById('battlegear-draft-screen');
        const finishBtn = document.getElementById('btn-finish-draft');

        if (mgScreen) mgScreen.style.display = 'none';
        if (bgScreen) bgScreen.style.display = 'block';
        if (finishBtn) {
            finishBtn.classList.remove('hidden');
            finishBtn.style.display = 'block';
        }

        this.renderBattlegearDraft();
    },

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
    },

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
    },

    _recommendBattlegears() {
        // Para cada criatura, ordena todos os battlegears por score e retorna o top
        return this.draftedCards.map(creature => {
            const scored = this.battlegearsData
                .map((bg, idx) => ({ bg, idx, score: this._scoreBattlegearForCreature(bg, creature) }))
                .sort((a, b) => b.score - a.score);
            return scored; // [0] = melhor
        });
    },

    renderBattlegearDraft() {
        const armyListContainer = document.getElementById("army-list");
        const counter           = document.getElementById("bg-draft-counter");
        if (!armyListContainer) return;

        // Gera sugestões se ainda não foram aplicadas
        if (!this._bgRecommendations) {
            this._bgRecommendations = this._recommendBattlegears();
            // Pré-equipar com um battlegear aleatório entre os "muito indicados" (≥50% do top score)
            // Assim cada vez que o jogador entra na tela de battlegear, a sugestão varia.
            this.draftedCards.forEach((_, i) => {
                if (this.draftedBattlegears[i]) return; // já equipado manualmente, não sobrescreve
                const recs = this._bgRecommendations[i] || [];
                if (recs.length === 0) return;
                const topScore  = recs[0].score || 1;
                // Filtra apenas os que têm pelo menos 50% da afinidade do melhor
                const goodOnes  = recs.filter(r => r.score >= topScore * 0.5);
                // Sorteia entre os bons (máximo 5 candidatos para não pegar lixo)
                const pool      = goodOnes.slice(0, 5);
                const picked    = pool[Math.floor(Math.random() * pool.length)];
                this.draftedBattlegears[i] = picked.bg;
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

        // Injeta botão de voltar no topo da tela (só uma vez)
        const bgScreen = document.getElementById('battlegear-draft-screen');
        if (bgScreen && !bgScreen.querySelector('.back-btn')) {
            const backBtn = document.createElement('button');
            backBtn.className = 'back-btn';
            backBtn.innerHTML = '← Voltar às Criaturas';
            backBtn.onclick = () => this.backToCreatureDraft();
            bgScreen.insertBefore(backBtn, bgScreen.firstChild);
        }

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

        // Botão "Randomizar tudo" — injeta uma única vez
        const bgScreenEl = document.getElementById('battlegear-draft-screen');
        if (bgScreenEl && !bgScreenEl.querySelector('#btn-randomize-bg')) {
            const randBtn = document.createElement('button');
            randBtn.id = 'btn-randomize-bg';
            randBtn.className = 'btn';
            randBtn.innerHTML = '🎲 Randomizar Equipamentos';
            randBtn.style.cssText = 'margin:0 auto 12px;display:block;background:rgba(99,102,241,0.15);border:1px solid #6366f1;color:#a5b4fc;font-size:13px;padding:7px 18px;border-radius:8px;cursor:pointer;transition:all 0.15s;';
            randBtn.onmouseover = () => { randBtn.style.background = 'rgba(99,102,241,0.3)'; };
            randBtn.onmouseout  = () => { randBtn.style.background = 'rgba(99,102,241,0.15)'; };
            randBtn.onclick = () => this.randomizeBattlegears();
            const existingBack = bgScreenEl.querySelector('.back-btn');
            if (existingBack && existingBack.nextSibling) {
                bgScreenEl.insertBefore(randBtn, existingBack.nextSibling);
            } else {
                bgScreenEl.insertBefore(randBtn, bgScreenEl.firstChild);
            }
        }
    },

    /** Re-sorteia todos os battlegears entre os "muito indicados" para cada criatura */
    randomizeBattlegears() {
        if (!this._bgRecommendations) {
            this._bgRecommendations = this._recommendBattlegears();
        }
        this.draftedCards.forEach((_, i) => {
            const recs = this._bgRecommendations[i] || [];
            if (recs.length === 0) return;
            const topScore = recs[0].score || 1;
            const pool     = recs.filter(r => r.score >= topScore * 0.5).slice(0, 5);
            this.draftedBattlegears[i] = pool[Math.floor(Math.random() * pool.length)].bg;
        });
        this.renderBattlegearDraft();
    },

    toggleBgPicker(creatureIndex) {
        this._bgPickerOpen = this._bgPickerOpen === creatureIndex ? null : creatureIndex;
        this.renderBattlegearDraft();
    },

    pickBattlegear(creatureIndex, bgIndex) {
        this.draftedBattlegears[creatureIndex] = this.battlegearsData[bgIndex];
        this._bgPickerOpen = null; // fecha o picker
        this.renderBattlegearDraft();
    },

    selectBattlegearToEquip(index) {
        this.selectedBgToEquip = index;
        this.renderBattlegearDraft();
    },

    equipBattlegear(draftIndex) {
        if (this.selectedBgToEquip === null) {
            this.showAlert("⚔️ Equipamento não selecionado", "Selecione um equipamento primeiro na lista ao lado!");
            return;
        }
        this.draftedBattlegears[draftIndex] = this.battlegearsData[this.selectedBgToEquip];
        this.selectedBgToEquip = null;
        this.renderBattlegearDraft();
    },

    // ── Score de afinidade de Mugic ───────────────────────────────────────────

    /** Pontua 0–100 o quanto uma mugic sinergiza com o time atual */
    _calcMugicAffinity(mg) {
        let score = 0;
        const armyTribes = new Set(this.draftedCards.map(c => c.tribe));

        // Tribo compatível sem penalidade (+30)
        if (mg.tribe === 'Generic' || armyTribes.has(mg.tribe)) score += 30;

        // Efeito de cura — bom se o time tem pouca vida média (+20)
        const avgEnergy = this.draftedCards.reduce((s,c)=>s+(c.energy||0),0) / (this.draftedCards.length||1);
        if (['heal','conditional_heal','heal_and_grant_element','heal_and_reduce_fire','energy_steal','energy_transfer'].includes(mg.effectType)) {
            score += avgEnergy < 50 ? 25 : 15;
        }

        // Dano — bom sempre (+15)
        if (mg.effectType === 'damage') score += 15;

        // Buff de stats — bom se o time tem stats baixos (+15)
        const avgPower = this.draftedCards.reduce((s,c)=>s+(c.power||0),0) / (this.draftedCards.length||1);
        if (['buff_all_stats','buff_combat_stats','damage_reduction_aura'].includes(mg.effectType) && avgPower < 60) score += 15;

        // Custo baixo — mais fácil de usar (+10 se custo ≤ 1)
        if ((mg.cost||0) <= 1) score += 10;
        else if ((mg.cost||0) >= 3) score -= 10;

        // Diversidade — não repetir o mesmo tipo na mão já escolhida (+10)
        const alreadyHasType = this.draftedMugics.some(m => m.effectType === mg.effectType);
        if (!alreadyHasType) score += 10;

        return Math.max(0, Math.min(100, Math.round(score)));
    },

    /** Retorna as 6 mugics mais recomendadas para o time atual */
    _recommendMugics() {
        return [...this.mugics]
            .map((mg, idx) => ({ mg, idx, score: this._calcMugicAffinity(mg) }))
            .sort((a, b) => b.score - a.score);
    },

    /** Pré-seleciona automaticamente as 6 mugics mais sinérgicas */
    autoSelectMugics() {
        this.draftedMugics = [];
        const recs = this._recommendMugics();
        const mgLim = this._getDraftLimit();
        for (const { mg } of recs) {
            if (this.draftedMugics.length >= mgLim) break;
            const typeCount = this.draftedMugics.filter(m => m.effectType === mg.effectType).length;
            if (typeCount < 2) this.draftedMugics.push(mg);
        }
        // Completa se ainda faltou (caso raro)
        for (const { mg } of recs) {
            if (this.draftedMugics.length >= mgLim) break;
            if (!this.draftedMugics.includes(mg)) this.draftedMugics.push(mg);
        }
        this.renderMugicDraft();
        this.log('🎶 Mugics recomendadas pré-selecionadas!');
    },

    /** Randomiza entre as mugics de boa afinidade (≥ 50%) */
    randomizeMugics() {
        this.draftedMugics = [];
        const recs   = this._recommendMugics();
        const topScore = recs[0]?.score || 1;
        const pool   = recs.filter(r => r.score >= topScore * 0.5).slice(0, 12);
        const picked = [];
        while (picked.length < this._getDraftLimit() && pool.length > 0) {
            const i   = Math.floor(Math.random() * pool.length);
            const { mg } = pool.splice(i, 1)[0];
            const typeCount = picked.filter(m => m.effectType === mg.effectType).length;
            if (typeCount < 2) picked.push(mg);
        }
        // Completa se necessário
        const lim = this._getDraftLimit();
        for (const { mg } of recs) {
            if (picked.length >= lim) break;
            if (!picked.includes(mg)) picked.push(mg);
        }
        this.draftedMugics = picked;
        this.renderMugicDraft();
        this.log('🎲 Mugics randomizadas entre as mais sinérgicas!');
    },

    advanceToMugicDraft() {
        this.draftState = 'MUGICS';
        document.getElementById("battlegear-draft-screen").style.display = "none";
        const mgScreen = document.getElementById("mugic-draft-screen");
        mgScreen.style.display = "block";
        document.getElementById("btn-finish-draft").style.display = "none";

        // Injeta botão de voltar no topo (só uma vez)
        if (!mgScreen.querySelector('.back-btn')) {
            const backBtn = document.createElement('button');
            backBtn.className = 'back-btn';
            backBtn.innerHTML = '← Voltar aos Battlegears';
            backBtn.onclick = () => this.backToBattlegearDraft();
            mgScreen.insertBefore(backBtn, mgScreen.firstChild);
        }

        // Injeta botões de Recomendar e Randomizar (só uma vez)
        if (!mgScreen.querySelector('#btn-recommend-mg')) {
            const bar = document.createElement('div');
            bar.style.cssText = 'display:flex;gap:10px;justify-content:center;margin:0 0 14px;';

            const recBtn = document.createElement('button');
            recBtn.id = 'btn-recommend-mg';
            recBtn.className = 'btn';
            recBtn.innerHTML = '⭐ Recomendar Mugics';
            recBtn.style.cssText = 'background:rgba(245,158,11,0.15);border:1px solid #f59e0b;color:#fcd34d;font-size:13px;padding:7px 16px;border-radius:8px;cursor:pointer;';
            recBtn.onclick = () => this.autoSelectMugics();

            const rndBtn = document.createElement('button');
            rndBtn.id = 'btn-randomize-mg';
            rndBtn.className = 'btn';
            rndBtn.innerHTML = '🎲 Randomizar';
            rndBtn.style.cssText = 'background:rgba(99,102,241,0.15);border:1px solid #6366f1;color:#a5b4fc;font-size:13px;padding:7px 16px;border-radius:8px;cursor:pointer;';
            rndBtn.onclick = () => this.randomizeMugics();

            bar.appendChild(recBtn);
            bar.appendChild(rndBtn);

            const backBtn = mgScreen.querySelector('.back-btn');
            if (backBtn) backBtn.insertAdjacentElement('afterend', bar);
            else mgScreen.insertBefore(bar, mgScreen.firstChild);
        }

        this.currentMugicTribeFilter = 'All';
        this.currentMugicTypeFilter = 'All';

        const tribeSelect = document.getElementById("mg-tribe-filter");
        const typeSelect = document.getElementById("mg-type-filter");
        if(tribeSelect) tribeSelect.value = 'All';
        if(typeSelect) typeSelect.value = 'All';

        // Atualiza título com limite correto
        const titleEl = document.getElementById('mugic-draft-title');
        if (titleEl) titleEl.textContent = `Componha seu Arsenal Mugic (${this._getDraftLimit()} Cartas)`;

        // Pré-seleciona automaticamente se a mão ainda está vazia
        if (this.draftedMugics.length === 0) this.autoSelectMugics();
        else this.renderMugicDraft();
    },

    filterMugicDraft() {
        const tribeSelect = document.getElementById("mg-tribe-filter");
        const typeSelect = document.getElementById("mg-type-filter");
        if(tribeSelect) this.currentMugicTribeFilter = tribeSelect.value;
        if(typeSelect) this.currentMugicTypeFilter = typeSelect.value;
        this.renderMugicDraft();
    },

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

            // Score de afinidade
            const afScore     = this._calcMugicAffinity(mg);
            const afColor     = afScore >= 70 ? '#22c55e' : afScore >= 40 ? '#f59e0b' : '#ef4444';
            const afLabel     = afScore >= 70 ? '⭐ Muito indicada' : afScore >= 40 ? '👍 Indicada' : '○ Baixa sinergia';
            const alreadyDrafted = this.draftedMugics.some(m => m.name === mg.name);

            mgHtml += `
                <div onclick="game.draftMugic(${index})"
                     style="background: linear-gradient(160deg, #1a1a2e 60%, rgba(0,0,0,0.85));
                            border: 2px solid ${alreadyDrafted ? '#6366f1' : isAffiliated ? afColor+'88' : '#e74c3c'};
                            border-radius: 10px; padding: 12px; cursor: pointer;
                            display: flex; flex-direction: column; gap: 7px;
                            transition: transform 0.15s, box-shadow 0.15s;
                            ${alreadyDrafted ? 'opacity:0.5;filter:grayscale(40%);' : ''}"
                     onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.6)'"
                     onmouseout="this.style.transform='';this.style.boxShadow=''">

                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:4px;">
                        <div style="font-weight:bold; color:#f1c40f; font-size:13px; line-height:1.3;">${mg.name}${alreadyDrafted ? ' ✓' : ''}</div>
                        <div style="font-size:14px; flex-shrink:0;" title="${mg.rarity || 'Common'}">${rarityIcon}</div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:10px; color:${tribeColor}; font-weight:bold; background:rgba(0,0,0,0.4); padding:2px 7px; border-radius:10px;">${mg.tribe}</span>
                        <span style="font-size:11px; color:#ecf0f1;">Custo: <b style="color:#9b59b6;">${mg.cost} ♪</b></span>
                    </div>

                    <!-- Barra de afinidade -->
                    <div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                            <span style="font-size:9px;color:${afColor};">${afLabel}</span>
                            <span style="font-size:9px;font-weight:700;color:${afColor};">${afScore}%</span>
                        </div>
                        <div style="height:4px;background:#1e293b;border-radius:2px;overflow:hidden;">
                            <div style="width:${afScore}%;height:100%;background:${afColor};border-radius:2px;transition:width 0.4s;"></div>
                        </div>
                    </div>

                    <div style="border-top:1px solid rgba(255,255,255,0.1);"></div>
                    <div style="font-size:11px; color:#bdc3c7; line-height:1.5; text-align:left;">${mg.description}</div>
                    ${warningHtml}
                </div>
            `;
        });
        mgListContainer.innerHTML = mgHtml;

        let draftedHtml = '';
        for (let i = 0; i < this._getDraftLimit(); i++) {
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

        const mgLimit = this._getDraftLimit();
        counter.innerText = `${this.draftedMugics.length} / ${mgLimit} Escolhidas`;

        if (this.draftedMugics.length === mgLimit) {
            finishBtn.classList.remove('hidden');
            finishBtn.style.display = 'block';
        } else {
            finishBtn.classList.add('hidden');
            finishBtn.style.display = 'none';
        }
    },

    draftMugic(index) {
        const mgLim = this._getDraftLimit();
        if (this.draftedMugics.length >= mgLim) {
            this.showAlert("🎶 Mão Completa", `Você já escolheu ${mgLim} Mugics!`);
            return;
        }
        this.draftedMugics.push(this.mugics[index]);
        this.renderMugicDraft();
    },

    removeDraftedMugic(draftIndex) {
        this.draftedMugics.splice(draftIndex, 1);
        this.renderMugicDraft();
    },

    // ─── Tela de Formação ────────────────────────────────────────────────────

    openFormationScreen() {
        // Esconde draft, mostra tela de formação
        const draftScreen = document.getElementById('draft-screen');
        if (draftScreen) draftScreen.classList.add('hidden');
        const formScreen = document.getElementById('formation-screen');
        if (formScreen) formScreen.style.display = 'block';

        // Inicializa o estado de formação: todas as criaturas no banco
        const limit = this._getDraftLimit();
        this._formationSlots = Array(limit).fill(null); // posição → criatura (ou null)
        this._formationSelected = null;                 // índice da carta selecionada no banco

        this._renderFormationScreen();
    },

    _getFormationGrid() {
        // Retorna o layout visual do tabuleiro como array de {r, c, label}
        if (this.gameMode === '1v1') return [{r:0,c:0}];
        if (this.gameMode === '3v3') return [
            {r:0,c:0,label:'Frente E'}, {r:0,c:1,label:'Frente D'},
            {r:1,c:0,label:'Trás'},
        ];
        // 6v6 padrão
        return [
            {r:0,c:0,label:'Frente E'}, {r:0,c:1,label:'Frente C'}, {r:0,c:2,label:'Frente D'},
            {r:1,c:0,label:'Meio E'},   {r:1,c:1,label:'Meio D'},
            {r:2,c:0,label:'Trás'},
        ];
    },

    _renderFormationScreen() {
        const boardEl = document.getElementById('formation-board');
        const benchEl = document.getElementById('formation-bench');
        const confirmBtn = document.getElementById('btn-confirm-formation');
        if (!boardEl || !benchEl) return;

        const grid    = this._getFormationGrid();
        const slots   = this._formationSlots;
        const sel     = this._formationSelected;
        const tribeColors = {
            OverWorld:'#0ea5e9', UnderWorld:'#dc2626',
            Mipedian:'#d97706', Danian:'#9333ea', "M'arrillian":'#0f766e'
        };

        // ── Renderiza o tabuleiro ─────────────────────────────────────────
        // Agrupa slots por linha para montar o grid visual
        const rows = {};
        grid.forEach((pos, si) => {
            if (!rows[pos.r]) rows[pos.r] = [];
            rows[pos.r].push({ ...pos, slotIndex: si });
        });

        let boardHtml = `<div style="display:flex;flex-direction:column;gap:8px;align-items:center;">`;
        Object.keys(rows).sort((a,b) => b-a).forEach(rowKey => { // trás→frente (de cima pra baixo)
            boardHtml += `<div style="display:flex;gap:8px;justify-content:center;">`;
            rows[rowKey].forEach(({ slotIndex, label }) => {
                const card     = slots[slotIndex];
                const isTarget = sel !== null && !card; // slot vazio e tem carta selecionada
                const color    = card ? (tribeColors[card.tribe] || '#64748b') : '#334155';
                const border   = isTarget ? '2px dashed #22c55e' : `2px solid ${color}`;
                const bg       = isTarget ? 'rgba(34,197,94,0.1)' : card ? `${color}18` : 'rgba(255,255,255,0.03)';
                const cursor   = (isTarget || card) ? 'pointer' : 'default';

                boardHtml += `
                <div onclick="game._formationClickSlot(${slotIndex})"
                     style="width:110px;height:130px;border-radius:10px;border:${border};
                            background:${bg};display:flex;flex-direction:column;
                            align-items:center;justify-content:center;gap:4px;
                            cursor:${cursor};transition:all 0.15s;position:relative;"
                     ${isTarget ? 'onmouseover="this.style.background=\'rgba(34,197,94,0.2)\'"  onmouseout="this.style.background=\'rgba(34,197,94,0.1)\'"' : ''}>
                    ${card ? `
                        <img src="${card.image || ''}" onerror="this.style.display='none'"
                             style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid ${color}66;">
                        <div style="font-size:11px;font-weight:700;color:#f1f5f9;text-align:center;line-height:1.2;">${card.name}</div>
                        <div style="font-size:9px;color:${color};">${card.tribe}</div>
                        <div style="font-size:9px;color:#64748b;">❤️${card.energy}</div>
                        <div style="position:absolute;top:4px;right:4px;font-size:10px;cursor:pointer;color:#ef4444;"
                             onclick="event.stopPropagation();game._formationRemoveCard(${slotIndex})">✕</div>
                    ` : `
                        <div style="font-size:22px;opacity:0.3;">${isTarget ? '✅' : '+'}</div>
                        <div style="font-size:10px;color:#475569;">${label}</div>
                    `}
                </div>`;
            });
            boardHtml += `</div>`;
        });
        boardHtml += `</div>`;
        boardEl.innerHTML = boardHtml;

        // ── Renderiza o banco (criaturas não posicionadas) ─────────────────
        const placed  = new Set(slots.filter(Boolean).map(c => c.name));
        const bench   = this.draftedCards.filter(c => {
            const count = slots.filter(s => s && s.name === c.name).length;
            const total = this.draftedCards.filter(d => d.name === c.name).length;
            return count < total; // ainda tem cópias no banco
        });

        // Conta cópias não posicionadas por criatura
        const benchMap = {};
        this.draftedCards.forEach(c => {
            if (!benchMap[c.name]) benchMap[c.name] = { card: c, total: 0, placed: 0 };
            benchMap[c.name].total++;
        });
        slots.filter(Boolean).forEach(c => { if (benchMap[c.name]) benchMap[c.name].placed++; });

        let benchHtml = '';
        Object.values(benchMap).forEach(({ card, total, placed: p }, i) => {
            const remaining = total - p;
            if (remaining <= 0) return;
            const color   = tribeColors[card.tribe] || '#64748b';
            const isSel   = sel === i;
            benchHtml += `
            <div onclick="game._formationSelectCard(${i})"
                 style="display:flex;align-items:center;gap:10px;
                        padding:8px 12px;border-radius:10px;cursor:pointer;
                        border:2px solid ${isSel ? '#22c55e' : color+'44'};
                        background:${isSel ? 'rgba(34,197,94,0.15)' : color+'0d'};
                        transition:all 0.15s;"
                 onmouseover="this.style.borderColor='${color}88'"
                 onmouseout="this.style.borderColor='${isSel ? '#22c55e' : color+'44'}'">
                <img src="${card.image || ''}" onerror="this.style.display='none'"
                     style="width:44px;height:44px;object-fit:cover;border-radius:6px;flex-shrink:0;">
                <div style="min-width:0;">
                    <div style="font-size:12px;font-weight:700;color:#f1f5f9;">${card.name}</div>
                    <div style="font-size:10px;color:${color};">${card.tribe}</div>
                    <div style="font-size:10px;color:#64748b;">❤️${card.energy} · ${remaining}× disponível</div>
                </div>
                ${isSel ? '<span style="margin-left:auto;color:#22c55e;font-size:14px;">✓</span>' : ''}
            </div>`;
        });
        benchEl.innerHTML = benchHtml || '<div style="color:#475569;font-size:12px;">Todas posicionadas!</div>';

        // Botão de confirmar só ativa quando todos os slots estão preenchidos
        const limit  = this._getDraftLimit();
        const allFilled = slots.filter(Boolean).length === limit;
        if (confirmBtn) {
            confirmBtn.disabled      = !allFilled;
            confirmBtn.style.opacity = allFilled ? '1' : '0.5';
            confirmBtn.style.cursor  = allFilled ? 'pointer' : 'not-allowed';
            confirmBtn.style.background = allFilled ? 'linear-gradient(135deg,#1e40af,#3b82f6)' : 'rgba(30,64,175,0.3)';
            confirmBtn.style.color      = allFilled ? 'white' : '#93c5fd';
        }
    },

    _formationSelectCard(benchIndex) {
        // Seleciona (ou deseleciona) uma carta do banco
        this._formationSelected = this._formationSelected === benchIndex ? null : benchIndex;
        this._renderFormationScreen();
    },

    _formationClickSlot(slotIndex) {
        const sel = this._formationSelected;

        if (sel !== null) {
            // Tem carta selecionada → posiciona no slot
            const benchMap = {};
            this.draftedCards.forEach(c => {
                if (!benchMap[c.name]) benchMap[c.name] = { card: c, total: 0 };
                benchMap[c.name].total++;
            });
            this._formationSlots.filter(Boolean).forEach(c => {
                if (benchMap[c.name]) benchMap[c.name].placed = (benchMap[c.name].placed || 0) + 1;
            });

            const benchEntries = Object.values(benchMap);
            const entry = benchEntries[sel];
            if (!entry) return;

            const placed = this._formationSlots.filter(s => s && s.name === entry.card.name).length;
            if (placed >= entry.total) return; // sem cópias sobrando

            // Se o slot já tem uma carta, devolve ao banco
            if (this._formationSlots[slotIndex]) {
                // swap: só reposiciona — será renderizado limpo
                this._formationSlots[slotIndex] = null;
            }
            this._formationSlots[slotIndex] = entry.card;
            this._formationSelected = null;

        } else if (this._formationSlots[slotIndex]) {
            // Sem seleção ativa → seleciona a carta do slot para mover
            // Remove do slot e coloca de volta no banco como "selecionada"
            const card = this._formationSlots[slotIndex];
            this._formationSlots[slotIndex] = null;

            // Encontra índice no benchMap
            const benchMap = {};
            this.draftedCards.forEach((c, idx) => {
                const key = c.name;
                if (!benchMap[key]) benchMap[key] = idx;
            });
            this._formationSelected = Object.keys(benchMap).indexOf(card.name);
        }

        this._renderFormationScreen();
    },

    _formationRemoveCard(slotIndex) {
        this._formationSlots[slotIndex] = null;
        this._formationSelected = null;
        this._renderFormationScreen();
    },

    resetFormation() {
        const limit = this._getDraftLimit();
        this._formationSlots = Array(limit).fill(null);
        this._formationSelected = null;
        this._renderFormationScreen();
    },

    randomizeFormation() {
        const limit = this._getDraftLimit();
        const shuffled = [...this.draftedCards].sort(() => Math.random() - 0.5);
        this._formationSlots = shuffled.slice(0, limit).map(c => c);
        this._formationSelected = null;
        this._renderFormationScreen();
    },

    confirmFormation() {
        const limit = this._getDraftLimit();
        if (this._formationSlots.filter(Boolean).length < limit) return;
        // Salva a formação escolhida — será usada em setupBoard
        this._customFormation = [...this._formationSlots];
        // Esconde tela de formação e inicia batalha
        const formScreen = document.getElementById('formation-screen');
        if (formScreen) formScreen.style.display = 'none';
        this.startBattle();
    },

    startBattle() {
        this.appState = 'BATTLE';

        // Modo multiplayer: troca de drafts
        if (this.multiplayerMode) {
            const draftScreen = document.getElementById("draft-screen");
            if (draftScreen) draftScreen.classList.add('hidden');
            document.getElementById("battle-screen").classList.remove('hidden');

            this.myDraftReady = true;
            // Envia a ordem da formação customizada para o oponente poder posicionar
            // as cartas da mesma forma que o jogador configurou
            const formationOrder = this._customFormation
                ? this._customFormation.map(c => c ? c.name : null)
                : null;
            this.sendAction('opponent_draft', {
                draft: {
                    cards:          this.draftedCards,
                    battlegears:    this.draftedBattlegears,
                    mugics:         this.draftedMugics,
                    formationOrder  // array de nomes na ordem da tela de formação
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
        if (this.draftedMugics && this.draftedMugics.length === this._getDraftLimit()) {
            this.playerMugics = JSON.parse(JSON.stringify(this.draftedMugics));
        } else {
            // Fallback caso as mugics não existam (ex: pulou o draft no dev mode)
            if (this.mugics && this.mugics.length > 0) {
                for (let i = 0; i < this._getDraftLimit(); i++) {
                    const randIndex = Math.floor(Math.random() * this.mugics.length);
                    this.playerMugics.push(JSON.parse(JSON.stringify(this.mugics[randIndex])));
                }
            }
        }

        // IA P2 monta deck de acordo com a dificuldade
        const diff = this.aiDifficulty || 'easy';
        let aiCards = [];
        let aiBg    = [];
        let aiMugics = [];

        // ── Resolve qual tribo a IA vai usar ────────────────────────────────
        const tribeChoice = this.aiTribeChoice || 'auto';
        const allTribes   = ['OverWorld','UnderWorld','Mipedian','Danian'];

        const _resolveAiTribe = () => {
            if (tribeChoice !== 'auto') return tribeChoice;

            if (diff === 'easy') return null; // aleatório total

            if (diff === 'medium') return null; // top stats, sem tribo fixa

            // Difícil/auto: counter-pick da tribo principal do jogador
            const playerTribes = {};
            this.draftedCards.forEach(c => { playerTribes[c.tribe] = (playerTribes[c.tribe] || 0) + 1; });
            const playerMain = Object.entries(playerTribes).sort((a,b) => b[1]-a[1])[0]?.[0];
            return allTribes.filter(t => t !== playerMain)
                .map(t => ({
                    tribe: t,
                    score: this.cards.filter(c => c.tribe === t)
                                     .reduce((s,c) => s + c.power + c.courage + c.energy, 0)
                }))
                .sort((a,b) => b.score - a.score)[0]?.tribe || 'UnderWorld';
        };

        const aiTribe = _resolveAiTribe(); // null = sem restrição de tribo

        // ── Monta o pool de cartas ────────────────────────────────────────
        const _tribePool = (tribe) => {
            const cards = tribe
                ? this.cards.filter(c => c.tribe === tribe)
                : [...this.cards];
            // fallback: se a tribo não tiver cartas suficientes, completa com qualquer uma
            if (cards.length < 6) cards.push(...this.cards);
            return cards.sort((a,b) => (b.power + b.courage + b.energy) - (a.power + a.courage + a.energy));
        };

        const aiLimit = this._getDraftLimit();

        if (diff === 'easy') {
            const pool = aiTribe ? this.cards.filter(c => c.tribe === aiTribe) : this.cards;
            const src  = pool.length >= aiLimit ? pool : this.cards;
            for (let i = 0; i < aiLimit; i++) {
                aiCards.push(JSON.parse(JSON.stringify(src[Math.floor(Math.random() * src.length)])));
            }
        } else if (diff === 'medium') {
            const pool    = _tribePool(aiTribe);
            const topHalf = pool.slice(0, Math.max(aiLimit, Math.ceil(pool.length * 0.5)));
            for (let i = 0; i < aiLimit; i++) {
                aiCards.push(JSON.parse(JSON.stringify(topHalf[Math.floor(Math.random() * topHalf.length)])));
            }
        } else {
            const pool = _tribePool(aiTribe);
            for (let i = 0; i < aiLimit; i++) {
                aiCards.push(JSON.parse(JSON.stringify(pool[i] || pool[Math.floor(Math.random() * pool.length)])));
            }
        }

        const chosenTribeLabel = aiTribe || (tribeChoice !== 'auto' ? tribeChoice : 'aleatório');
        this.log(`🤖 IA [${diff}] montou deck — Tribo: ${chosenTribeLabel}`);

        // Battlegears: fácil=aleatório, médio/difícil=melhor por criatura
        for (let i = 0; i < aiCards.length; i++) {
            if (!this.battlegearsData || this.battlegearsData.length === 0) {
                aiBg.push(null); continue;
            }
            if (diff === 'easy') {
                aiBg.push(JSON.parse(JSON.stringify(
                    this.battlegearsData[Math.floor(Math.random() * this.battlegearsData.length)]
                )));
            } else {
                // Usa o mesmo _scoreBattlegearForCreature da IA de recomendação
                let bestBg = null, bestScore = -1;
                for (const bg of this.battlegearsData) {
                    const score = this._scoreBattlegearForCreature(bg, aiCards[i]);
                    if (score > bestScore) { bestScore = score; bestBg = bg; }
                }
                aiBg.push(bestBg ? JSON.parse(JSON.stringify(bestBg)) : null);
            }
        }

        // Mugics: fácil=aleatório, médio=heals+dano, difícil=melhor combo
        if (this.mugics && this.mugics.length > 0) {
            if (diff === 'easy') {
                for (let i = 0; i < aiLimit; i++) {
                    aiMugics.push(JSON.parse(JSON.stringify(
                        this.mugics[Math.floor(Math.random() * this.mugics.length)]
                    )));
                }
            } else {
                const aiTribe = aiCards[0]?.tribe || 'Generic';
                const tribePool = this.mugics.filter(m => m.tribe === aiTribe || m.tribe === 'Generic');
                const usePool   = tribePool.length >= aiLimit ? tribePool : this.mugics;
                const priority  = { heal: 4, damage: 3, buff_all_stats: 2, buff_combat_stats: 2 };
                const sorted    = [...usePool].sort((a, b) =>
                    (priority[b.effectType] || 0) - (priority[a.effectType] || 0)
                );
                for (let i = 0; i < aiLimit; i++) {
                    aiMugics.push(JSON.parse(JSON.stringify(sorted[i % sorted.length])));
                }
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

        this._boardEntryPending = true; // sinaliza para o renderBoard disparar a entrada
        // Limpa e reseta o log estruturado para nova batalha
        if (this.logElement) this.logElement.innerHTML = '';
        this._logRound = 0;
        this.renderBoard();
        this.renderMugics();
        this.renderLocation();
        this.log("O combate começou! É a sua vez.");
    },

});
