class GameEngine {
    constructor(cards) {
        this.cards = JSON.parse(JSON.stringify(cards)); // Cópia profunda
        this.turn = 1; // 1 para Jogador, 2 para Oponente
        this.boardElement = document.getElementById("board");
        this.logElement = document.getElementById("combat-log");
        this.nextTurnBtn = document.getElementById("btn-next-turn");
        
        // Tabuleiro 3v3: 2 linhas, 3 colunas por jogador
        this.boardP1 = [
            [null, null, null], // Linha 0 (Frente)
            [null, null, null]  // Linha 1 (Trás)
        ];
        this.boardP2 = [
            [null, null, null], // Linha 0 (Frente)
            [null, null, null]  // Linha 1 (Trás)
        ];
    }

    init() {
        this.log("Chaotic Lite Engine Iniciada!");
        if (this.cards.length < 6) {
            this.boardElement.innerHTML = "<p>Nenhuma carta ou poucas cartas. Precisa de pelo menos 6 cartas no cards.js para o 3v3!</p>";
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
        // Distribui as 6 cartas no formato 3v3 (Pirâmide invertida: 2 na frente, 1 atrás)
        
        // P1: Usa as 3 primeiras cartas do banco
        this.boardP1[0][0] = this.cards[0]; // Frente Esquerda
        this.boardP1[0][2] = this.cards[1]; // Frente Direita
        this.boardP1[1][1] = this.cards[2]; // Trás Centro
        
        // P2: Usa as próximas 3 cartas do banco
        this.boardP2[0][0] = this.cards[3]; // Frente Esquerda
        this.boardP2[0][2] = this.cards[4]; // Frente Direita
        this.boardP2[1][1] = this.cards[5]; // Trás Centro
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
            // Para P2, a linha de trás (1) fica em cima, a da frente (0) em baixo.
            // Para P1, a linha da frente (0) fica em cima, a de trás (1) em baixo.
            const rows = isP2 ? [1, 0] : [0, 1];
            
            rows.forEach(r => {
                html += `<div style="display: flex; gap: 20px; justify-content: center; width: 100%;">`;
                board[r].forEach(card => {
                    if (card) {
                        html += `
                            <div class="card ${isP2 ? 'enemy' : 'player'}" style="border: 2px solid ${isP2 ? '#c0392b' : '#2980b9'}; padding: 10px; border-radius: 8px; width: 120px; height: 160px; background-color: ${isP2 ? '#f9ebea' : '#ebf5fb'}; color: #2c3e50; text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    <strong style="font-size: 1.1em;">${card.name}</strong>
                                    <p style="font-size: 0.75em; color: #7f8c8d; margin-top: 5px;">${card.tribe}</p>
                                </div>
                                <div style="font-size: 0.9em; background: #fff; border-radius: 4px; padding: 5px;">
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
