class GameEngine {
    constructor(cards) {
        this.cards = JSON.parse(JSON.stringify(cards)); // Cópia profunda
        this.turn = 1; // 1 para Jogador, 2 para Oponente
        this.boardElement = document.getElementById("board");
        this.logElement = document.getElementById("combat-log");
        this.nextTurnBtn = document.getElementById("btn-next-turn");
        
        // Tabuleiro 6v6: 3 linhas (3, 2, e 1 espaços) por jogador
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
        if (this.cards.length < 12) {
            this.boardElement.innerHTML = "<p>Nenhuma carta ou poucas cartas. Precisa de pelo menos 12 cartas no cards.js para o 6v6!</p>";
            return;
        }
        
        // Configura o evento do botão
        if (this.nextTurnBtn) {
            this.nextTurnBtn.addEventListener("click", () => this.nextTurn());
        }

        this.setupBoard();
        this.renderBoard();
    }
    
    setupBoard() {
        // Distribui as 12 cartas no formato 6v6 (Pirâmide invertida: 3 na frente, 2 no meio, 1 atrás)
        
        // P1: Usa as 6 primeiras cartas do banco
        this.boardP1[0][0] = this.cards[0];
        this.boardP1[0][1] = this.cards[1];
        this.boardP1[0][2] = this.cards[2];
        this.boardP1[1][0] = this.cards[3];
        this.boardP1[1][1] = this.cards[4];
        this.boardP1[2][0] = this.cards[5];
        
        // P2: Usa as próximas 6 cartas do banco
        this.boardP2[0][0] = this.cards[6];
        this.boardP2[0][1] = this.cards[7];
        this.boardP2[0][2] = this.cards[8];
        this.boardP2[1][0] = this.cards[9];
        this.boardP2[1][1] = this.cards[10];
        this.boardP2[2][0] = this.cards[11];
    }

    log(message) {
        console.log(message);
        if (this.logElement) {
            this.logElement.innerHTML = `<div>> ${message}</div>` + this.logElement.innerHTML;
        }
    }

    renderBoard() {
        this.boardElement.innerHTML = `<div style="width: 100%; text-align: center; margin-bottom: 10px;"><h3>Turno Atual: Jogador ${this.turn}</h3></div>`;
        
        const renderPlayerBoard = (board, isP2) => {
            let html = `<div style="display: flex; flex-direction: column; gap: 10px; margin: 10px 0; align-items: center; width: 100%;">`;
            // Para P2, a linha de trás (2) fica em cima, a da frente (0) em baixo.
            // Para P1, a linha da frente (0) fica em cima, a de trás (2) em baixo.
            const rows = isP2 ? [2, 1, 0] : [0, 1, 2];
            
            rows.forEach(r => {
                html += `<div style="display: flex; gap: 20px; justify-content: center; width: 100%;">`;
                board[r].forEach(card => {
                    if (card) {
                        html += `
                            <div class="card">
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
                        html += `<div style="width: 120px; height: 160px; border: 2px dashed #bdc3c7; border-radius: 8px; opacity: 0.5;"></div>`;
                    }
                });
                html += `</div>`;
            });
            html += `</div>`;
            return html;
        };

        let boardsHtml = '<div style="display: flex; flex-direction: column; width: 100%; align-items: center;">';
        boardsHtml += renderPlayerBoard(this.boardP2, true);
        boardsHtml += '<div style="width: 80%; height: 4px; background-color: #bdc3c7; margin: 15px 0; border-radius: 2px;"></div>'; // Divisória do meio
        boardsHtml += renderPlayerBoard(this.boardP1, false);
        boardsHtml += '</div>';
        
        this.boardElement.innerHTML += boardsHtml;
    }

    nextTurn() {
        this.turn = this.turn === 1 ? 2 : 1;
        this.renderBoard();
        this.log(`Terminou a jogada. Agora é o turno do Jogador ${this.turn}`);
        
        if (this.turn === 2) {
            setTimeout(() => this.simulateAttack(), 1000);
        }
    }

    simulateAttack() {
        // Exemplo: P2 ataca P1 (Usando posições do tabuleiro)
        const attacker = this.boardP2[0][0]; // Takinom
        const defender = this.boardP1[0][0]; // Maxxor
        
        if (attacker && defender) {
            const damage = 15;
            defender.energy -= damage;
            
            this.log(`⚔️ Oponente atacou com ${attacker.name}! Causou ${damage} de dano a ${defender.name}.`);
            
            if (defender.energy <= 0) {
                this.log(`💀 ${defender.name} foi derrotado!`);
                this.boardP1[0][0] = null; // Remove a carta do tabuleiro
            }
            this.renderBoard();
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const cards = window.cardsDatabase || [];
    const game = new GameEngine(cards);
    game.init();

    // Expõe o jogo globalmente para testes no console
    window.game = game;
});
