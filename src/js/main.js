class GameEngine {
    constructor(cards, mugics, attacks, locations) {
        this.cards = JSON.parse(JSON.stringify(cards)); // Cópia profunda
        this.mugics = JSON.parse(JSON.stringify(mugics));
        this.attacksData = attacks ? JSON.parse(JSON.stringify(attacks)) : [];
        this.locationsData = locations ? JSON.parse(JSON.stringify(locations)) : [];
        
        this.p1AttackDeck = [];
        this.p2AttackDeck = [];
        this.p1AttackHand = [];
        this.p2AttackHand = [];
        this.locationDeck = [];
        this.activeLocation = null;
        
        this.appState = 'DRAFT'; // 'DRAFT' ou 'BATTLE'
        this.draftedCards = []; // Cartas escolhidas pelo jogador
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

        const btnStart = document.getElementById("btn-start-battle");
        if (btnStart) {
            btnStart.addEventListener("click", () => this.startBattle());
        }

        this.renderDraft();
    }
    
    renderDraft() {
        const container = document.getElementById("draft-cards-container");
        const draftedContainer = document.getElementById("drafted-deck");
        let html = '';
        
        this.cards.forEach((card, index) => {
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
                        <div class="card-name">${card.name} ${count > 0 ? `(x${count})` : ''}</div>
                        <div class="card-tribe">${card.tribe}</div>
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
            btnStart.classList.remove('hidden');
        } else {
            btnStart.classList.add('hidden');
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

    startBattle() {
        this.appState = 'BATTLE';
        document.getElementById("draft-screen").classList.add('hidden');
        document.getElementById("battle-screen").classList.remove('hidden');
        
        // Puxar 3 Mugics aleatórios para a mão do jogador
        this.playerMugics = [];
        if (this.mugics && this.mugics.length > 0) {
            for (let i = 0; i < 3; i++) {
                const randIndex = Math.floor(Math.random() * this.mugics.length);
                this.playerMugics.push(JSON.parse(JSON.stringify(this.mugics[randIndex])));
            }
        }
        
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
        
        this.setupBoard();
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

    setupBoard() {
        // P1: Usa as escolhas do Draft
        let p1Deck = this.draftedCards.map(c => this.cloneCard(c));
        
        // P2: Escolhe 6 únicas do banco (sem repetição)
        let p2Deck = [];
        let availableCards = [...this.cards];
        for(let i = 0; i < 6; i++) {
            if (availableCards.length === 0) break;
            const randIndex = Math.floor(Math.random() * availableCards.length);
            p2Deck.push(this.cloneCard(availableCards[randIndex]));
            availableCards.splice(randIndex, 1); // Remove para evitar duplicata
        }
        
        const fillBoard = (board, deck) => {
            let cardIndex = 0;
            for(let r = 0; r < board.length; r++) {
                for(let c = 0; c < board[r].length; c++) {
                    board[r][c] = deck[cardIndex++];
                }
            }
        };

        fillBoard(this.boardP1, p1Deck);
        fillBoard(this.boardP2, p2Deck);
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
            currentStriker: firstStriker
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
                this.resolveAttack(p2Card, p1Card, p2R, p2C, p1R, p1C, 2);
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
                <div class="card-name" style="font-size: 1.2em;">${card.name}</div>
                <div class="card-image-container" style="margin: 10px auto;">
                    ${card.image ? `<img src="${card.image}" style="width: 100%; height: 100%; object-fit: cover;" alt="${card.name}">` : `<div class="card-image-placeholder">Sem Imagem</div>`}
                </div>
                ${elementsHtml}
                <div class="card-stats" style="grid-template-columns: 1fr 1fr;">
                    <div class="stat-box"><span>⚔️</span><span class="stat-value">${effStats.courage}</span></div>
                    <div class="stat-box"><span>💪</span><span class="stat-value">${effStats.power}</span></div>
                    <div class="stat-box"><span>🧠</span><span class="stat-value">${effStats.wisdom}</span></div>
                    <div class="stat-box"><span>⚡</span><span class="stat-value">${effStats.speed}</span></div>
                </div>
                <div style="color: #bdc3c7; font-size: 12px; margin-top: 5px;">❤️ ${card.energy} / ${card.maxEnergy}</div>
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
        this.resolveAttack(attacker, defender, atkR, atkC, defR, defC, attackingPlayer, cardIndex);
    }

    cancelAttackModal() {
        const modal = document.getElementById("attack-modal");
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex-modal');
        }
        this.selectedAttacker = null;
        this.gameState = 'IDLE';
        this.renderBoard();
        this.log("Ataque cancelado.");
    }

    resolveAttack(attacker, defender, atkR, atkC, defR, defC, attackingPlayer, attackCardIndex) {
        const atkSyn = this.getSynergyBonus(attackingPlayer, atkR, atkC);
        const defSyn = this.getSynergyBonus(attackingPlayer === 1 ? 2 : 1, defR, defC);
        const locMod = this.activeLocation && this.activeLocation.modifiers ? this.activeLocation.modifiers : { courage: 0, power: 0, wisdom: 0, speed: 0 };

        const effAtk = {
            courage: attacker.courage + (atkSyn ? atkSyn.courage : 0) + (locMod.courage || 0),
            power: attacker.power + (atkSyn ? atkSyn.power : 0) + (locMod.power || 0),
            wisdom: attacker.wisdom + (atkSyn ? atkSyn.wisdom : 0) + (locMod.wisdom || 0),
            speed: attacker.speed + (atkSyn ? atkSyn.speed : 0) + (locMod.speed || 0)
        };
        const effDef = {
            courage: defender.courage + (defSyn ? defSyn.courage : 0) + (locMod.courage || 0),
            power: defender.power + (defSyn ? defSyn.power : 0) + (locMod.power || 0),
            wisdom: defender.wisdom + (defSyn ? defSyn.wisdom : 0) + (locMod.wisdom || 0),
            speed: defender.speed + (defSyn ? defSyn.speed : 0) + (locMod.speed || 0)
        };

        const atkHand = attackingPlayer === 1 ? this.p1AttackHand : this.p2AttackHand;
        const atkDeck = attackingPlayer === 1 ? this.p1AttackDeck : this.p2AttackDeck;
        
        let attackCard = null;
        if (atkHand.length > 0 && attackCardIndex !== undefined) {
            attackCard = atkHand[attackCardIndex];
            atkHand.splice(attackCardIndex, 1);
            if (atkDeck.length > 0) atkHand.push(atkDeck.pop());
        } else if (atkHand.length > 0) {
            // IA attack
            const aiIdx = Math.floor(Math.random() * atkHand.length);
            attackCard = atkHand[aiIdx];
            atkHand.splice(aiIdx, 1);
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

        this.log(`💥 ${attacker.name} causou ${damage} de dano a ${defender.name}. Vida restante: ${Math.max(0, defender.energy)}`);
        
        if (defender.energy <= 0) {
            this.log(`💀 ${defender.name} foi destruído! O combate terminou.`);
            targetBoard[defR][defC] = null; // Retira do tabuleiro
            
            // Fim do combate
            this.activeCombat = null;
            this.pendingCombat = null;
            this.selectedAttacker = null;
            this.gameState = 'IDLE';
            
            this.renderBoard();
            
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
        
        this.boardElement.innerHTML = `<div style="width: 100%; text-align: center; margin-bottom: 20px;">
            <h3 style="color: var(--accent); margin-bottom: 5px;">Turno Atual: Jogador ${this.turn}</h3>
            <p style="color: ${this.gameState === 'SELECT_TARGET' ? 'var(--danger)' : 'var(--text-muted)'}; font-weight: bold; font-size: 1.1em;">${msgEstado}</p>
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

                        html += `
                            <div class="card" onclick="game.handleCardClick(${player}, ${r}, ${c})" style="border: ${borderStyle}; ${shadowStyle} ${cursorStyle} ${opacityStyle} transition: all 0.2s;">
                                <div class="card-header">
                                    <div class="card-name">${card.name}</div>
                                    <div class="card-tribe">${card.tribe}</div>
                                </div>
                                <div class="card-image-container">
                                    ${card.image ? `<img src="${card.image}" class="card-image" alt="${card.name}">` : `<div class="card-image-placeholder">Sem Imagem</div>`}
                                </div>
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

        const restoreBoard = (board) => {
            for(let r=0; r<board.length; r++) {
                for(let c=0; c<board[r].length; c++) {
                    const card = board[r][c];
                    if (card) {
                        card.energy = card.maxEnergy; // restaura energia no fim do turno
                        if (card.baseCourage) card.courage = card.baseCourage;
                        if (card.basePower) card.power = card.basePower;
                        if (card.baseWisdom) card.wisdom = card.baseWisdom;
                        if (card.baseSpeed) card.speed = card.baseSpeed;
                    }
                }
            }
        };
        restoreBoard(this.boardP1);
        restoreBoard(this.boardP2);
        
        this.log(`---------- Turno do Jogador ${this.turn} ----------`);
        this.log("Vida e Status das criaturas foram restaurados.");
        
        this.renderBoard();
        this.renderMugics();
        
        if (this.turn === 2) {
            setTimeout(() => this.aiTurn(), 1000);
        }
    }

    aiTurn() {
        // Encontra alvos vivos e expostos
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
            // Seleciona atacante e defensor aleatórios
            const attacker = p2Alive[Math.floor(Math.random() * p2Alive.length)];
            const defender = p1Alive[Math.floor(Math.random() * p1Alive.length)];
            
            // Finge seleção na UI para feedback visual
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
    const game = new GameEngine(cards, mugics, attacks, locations);
    game.init();
    window.game = game;
});
