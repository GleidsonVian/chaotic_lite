class GameEngine {
    constructor(cards) {
        this.cards = JSON.parse(JSON.stringify(cards)); // Cópia profunda
        this.turn = 1; // 1 para Jogador, 2 para Oponente
        this.gameState = 'IDLE'; // Estados: IDLE, SELECT_ATTACKER, SELECT_TARGET
        this.selectedAttacker = null; // Guardará o monstro atacante { player, r, c }
        
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
        this.log("Chaotic Lite Engine 6v6 Iniciada!");
        if (this.cards.length < 12) {
            this.boardElement.innerHTML = "<p>Nenhuma carta ou poucas cartas. Precisa de pelo menos 12 cartas no cards.js para o 6v6!</p>";
            return;
        }
        
        if (this.nextTurnBtn) {
            this.nextTurnBtn.addEventListener("click", () => this.nextTurn());
        }

        this.setupBoard();
        this.renderBoard();
    }
    
    cloneCard(baseCard) {
        return JSON.parse(JSON.stringify(baseCard));
    }

    setupBoard() {
        // P1: Usa as 6 primeiras cartas do banco clonadas
        let p1Deck = this.cards.slice(0, 6).map(c => this.cloneCard(c));
        // P2: Usa as próximas 6 cartas do banco clonadas
        let p2Deck = this.cards.slice(6, 12).map(c => this.cloneCard(c));
        
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
        }
    }

    handleCardClick(player, r, c) {
        // Interações só são aceitas no Turno do Jogador 1
        if (this.turn !== 1) return; 
        
        const clickedBoard = player === 1 ? this.boardP1 : this.boardP2;
        const clickedCard = clickedBoard[r][c];
        
        if (!clickedCard) return; // Slot vazio ignorado

        if (this.gameState === 'IDLE' && player === 1) {
            // Selecionar criatura atacante
            this.selectedAttacker = { player, r, c };
            this.gameState = 'SELECT_TARGET';
            this.log(`🎯 Você escolheu atacar com ${clickedCard.name}. Selecione o alvo!`);
            this.renderBoard();
        } 
        else if (this.gameState === 'SELECT_TARGET') {
            if (player === 1) {
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
                // Selecionou um inimigo! Inicia o combate
                const attacker = this.boardP1[this.selectedAttacker.r][this.selectedAttacker.c];
                this.resolveAttack(attacker, clickedCard, this.selectedAttacker.r, this.selectedAttacker.c, r, c, 1);
            }
        }
    }

    resolveAttack(attacker, defender, atkR, atkC, defR, defC, attackingPlayer) {
        // Cálculo super simplificado: Dano igual à metade do Poder + random extra
        const damage = Math.floor(attacker.power * 0.4) + Math.floor(Math.random() * 10);
        defender.energy -= damage;
        
        const pAtk = attackingPlayer === 1 ? "Jogador 1" : "Oponente";
        const targetBoard = attackingPlayer === 1 ? this.boardP2 : this.boardP1;

        this.log(`⚔️ ${pAtk} atacou com ${attacker.name}! Causou ${damage} de dano a ${defender.name}.`);
        
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

    renderBoard() {
        // Cabeçalho adaptativo baseado no estado
        let msgEstado = this.turn === 1 ? 'Sua vez de jogar. Clique em uma carta.' : 'Aguarde o movimento do Oponente...';
        if (this.gameState === 'SELECT_TARGET') msgEstado = 'ESCOLHA O ALVO INIMIGO!';
        
        this.boardElement.innerHTML = `<div style="width: 100%; text-align: center; margin-bottom: 10px;">
            <h3>Turno Atual: Jogador ${this.turn}</h3>
            <p style="color: ${this.gameState === 'SELECT_TARGET' ? '#e74c3c' : '#2c3e50'}; font-weight: bold;">${msgEstado}</p>
        </div>`;
        
        const renderPlayerBoard = (board, player) => {
            let html = `<div style="display: flex; flex-direction: column; gap: 10px; margin: 10px 0; align-items: center; width: 100%;">`;
            // Para manter a pirâmide se enfrentando, Inimigo a linha de trás(2) em cima.
            // Para o Jogador, a linha de frente(0) fica em cima.
            const rows = player === 2 ? [2, 1, 0] : [0, 1, 2];
            
            rows.forEach(r => {
                html += `<div style="display: flex; gap: 20px; justify-content: center; width: 100%;">`;
                for(let c = 0; c < board[r].length; c++) {
                    const card = board[r][c];
                    const isSelected = this.selectedAttacker && this.selectedAttacker.player === player && this.selectedAttacker.r === r && this.selectedAttacker.c === c;
                    
                    const borderStyle = isSelected ? '3px solid #f1c40f' : `2px solid ${player === 2 ? '#c0392b' : '#2980b9'}`;
                    const shadowStyle = isSelected ? 'box-shadow: 0 0 15px #f1c40f; transform: scale(1.05);' : '';
                    
                    // Mostra cursor pointer se pode clicar
                    const cursorStyle = (this.turn === 1 && player === 1 && card) || (this.turn === 1 && this.gameState === 'SELECT_TARGET' && player === 2 && card) ? 'cursor: pointer;' : '';

                    if (card) {
                        html += `
                            <div class="card" onclick="game.handleCardClick(${player}, ${r}, ${c})" style="border: ${borderStyle}; ${shadowStyle} ${cursorStyle} transition: all 0.2s;">
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
                                <div class="card-energy">
                                    ❤️ ${card.energy}
                                </div>
                            </div>
                        `;
                    } else {
                        html += `<div style="width: 110px; height: 150px; border: 2px dashed #bdc3c7; border-radius: 8px; opacity: 0.4;"></div>`;
                    }
                }
                html += `</div>`;
            });
            html += `</div>`;
            return html;
        };

        let boardsHtml = '<div style="display: flex; flex-direction: column; width: 100%; align-items: center;">';
        boardsHtml += renderPlayerBoard(this.boardP2, 2);
        boardsHtml += '<div style="width: 80%; height: 4px; background-color: #bdc3c7; margin: 15px 0; border-radius: 2px;"></div>';
        boardsHtml += renderPlayerBoard(this.boardP1, 1);
        boardsHtml += '</div>';
        
        this.boardElement.innerHTML += boardsHtml;
    }

    nextTurn() {
        this.selectedAttacker = null;
        this.gameState = 'IDLE';
        this.turn = this.turn === 1 ? 2 : 1;
        
        this.log(`---------- Turno do Jogador ${this.turn} ----------`);
        this.renderBoard();
        
        if (this.turn === 2) {
            setTimeout(() => this.aiTurn(), 1000);
        }
    }

    aiTurn() {
        // Encontra alvos vivos
        let p2Alive = [];
        for(let r=0; r < this.boardP2.length; r++) {
            for(let c=0; c < this.boardP2[r].length; c++) {
                if(this.boardP2[r][c]) p2Alive.push({card: this.boardP2[r][c], r, c});
            }
        }
        
        let p1Alive = [];
        for(let r=0; r < this.boardP1.length; r++) {
            for(let c=0; c < this.boardP1[r].length; c++) {
                if(this.boardP1[r][c]) p1Alive.push({card: this.boardP1[r][c], r, c});
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
    const game = new GameEngine(cards);
    game.init();
    window.game = game;
});
