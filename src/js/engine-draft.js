// engine-draft.js
Object.assign(GameEngine.prototype, {

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

        if (this.draftedCards.length < 6 && count < 2) {
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
        this.currentMugicTribeFilter = 'All';
        this.currentMugicTypeFilter = 'All';

        const tribeSelect = document.getElementById("mg-tribe-filter");
        const typeSelect = document.getElementById("mg-type-filter");
        if(tribeSelect) tribeSelect.value = 'All';
        if(typeSelect) typeSelect.value = 'All';

        this.renderMugicDraft();
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
    },

    draftMugic(index) {
        if (this.draftedMugics.length >= 6) {
            this.showAlert("🎶 Mão Completa", "Você já escolheu 6 Mugics!");
            return;
        }
        this.draftedMugics.push(this.mugics[index]);
        this.renderMugicDraft();
    },

    removeDraftedMugic(draftIndex) {
        this.draftedMugics.splice(draftIndex, 1);
        this.renderMugicDraft();
    },

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

        // IA P2 monta deck de acordo com a dificuldade
        const diff = this.aiDifficulty || 'easy';
        let aiCards = [];
        let aiBg    = [];
        let aiMugics = [];

        if (diff === 'easy') {
            // Fácil: tudo aleatório
            for (let i = 0; i < 6; i++) {
                aiCards.push(JSON.parse(JSON.stringify(
                    this.cards[Math.floor(Math.random() * this.cards.length)]
                )));
            }
        } else if (diff === 'medium') {
            // Médio: escolhe cartas com alto poder/coragem
            const sorted = [...this.cards].sort((a, b) =>
                (b.power + b.courage + b.energy) - (a.power + a.courage + a.energy)
            );
            // Top 50% + alguma aleatoriedade
            const pool = sorted.slice(0, Math.ceil(sorted.length * 0.5));
            for (let i = 0; i < 6; i++) {
                aiCards.push(JSON.parse(JSON.stringify(
                    pool[Math.floor(Math.random() * pool.length)]
                )));
            }
        } else {
            // Difícil: escolhe a melhor tribo sinérgica e monta deck focado
            // 1. Conta qual tribo do jogador tem mais cartas (para contrariar)
            const playerTribes = {};
            this.draftedCards.forEach(c => { playerTribes[c.tribe] = (playerTribes[c.tribe] || 0) + 1; });
            const playerMainTribe = Object.entries(playerTribes).sort((a,b) => b[1]-a[1])[0]?.[0];

            // 2. Escolhe uma tribo diferente com boas cartas
            const tribes = ['OverWorld','UnderWorld','Mipedian','Danian'];
            const counterTribe = tribes.filter(t => t !== playerMainTribe)
                .map(t => ({
                    tribe: t,
                    score: this.cards.filter(c => c.tribe === t)
                                     .reduce((s, c) => s + c.power + c.courage + c.energy, 0)
                }))
                .sort((a, b) => b.score - a.score)[0]?.tribe || 'UnderWorld';

            // 3. 4 cartas da tribo escolhida (melhores) + 2 cartas de alta energia
            const tribeCards = this.cards.filter(c => c.tribe === counterTribe)
                .sort((a, b) => (b.power + b.courage + b.energy) - (a.power + a.courage + a.energy));
            const topTribe = tribeCards.slice(0, 6);

            for (let i = 0; i < 6; i++) {
                const src = topTribe[i] || tribeCards[Math.floor(Math.random() * tribeCards.length)]
                            || this.cards[Math.floor(Math.random() * this.cards.length)];
                aiCards.push(JSON.parse(JSON.stringify(src)));
            }

            this.log(`🤖 IA [Difícil] montou deck ${counterTribe} para contra-atacar!`);
        }

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
                for (let i = 0; i < 6; i++) {
                    aiMugics.push(JSON.parse(JSON.stringify(
                        this.mugics[Math.floor(Math.random() * this.mugics.length)]
                    )));
                }
            } else {
                const aiTribe = aiCards[0]?.tribe || 'Generic';
                // Prefere mugics da tribo da IA ou Generic
                const tribePool = this.mugics.filter(m => m.tribe === aiTribe || m.tribe === 'Generic');
                const usePool   = tribePool.length >= 4 ? tribePool : this.mugics;

                // Prioridade: heal > damage > buff > resto
                const priority = { heal: 4, damage: 3, buff_all_stats: 2, buff_combat_stats: 2 };
                const sorted   = [...usePool].sort((a, b) =>
                    (priority[b.effectType] || 0) - (priority[a.effectType] || 0)
                );
                for (let i = 0; i < 6; i++) {
                    aiMugics.push(JSON.parse(JSON.stringify(
                        sorted[i % sorted.length]
                    )));
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

        this.renderBoard();
        this.renderMugics();
        this.renderLocation();
        this.log("O combate começou! É a sua vez.");
    },

});
