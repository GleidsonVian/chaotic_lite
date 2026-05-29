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
        this.playerMugics = []; // Mão de feitiços do jogador
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

        if (this.nextTurnBtn) {
            this.nextTurnBtn.addEventListener("click", () => this.nextTurn());
        }

        this.renderDraft();
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
                <div class="card" onclick="game.addDraftCard(${index})" style="${borderStyle} ${opacityStyle}">
                    <div class="card-header">
                        <div class="card-rarity-icon rarity-${(card.rarity || 'Common').toLowerCase().replace(/\s+/g, '-')}" title="${card.rarity || 'Common'}">${card.rarity === 'Ultra Rare' ? '💎' : card.rarity === 'Super Rare' ? '🔷' : card.rarity === 'Rare' ? '🔶' : card.rarity === 'Legendary' ? '🌟' : '⚪'}</div>
                        <div class="card-tribe">${card.tribe}</div>
                        <div class="card-name">${card.name} ${count > 0 ? `(x${count})` : ''}</div>
                    </div>
                    <div class="card-image-container">
                        ${card.image ? `<img src="${card.image}" class="card-image" alt="${card.name}">` : `<div class="card-image-placeholder">Sem Imagem</div>`}
                    </div>
                    
                    ${elementsHtml}
                    <div class="card-stats">
                        <div class="stat-box"><span>⚔️</span><span class="stat-value">${card.courage}</span></div>
                        <div class="stat-box"><span>💪</span><span class="stat-value">${card.power}</span></div>
                        <div class="stat-box"><span>🧠</span><span class="stat-value">${card.wisdom}</span></div>
                        <div class="stat-box"><span>⚡</span><span class="stat-value">${card.speed}</span></div>
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

    addDraftCard(index) {
        if (this.appState !== 'DRAFT') return;
        const card = this.cards[index];
        const count = this.draftedCards.filter(c => c.name === card.name).length;
        
        if (this.draftedCards.length < 6 && count < 2) {
            this.draftedCards.push(card);
            this.renderDraft();
        }
    }
    
    removeDraftCard(draftIndex) {
        if (this.appState !== 'DRAFT') return;
        this.draftedCards.splice(draftIndex, 1);
        this.renderDraft();
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
        
        this.renderBattlegearDraft();
    }

    renderBattlegearDraft() {
        const bgListContainer = document.getElementById("battlegear-list");
        const armyListContainer = document.getElementById("army-list");
        const counter = document.getElementById("bg-draft-counter");
        
        if (!bgListContainer || !armyListContainer) return;
        
        // Renderiza os equipamentos disponíveis
        let bgHtml = '';
        this.battlegearsData.forEach((bg, index) => {
            const isSelected = this.selectedBgToEquip === index;
            const borderStyle = isSelected ? 'border: 3px solid #f1c40f; box-shadow: 0 0 15px #f1c40f;' : 'border: 1px solid #7f8c8d;';
            
            bgHtml += `
                <div onclick="game.selectBattlegearToEquip(${index})" style="background: #2c3e50; padding: 10px; border-radius: 5px; cursor: pointer; text-align: center; ${borderStyle} transition: all 0.2s;">
                    <div style="color: #f1c40f; font-weight: bold; font-size: 12px; margin-bottom: 5px;">${bg.name}</div>
                    <div style="font-size: 10px; color: #bdc3c7;">${bg.description}</div>
                </div>
            `;
        });
        bgListContainer.innerHTML = bgHtml;
        
        // Renderiza o exército draftado
        let armyHtml = '';
        let equippedCount = 0;
        
        this.draftedCards.forEach((c, i) => {
            const equippedBg = this.draftedBattlegears[i];
            if (equippedBg) equippedCount++;
            
            let bgDisplay = equippedBg 
                ? `<div style="margin-top: 5px; font-size: 10px; color: #f1c40f; font-weight: bold; background: rgba(0,0,0,0.8); padding: 2px; border-radius: 3px;">Equipado</div>` 
                : `<div style="margin-top: 5px; font-size: 10px; color: #e74c3c; font-weight: bold;">Sem Item</div>`;
                
            armyHtml += `
                <div onclick="game.equipBattlegear(${i})" style="width: 90px; cursor: pointer; border: 2px solid ${equippedBg ? '#2ecc71' : '#e74c3c'}; border-radius: 5px; padding: 5px; text-align: center; background: #34495e;">
                    <div style="font-size: 11px; font-weight: bold; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px;">${c.name}</div>
                    <div style="width: 100%; height: 60px; background: #2c3e50; border-radius: 3px; overflow: hidden;">
                        ${c.image ? `<img src="${c.image}" style="width: 100%; height: 100%; object-fit: cover;">` : ``}
                    </div>
                    ${bgDisplay}
                </div>
            `;
        });
        armyListContainer.innerHTML = armyHtml;
        
             // Update button
        const finishBtn = document.getElementById('btn-finish-draft');
        if (finishBtn) {
            if (equippedCount === 6) {
                finishBtn.classList.remove('hidden');
                finishBtn.style.display = 'block';
                // Mudar destino do botão para a Fase 3
                finishBtn.onclick = () => this.advanceToMugicDraft();
                finishBtn.innerText = "Escolher Mugics";
            } else {
                finishBtn.classList.add('hidden');
                finishBtn.style.display = 'none';
            }
        }
        
        counter.innerText = `${equippedCount} / 6 Equipadas`;
    }

    selectBattlegearToEquip(index) {
        this.selectedBgToEquip = index;
        this.renderBattlegearDraft();
    }

    equipBattlegear(draftIndex) {
        if (this.selectedBgToEquip === null) {
            alert("Selecione um equipamento primeiro na lista ao lado!");
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
            
            mgHtml += `
                <div style="background: rgba(0,0,0,0.6); border: 2px solid ${isAffiliated ? '#2ecc71' : '#e74c3c'}; border-radius: 8px; padding: 10px; cursor: pointer; text-align: center; transition: all 0.2s; position: relative;"
                     onclick="game.draftMugic(${index})"
                     onmouseover="this.style.transform='scale(1.05)'"
                     onmouseout="this.style.transform='scale(1)'"
                     title="${mg.description}">
                    <div style="font-weight: bold; color: #f1c40f; font-size: 14px; margin-bottom: 5px;">${mg.name}</div>
                    <div style="font-size: 10px; color: #bdc3c7;">${mg.tribe} Mugic</div>
                    <div style="font-size: 12px; margin-top: 5px;">Custo: <b>${mg.cost} ♪</b></div>
                    ${warningHtml}
                </div>
            `;
        });
        mgListContainer.innerHTML = mgHtml;
        
        let draftedHtml = '';
        for (let i = 0; i < 6; i++) {
            if (i < this.draftedMugics.length) {
                const mg = this.draftedMugics[i];
                draftedHtml += `
                    <div style="background: rgba(46, 204, 113, 0.2); border: 1px solid #2ecc71; border-radius: 5px; padding: 10px; cursor: pointer; text-align: center; font-size: 12px; height: 100px; display: flex; flex-direction: column; justify-content: center;" onclick="game.removeDraftedMugic(${i})">
                        <span style="color: #f1c40f; font-weight: bold;">${mg.name}</span>
                        <span style="color: #bdc3c7; font-size: 10px; margin-top: 5px;">Custo: ${mg.cost} ♪</span>
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
            alert("Você já escolheu 6 Mugics!");
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
        this.renderBoard();
        this.renderMugics();
        this.log("O combate começou! É a sua vez.");
    }
    
    renderMugics() {
        const container = document.getElementById("player-hand");
        if (!container) return;
        
        let html = '';
        this.playerMugics.forEach((mugic, index) => {
            const isSelected = this.selectedMugic === index;
            const borderStyle = isSelected ? 'border: 3px solid #9b59b6; box-shadow: 0 0 15px #9b59b6; transform: scale(1.05);' : 'border: 1px solid #7f8c8d;';
            html += `
                <div style="width: 100px; height: 120px; background-color: #8e44ad; color: white; border-radius: 5px; padding: 5px; text-align: center; cursor: pointer; ${borderStyle}" onclick="game.handleMugicClick(${index})">
                    <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px;">${mugic.name}</div>
                    <div style="font-size: 10px; color: #bdc3c7; line-height: 1.2;">${mugic.description}</div>
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
                board[r][c] = null;
            }
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
        
        // Remove Mugic da mão
        this.playerMugics.splice(this.selectedMugic, 1);
        
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
                    card.bgRevealed = false;
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
                    card.bgRevealed = false; // Começa Face Down
                }
                this.boardP2[pos.r][pos.c] = card;
                p2Index++;
            }
        });
    }

    log(message) {
        console.log(message);
        if (this.logElement) {
            this.logElement.innerHTML = `<div>> ${message}</div>` + this.logElement.innerHTML;
            this.logElement.scrollTop = this.logElement.scrollHeight; // Auto-scroll
        }
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
        // Interações só são aceitas no Turno do Jogador 1
        if (this.turn !== 1) return;
        
        if (this.turn !== 1) return;
        
        if (this.gameState === 'SELECT_MUGIC_CASTER') {
            if (player === 1 && this.boardP1[r][c]) {
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
            if (this.gameState === 'SELECT_TARGET' && player === 1 && this.selectedAttacker) {
                if (this.isValidMove(this.selectedAttacker.r, this.selectedAttacker.c, r, c)) {
                    this.resolveMove(1, this.selectedAttacker.r, this.selectedAttacker.c, r, c);
                } else {
                    this.log("⚠️ Movimento inválido! Só é possível andar para espaços vazios adjacentes.");
                }
            }
            return;
        }

        const exposed = this.isExposed(player, r, c);

        if (this.gameState === 'IDLE' && player === 1) {
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
            if (player === 1) {
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
            else if (player === 2) {
                if (!exposed) {
                    this.log(`🛡️ ${clickedCard.name} está protegido por outras criaturas na frente! Escolha outro alvo.`);
                    return;
                }
                // Selecionou um inimigo válido! Inicia o combate
                const attacker = this.boardP1[this.selectedAttacker.r][this.selectedAttacker.c];
                this.startCombat(attacker, clickedCard, this.selectedAttacker.r, this.selectedAttacker.c, r, c, 1);
            }
        }
    }

    startCombat(attacker, defender, atkR, atkC, defR, defC, initiatingPlayer) {
        this.gameState = 'ENGAGED_COMBAT';
        
        // Revelar novo Local
        if (this.locationDeck.length > 0) {
            this.activeLocation = this.locationDeck.pop();
            this.log(`📍 Novo Local Revelado: ${this.activeLocation.name}! (${this.activeLocation.description})`);
            this.renderLocation();
        }
        
        // Revelar Equipamentos se ainda não foram revelados
        if (attacker.battlegear && !attacker.bgRevealed) {
            attacker.bgRevealed = true;
            this.log(`🔮 ${attacker.name} revelou seu Battlegear: [${attacker.battlegear.name}]! ${attacker.battlegear.description}`);
            if (attacker.battlegear.elementGranted && (!attacker.elements || !attacker.elements.includes(attacker.battlegear.elementGranted))) {
                if (!attacker.elements) attacker.elements = [];
                attacker.elements.push(attacker.battlegear.elementGranted);
                this.log(`✨ ${attacker.name} ganhou o elemento ${attacker.battlegear.elementGranted}!`);
            }
        }
        if (defender.battlegear && !defender.bgRevealed) {
            defender.bgRevealed = true;
            this.log(`🔮 ${defender.name} revelou seu Battlegear: [${defender.battlegear.name}]! ${defender.battlegear.description}`);
            if (defender.battlegear.elementGranted && (!defender.elements || !defender.elements.includes(defender.battlegear.elementGranted))) {
                if (!defender.elements) defender.elements = [];
                defender.elements.push(defender.battlegear.elementGranted);
                this.log(`✨ ${defender.name} ganhou o elemento ${defender.battlegear.elementGranted}!`);
            }
        }
        
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
            initiatingPlayer: initiatingPlayer
        };

        this.log(`⚔️ COMBATE INICIADO! Iniciativa: Jogador ${firstStriker} ataca primeiro (${initStat.toUpperCase()}).`);
        this.renderBoard();
        this.processCombatTurn();
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
            this.showAttackModal(p1Card, p2Card, p1R, p1C, p2R, p2C, 1);
        } else {
            this.pendingCombat = {
                attacker: p2Card, defender: p1Card,
                atkR: p2R, atkC: p2C, defR: p1R, defC: p1C,
                attackingPlayer: 2
            };
            // IA attack delay
            setTimeout(() => {
                const hand = this.p2AttackHand;
                let cardIndex = hand.reduce((bestIdx, currentCard, idx, arr) => {
                    return currentCard.baseDamage > arr[bestIdx].baseDamage ? idx : bestIdx;
                }, 0);
                this.confirmAttack(cardIndex);
            }, 1500);
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
                    <div class="stat-box"><span>⚔️</span><span class="stat-value">${effStats.courage}</span></div>
                    <div class="stat-box"><span>💪</span><span class="stat-value">${effStats.power}</span></div>
                    <div class="stat-box"><span>🧠</span><span class="stat-value">${effStats.wisdom}</span></div>
                    <div class="stat-box"><span>⚡</span><span class="stat-value">${effStats.speed}</span></div>
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
            
        hand.forEach((atkCard, index) => {
            let expectedDamage = atkCard.baseDamage;
            let expectedBonusHtml = '';
            
            if (atkCard.statRequirement) {
                const statKey = atkCard.statRequirement.toLowerCase();
                const atkVal = effAtk[statKey] || 0;
                const defVal = effDef[statKey] || 0;
                
                if (atkVal > defVal) {
                    expectedDamage += atkCard.statDamage;
                    expectedBonusHtml += `<div style="font-size: 11px; color: #2ecc71; margin-top: 5px;">✅ +${atkCard.statDamage} Dano (${atkCard.statRequirement.toUpperCase()})</div>`;
                } else {
                    expectedBonusHtml += `<div style="font-size: 11px; color: #7f8c8d; margin-top: 5px; text-decoration: line-through;">❌ +${atkCard.statDamage} Dano (${atkCard.statRequirement.toUpperCase()})</div>`;
                }
            }
            
            if (atkCard.elementRequirement) {
                const hasElement = attacker.elements && attacker.elements.includes(atkCard.elementRequirement);
                if (hasElement) {
                     expectedDamage += atkCard.elementDamage;
                     expectedBonusHtml += `<div style="font-size: 11px; color: #2ecc71; margin-top: 5px;">✅ +${atkCard.elementDamage} Dano (${atkCard.elementRequirement})</div>`;
                } else {
                     expectedBonusHtml += `<div style="font-size: 11px; color: #e74c3c; margin-top: 5px;">⚠️ Elemento? (+${atkCard.elementDamage})</div>`;
                }
            }

            handHtml += `
                <div onclick="game.confirmAttack(${index})" style="background: #34495e; padding: 10px; border-radius: 5px; cursor: pointer; border: 2px solid #7f8c8d; width: 140px; text-align: center; color: white; transition: transform 0.2s;">
                    <div style="font-weight: bold; color: #f1c40f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${atkCard.name}</div>
                    <div style="font-size: 14px; font-weight: bold; margin-top: 8px; color: #e74c3c;">💥 Dano: ${expectedDamage}</div>
                    ${expectedBonusHtml}
                </div>
            `;
        });
        handHtml += `</div></div>`;

        container.innerHTML = `
            ${renderCard(attacker, effAtk, 'Atacante')}
            ${handHtml}
            ${renderCard(defender, effDef, 'Defensor')}
        `;

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

    confirmAttack(cardIndex) {
        const modal = document.getElementById("attack-modal");
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex-modal');
        }
        
        if (!this.pendingCombat) return;
        const { attacker, defender, atkR, atkC, defR, defC, attackingPlayer } = this.pendingCombat;
        const hand = attackingPlayer === 1 ? this.p1AttackHand : this.p2AttackHand;
        const atkCard = hand[cardIndex];

        // Mover a carta usada e comprar nova
        hand.splice(cardIndex, 1);
        const deck = attackingPlayer === 1 ? this.p1AttackDeck : this.p2AttackDeck;
        if (deck.length > 0) {
            hand.push(deck.shift());
        }

        // Inicializar a Pilha (Burst)
        this.burstStack = [];
        this.burstPasses = 0;
        this.burstPriority = attackingPlayer; // Atacante tem a 1ª resposta

        this.burstStack.push({
            type: 'attack',
            source: attackingPlayer === 1 ? 'Jogador 1' : 'IA (Oponente)',
            attacker, defender, atkR, atkC, defR, defC, attackingPlayer, atkCard,
            description: `Ataque Declarado: ${atkCard.name}`
        });

        this.log(`🔔 BURST ABERTO: ${attackingPlayer === 1 ? 'Jogador 1' : 'IA'} atacou com ${atkCard.name}`);
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
            html += `<div style="padding: 8px; border-bottom: 1px solid #7f8c8d; color: #ecf0f1; text-align: left;">
                <span style="color: #f1c40f;">${this.burstStack.length - i}.</span> [${item.source}] ${item.description}
            </div>`;
        });
        container.innerHTML = html;

        // Controle de Prioridade
        let promptText = `Turno de Resposta: ${this.burstPriority === 1 ? 'Jogador 1' : 'IA (Oponente)'}`;
        if (this.burstPriority === 1 && this.burstPasses === 1) {
            promptText = `A IA passou. Deseja adicionar outra mágica ou Passar para resolver?`;
        } else if (this.burstPriority === 2 && this.burstPasses === 1) {
            promptText = `Jogador 1 passou. A IA está pensando...`;
        }

        document.getElementById('burst-prompt').innerText = promptText;
        
        const passBtn = document.getElementById('btn-burst-pass');
        const playBtn = document.getElementById('btn-burst-play');
        const mugicSel = document.getElementById('burst-mugic-selection');
        mugicSel.classList.add('hidden');

        if (this.burstPriority === 1) {
            passBtn.disabled = false;
            playBtn.disabled = false;
        } else {
            passBtn.disabled = true;
            playBtn.disabled = true;
            // IA Priority
            setTimeout(() => this.aiBurstDecision(), 1500);
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex-modal');
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
            playerMugics.forEach((mg, i) => {
                handContainer.innerHTML += `
                    <div style="background: #2c3e50; border: 2px solid #8e44ad; padding: 10px; border-radius: 5px; cursor: pointer; width: 120px;" 
                         onclick="game.selectMugicToPlay(${i})"
                         title="${mg.description}">
                        <div style="font-weight: bold; color: #f1c40f; font-size: 12px; margin-bottom: 5px;">${mg.name}</div>
                        <div style="font-size: 10px; color: white;">Custo: ${mg.cost} ♪</div>
                    </div>
                `;
            });
        }
        
        mugicSel.classList.remove('hidden');
    }

    selectMugicToPlay(index) {
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
            playerMugics.splice(index, 1);
            this.burstPasses = 0;
            this.burstPriority = 1;
            this.openBurstModal();
        }
    }

    resolveMugicCaster(r, c) {
        const mg = this.playerMugics[this.pendingMugicIndex];
        const card = this.boardP1[r][c];
        
        // Verificar penalidade tribal
        let cost = mg.cost;
        if (mg.tribe !== "Generic" && mg.tribe !== card.tribe) {
            cost += 1; // Penalidade por conjurar Mugic de fora da tribo
        }
        
        if (card.mugicCounters < cost) {
            this.log(`⚠️ ${card.name} não tem contadores suficientes! Precisa de ${cost} ♪.`);
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

        // Remove da mão
        this.playerMugics.splice(this.pendingMugicIndex, 1);
        
        // Volta para o Burst
        this.gameState = 'ENGAGED_COMBAT';
        this.burstPasses = 0;
        this.burstPriority = 2; // Passa a bola pra IA
        this.renderBoard();
        this.openBurstModal();
    }

    passBurst() {
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

    closeBurstModal() {
        const modal = document.getElementById('burst-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex-modal');
        }
    }

    resolveBurst() {
        this.log(`🔔 BURST FECHADO: Resolvendo pilha em ordem reversa!`);
        
        // Loop pela pilha de trás pra frente (LIFO)
        while (this.burstStack.length > 0) {
            const item = this.burstStack.pop();
            this.log(`Executando: ${item.description}`);
            if (item.type === 'attack') {
                this.executeAttack(item);
            } else if (item.type === 'mugic') {
                this.executeMugic(item);
            }
        }

        setTimeout(() => {
            this.endCombatTurn();
        }, 1500);
    }

    aiBurstDecision() {
        if (this.p2Mugics && this.p2Mugics.length > 0 && Math.random() < 0.1) {
            this.log("IA (Oponente) usou um Mugic! (Implementação futura)");
            this.burstPasses = 0;
            this.burstPriority = 1;
            this.openBurstModal();
        } else {
            this.passBurst();
        }
    }

    executeAttack(item) {
        const { attacker, defender, atkR, atkC, defR, defC, attackingPlayer, atkCard } = item;
        
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

        let totalDamage = atkCard.baseDamage;
        if (atkCard.statRequirement) {
            const statKey = atkCard.statRequirement.toLowerCase();
            if ((effAtk[statKey] || 0) > (effDef[statKey] || 0)) {
                totalDamage += atkCard.statDamage;
            }
        }
        if (atkCard.elementRequirement && attacker.elements && attacker.elements.includes(atkCard.elementRequirement)) {
            totalDamage += atkCard.elementDamage;
        }

        defender.energy -= totalDamage;
        this.log(`💥 ${attacker.name} usou ${atkCard.name} e causou ${totalDamage} de dano a ${defender.name}!`);

        this.renderBoard();
        
        if (defender.energy <= 0) {
            this.log(`💀 ${defender.name} foi derrotado!`);
        }
    }

    executeMugic(item) {
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

        switch (mg.effectType) {
            case "heal":
                allyCard.energy += mg.effectValue;
                if (allyCard.energy > allyCard.maxEnergy) allyCard.energy = allyCard.maxEnergy;
                this.log(`💚 ${allyCard.name} curou ${mg.effectValue} de Energia! (Agora: ${allyCard.energy})`);
                break;
            case "heal_multiple":
                // Simplificação temporária: cura apenas o aliado engajado no combate
                allyCard.energy += mg.effectValue;
                if (allyCard.energy > allyCard.maxEnergy) allyCard.energy = allyCard.maxEnergy;
                this.log(`💚 ${allyCard.name} curou ${mg.effectValue} de Energia! (Agora: ${allyCard.energy})`);
                break;
            case "damage":
            case "damage_all_engaged":
                enemyCard.energy -= mg.effectValue;
                this.log(`💥 ${mg.name} causou ${mg.effectValue} de dano mágico a ${enemyCard.name}!`);
                if (enemyCard.energy <= 0) {
                    this.log(`💀 ${enemyCard.name} não resistiu ao ataque mágico!`);
                }
                break;
            case "buff_courage":
                allyCard.courage += mg.effectValue;
                this.log(`🛡️ ${allyCard.name} ganhou +${mg.effectValue} de Coragem!`);
                break;
            case "buff_power_strength":
                allyCard.power += mg.effectValue;
                this.log(`💪 ${allyCard.name} ganhou +${mg.effectValue} de Poder/Força!`);
                break;
            case "buff_wisdom":
                allyCard.wisdom += mg.effectValue;
                this.log(`🧠 ${allyCard.name} ganhou +${mg.effectValue} de Sabedoria!`);
                break;
            case "buff_speed":
                allyCard.speed += mg.effectValue;
                this.log(`⚡ ${allyCard.name} ganhou +${mg.effectValue} de Velocidade!`);
                break;
            case "recklessness":
                allyCard.power += mg.effectValue; // Dá dano
                // Efeito real de Recklessness seria reduzir vida no próprio ataque
                this.log(`🔥 ${allyCard.name} ficou Imprudente (+${mg.effectValue} Poder)!`);
                break;
            case "cancel_battlegear":
                if (enemyCard.battlegear) {
                    enemyCard.bgRevealed = false; // "Desativa"
                    this.log(`🚫 Battlegear de ${enemyCard.name} foi desativado temporariamente!`);
                }
                break;
            case "dispel_buffs":
                // Simplificado: Resetaria status
                this.log(`🌀 Buffs de ${enemyCard.name} foram dissipados!`);
                break;
            case "scramble_initiative":
                this.activeCombat.currentStriker = this.activeCombat.currentStriker === 1 ? 2 : 1;
                this.log(`🔄 Iniciativa foi invertida!`);
                break;
            default:
                this.log(`❓ Efeito ${mg.effectType} de ${mg.name} ainda não tem lógica implementada.`);
                break;
        }
        
        this.renderBoard();
    }

    endCombatTurn() {
        if (!this.activeCombat) return;
        const { p1Card, p2Card, p1R, p1C, p2R, p2C } = this.activeCombat;

        // Cleanup
        if (p1Card.energy <= 0) {
            this.boardP1[p1R][p1C] = null;
            p2Card.energy = p2Card.maxEnergy; // Reseta a vida do sobrevivente
            this.activeCombat = null;
            this.selectedAttacker = null;
            this.renderBoard();
            this.log("Fim do Combate! A carta do Jogador 1 foi destruída. A energia do Jogador 2 foi restaurada.");
            return;
        }
        if (p2Card.energy <= 0) {
            this.boardP2[p2R][p2C] = null;
            p1Card.energy = p1Card.maxEnergy; // Reseta a vida do sobrevivente
            this.activeCombat = null;
            this.selectedAttacker = null;
            this.renderBoard();
            this.log("Fim do Combate! A carta do Jogador 2 foi destruída. A energia do Jogador 1 foi restaurada.");
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
        
        if (this.activeLocation) {
            this.locationDeck.push(this.activeLocation);
            this.activeLocation = null;
            this.renderLocation();
        }

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

    resolveMove(player, fromR, fromC, toR, toC) {
        const board = player === 1 ? this.boardP1 : this.boardP2;
        const card = board[fromR][fromC];
        
        // Realiza o movimento na matriz
        board[toR][toC] = card;
        board[fromR][fromC] = null;
        
        this.log(`🚶‍♂️ ${card.name} se moveu para uma nova posição estratégica!`);
        
        if (player === 1) {
            this.selectedAttacker = null;
            this.gameState = 'IDLE';
            this.renderBoard();
            setTimeout(() => this.nextTurn(), 1000); 
        }
    }

    renderBoard() {
        // Cabeçalho adaptativo baseado no estado
        let msgEstado = this.turn === 1 ? 'Sua vez de jogar. Clique em uma carta.' : 'Aguarde o movimento do Oponente...';
        if (this.gameState === 'SELECT_TARGET') msgEstado = 'ESCOLHA O ALVO INIMIGO!';
        if (this.gameState === 'SELECT_MUGIC_CASTER') msgEstado = 'QUEM VAI PAGAR O CUSTO DA MÁGICA? CLIQUE EM UMA DE SUAS CRIATURAS.';
        
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
                            cursorStyle = (this.turn === 1 && player === 1) || (this.turn === 1 && this.gameState === 'SELECT_TARGET' && player === 2) ? 'cursor: pointer;' : '';
                        }
                    }

                    if (card) {
                        const animState = this.combatAnimationState || {};
                        const isAttackerAnim = animState.attacker && animState.attacker.player === player && animState.attacker.r === r && animState.attacker.c === c;
                        const isDefenderAnim = animState.defender && animState.defender.player === player && animState.defender.r === r && animState.defender.c === c;
                        const animClass = isDefenderAnim && animState.destroyed ? 'defeat-anim' : isAttackerAnim ? 'attack-anim' : isDefenderAnim ? 'hit-anim' : '';
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

                        html += `
                            <div class="card ${animClass}" onclick="game.handleCardClick(${player}, ${r}, ${c})" style="border: ${borderStyle}; ${shadowStyle} ${cursorStyle} ${opacityStyle} transition: all 0.2s;">
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
                                
                                ${syn ? `<div style="text-align: center; font-size: 10px; background: rgba(52, 152, 219, 0.2); color: #3498db; padding: 2px; border-bottom: 1px solid #3498db; font-weight: bold;">${syn.description}</div>` : ''}
                                <div class="card-stats">
                                    <div class="stat-box"><span>⚔️</span><span class="stat-value" style="${syn && syn.courage ? 'color:#3498db;font-weight:bold;' : ''}">${displayCourage}</span></div>
                                    <div class="stat-box"><span>💪</span><span class="stat-value" style="${syn && syn.power ? 'color:#3498db;font-weight:bold;' : ''}">${displayPower}</span></div>
                                    <div class="stat-box"><span>🧠</span><span class="stat-value" style="${syn && syn.wisdom ? 'color:#3498db;font-weight:bold;' : ''}">${displayWisdom}</span></div>
                                    <div class="stat-box"><span>⚡</span><span class="stat-value" style="${syn && syn.speed ? 'color:#3498db;font-weight:bold;' : ''}">${displaySpeed}</span></div>
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
                        if (this.gameState === 'SELECT_TARGET' && player === 1 && this.selectedAttacker) {
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
    }

    nextTurn() {
        this.selectedAttacker = null;
        this.gameState = 'IDLE';
        this.turn = this.turn === 1 ? 2 : 1;

        this.log(`---------- Turno do Jogador ${this.turn} ----------`);
        this.renderBoard();
        this.renderMugics();

        if (this.turn === 2) {
            setTimeout(() => this.aiTurn(), 1000);
        }
    }

    aiTurn() {
        // Encontra atacantes expostos e alvos vivos
        let p2Alive = [];
        for(let r=0; r < this.boardP2.length; r++) {
            for(let c=0; c < this.boardP2[r].length; c++) {
                if(this.boardP2[r][c] && this.isExposed(2, r, c)) {
                    p2Alive.push({card: this.boardP2[r][c], r, c});
                }
            }
        }
        
        let p1Alive = [];
        for(let r=0; r < this.boardP1.length; r++) {
            for(let c=0; c < this.boardP1[r].length; c++) {
                if(this.boardP1[r][c] && this.isExposed(1, r, c)) {
                    p1Alive.push({card: this.boardP1[r][c], r, c});
                }
            }
        }

        if (p2Alive.length > 0 && p1Alive.length > 0) {
            // Escolhe o atacante exposto mais forte e o alvo inimigo mais fraco
            const attacker = p2Alive.reduce((best, candidate) => {
                const score = (candidate.card.power || 0) * 2 + (candidate.card.courage || 0) * 1.5 + (candidate.card.speed || 0) + (candidate.card.energy || 0) * 0.5;
                return !best || score > best.score ? { candidate, score } : best;
            }, null).candidate;

            const defender = p1Alive.reduce((best, candidate) => {
                const rowPenalty = candidate.r * 2;
                const threat = (candidate.card.energy || 0) * 3 + (candidate.card.power || 0) * 2 + (candidate.card.courage || 0) * 1.5 + rowPenalty;
                return !best || threat < best.threat ? { candidate, threat } : best;
            }, null).candidate;

            this.selectedAttacker = { player: 2, r: attacker.r, c: attacker.c };
            this.renderBoard();

            setTimeout(() => {
                this.startCombat(attacker.card, defender.card, attacker.r, attacker.c, defender.r, defender.c, 2);
            }, 1000);
        } else {
            this.log("🏆 O Jogo acabou!");
        }
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
