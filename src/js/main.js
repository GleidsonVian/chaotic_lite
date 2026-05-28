class GameEngine {
    constructor(cards, mugics) {
        this.cards = JSON.parse(JSON.stringify(cards)); // Cópia profunda
        this.mugics = JSON.parse(JSON.stringify(mugics));
        this.appState = 'DRAFT'; // 'DRAFT' ou 'BATTLE'
        this.draftedCards = []; // Cartas escolhidas pelo jogador
        this.turn = 1; // 1 para Jogador, 2 para Oponente
        this.gameState = 'IDLE'; // Estados: IDLE, SELECT_TARGET, SELECT_MUGIC_TARGET
        this.selectedAttacker = null; // Guardará o monstro atacante { player, r, c }
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
        let html = '';
        
        this.cards.forEach((card, index) => {
            const isSelected = this.draftedCards.includes(card);
            const borderStyle = isSelected ? 'border: 3px solid #2ecc71; box-shadow: 0 0 15px #2ecc71; transform: scale(1.05);' : 'border: 2px solid #7f8c8d;';
            const opacityStyle = (!isSelected && this.draftedCards.length >= 6) ? 'opacity: 0.5; filter: grayscale(80%); cursor: not-allowed;' : 'cursor: pointer;';
            
            html += `
                <div class="card" onclick="game.toggleDraftCard(${index})" style="${borderStyle} ${opacityStyle} transition: all 0.2s;">
                    <div class="card-header">
                        <div class="card-name">${card.name}</div>
                        <div class="card-tribe">${card.tribe}</div>
                    </div>
                    <div class="card-image-container">
                        ${card.image ? `<img src="${card.image}" class="card-image" alt="${card.name}">` : `<div class="card-image-placeholder">Sem Imagem</div>`}
                    </div>
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
        
        const counter = document.getElementById("draft-counter");
        counter.innerText = `${this.draftedCards.length} / 6 Escolhidas`;
        
        const btnStart = document.getElementById("btn-start-battle");
        if (this.draftedCards.length === 6) {
            btnStart.style.display = 'block';
        } else {
            btnStart.style.display = 'none';
        }
    }

    toggleDraftCard(index) {
        if (this.appState !== 'DRAFT') return;
        
        const card = this.cards[index];
        const draftedIndex = this.draftedCards.indexOf(card);
        
        if (draftedIndex > -1) {
            // Remove
            this.draftedCards.splice(draftedIndex, 1);
        } else {
            // Add if less than 6
            if (this.draftedCards.length < 6) {
                this.draftedCards.push(card);
            }
        }
        this.renderDraft();
    }

    startBattle() {
        this.appState = 'BATTLE';
        document.getElementById("draft-screen").style.display = 'none';
        document.getElementById("battle-screen").style.display = 'block';
        
        // Puxar 3 Mugics aleatórios para a mão do jogador
        this.playerMugics = [];
        if (this.mugics && this.mugics.length > 0) {
            for (let i = 0; i < 3; i++) {
                const randIndex = Math.floor(Math.random() * this.mugics.length);
                this.playerMugics.push(JSON.parse(JSON.stringify(this.mugics[randIndex])));
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
                <div style="width: 100px; height: 120px; background-color: #8e44ad; color: white; border-radius: 5px; padding: 5px; text-align: center; cursor: pointer; ${borderStyle} transition: all 0.2s;" onclick="game.handleMugicClick(${index})">
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
        return cloned;
    }

    setupBoard() {
        // P1: Usa as escolhas do Draft
        let p1Deck = this.draftedCards.map(c => this.cloneCard(c));
        
        // P2: Escolhe 6 aleatórias do banco
        let p2Deck = [];
        let availableCards = [...this.cards];
        for(let i = 0; i < 6; i++) {
            const randIndex = Math.floor(Math.random() * availableCards.length);
            p2Deck.push(this.cloneCard(availableCards[randIndex]));
            // Em chaotic você pode ter repetidas, mas para ter diversidade vamos não remover,
            // ou remover para forçar diferentes. Vamos deixar repetir se for pouco card.
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
                this.resolveAttack(attacker, clickedCard, this.selectedAttacker.r, this.selectedAttacker.c, r, c, 1);
            }
        }
    }

    resolveAttack(attacker, defender, atkR, atkC, defR, defC, attackingPlayer) {
        // Encontra a melhor disciplina do atacante
        const stats = [
            { name: "Coragem", key: "courage", val: attacker.courage },
            { name: "Poder", key: "power", val: attacker.power },
            { name: "Sabedoria", key: "wisdom", val: attacker.wisdom },
            { name: "Velocidade", key: "speed", val: attacker.speed }
        ];
        
        let bestStat = stats[0];
        stats.forEach(s => {
            if (s.val > bestStat.val) bestStat = s;
        });

        const pAtk = attackingPlayer === 1 ? "Você" : "Oponente";
        this.log(`⚔️ ${pAtk} atacou usando ${bestStat.name.toUpperCase()}!`);

        // Dano Base
        let damage = 15;
        
        // Diferença de Atributo (Stat Clash)
        const defStatVal = defender[bestStat.key];
        const statDiff = bestStat.val - defStatVal;
        
        if (statDiff > 0) {
            const bonus = Math.min(20, statDiff); // Limitado a +20
            damage += bonus;
            this.log(`🔥 Choque: ${attacker.name} (${bestStat.val}) superou ${defender.name} (${defStatVal})! Bônus: +${bonus} de dano.`);
        } else if (statDiff < 0) {
             this.log(`🛡️ Choque: ${defender.name} (${defStatVal}) resistiu ao ataque. Sem bônus.`);
        }

        // Crítico pela Velocidade
        if (attacker.speed - defender.speed >= 15) {
            if (Math.random() <= 0.3) {
                damage *= 2;
                this.log(`⚡ ATAQUE CRÍTICO! A velocidade de ${attacker.name} dobrou o dano!`);
            }
        }
        
        defender.energy -= damage;
        const targetBoard = attackingPlayer === 1 ? this.boardP2 : this.boardP1;

        this.log(`💥 ${attacker.name} causou ${damage} de dano a ${defender.name}.`);
        
        if (defender.energy <= 0) {
            this.log(`💀 ${defender.name} foi destruído!`);
            targetBoard[defR][defC] = null; // Retira do tabuleiro
        }

        if (attackingPlayer === 1) {
            this.selectedAttacker = null;
            this.gameState = 'IDLE';
            this.renderBoard();
            
            // Depois de atacar, é a vez do oponente
            setTimeout(() => this.nextTurn(), 1500); 
        } else {
            this.renderBoard();
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
        
        this.boardElement.innerHTML = `<div style="width: 100%; text-align: center; margin-bottom: 10px;">
            <h3>Turno Atual: Jogador ${this.turn}</h3>
            <p style="color: ${this.gameState === 'SELECT_TARGET' ? '#e74c3c' : '#2c3e50'}; font-weight: bold;">${msgEstado}</p>
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
                        html += `
                            <div class="card" onclick="game.handleCardClick(${player}, ${r}, ${c})" style="border: ${borderStyle}; ${shadowStyle} ${cursorStyle} ${opacityStyle} transition: all 0.2s;">
                                <div class="card-header">
                                    <div class="card-name">${card.name}</div>
                                    <div class="card-tribe">${card.tribe}</div>
                                </div>
                                <div class="card-image-container">
                                    ${card.image ? `<img src="${card.image}" class="card-image" alt="${card.name}">` : `<div class="card-image-placeholder">Sem Imagem</div>`}
                                </div>
                                <div class="card-stats">
                                    <div class="stat-box"><span>⚔️</span><span class="stat-value">${card.courage}</span></div>
                                    <div class="stat-box"><span>💪</span><span class="stat-value">${card.power}</span></div>
                                    <div class="stat-box"><span>🧠</span><span class="stat-value">${card.wisdom}</span></div>
                                    <div class="stat-box"><span>⚡</span><span class="stat-value">${card.speed}</span></div>
                                </div>
                                <div class="card-energy-container" style="padding: 6px; background: #c0392b; border-top: 2px solid #7f8c8d;">
                                    <div style="background-color: #2c3e50; border-radius: 4px; overflow: hidden; width: 100%; position: relative; height: 22px; border: 1px solid #000;">
                                        <div style="width: ${Math.max(0, (card.energy / card.maxEnergy) * 100)}%; height: 100%; background-color: ${(card.energy / card.maxEnergy) > 0.5 ? '#2ecc71' : (card.energy / card.maxEnergy) > 0.2 ? '#f1c40f' : '#e74c3c'}; transition: width 0.4s ease-out, background-color 0.4s ease-out;"></div>
                                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; font-size: 0.9em; font-weight: bold; color: white; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);">
                                            ❤️ ${Math.max(0, card.energy)} / ${card.maxEnergy}
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
        
        this.log(`---------- Turno do Jogador ${this.turn} ----------`);
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
                this.resolveAttack(attacker.card, defender.card, attacker.r, attacker.c, defender.r, defender.c, 2);
                setTimeout(() => this.nextTurn(), 1500);
            }, 1000);
        } else {
             this.log("🏆 O Jogo acabou!");
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const cards = window.cardsDatabase || [];
    const mugics = window.mugicsDatabase || [];
    const game = new GameEngine(cards, mugics);
    game.init();
    window.game = game;
});
