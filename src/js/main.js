class GameEngine {
    constructor(cards) {
        this.cards = JSON.parse(JSON.stringify(cards)); // Cópia profunda para não alterar os dados originais
        this.turn = 1; // 1 para Jogador, 2 para Oponente
        this.boardElement = document.getElementById("board");
        this.logElement = document.getElementById("combat-log");
        this.nextTurnBtn = document.getElementById("btn-next-turn");
    }

    init() {
        this.log("Chaotic Lite Engine Iniciada!");
        if (this.cards.length === 0) {
            this.boardElement.innerHTML = "<p>Nenhuma carta encontrada. Verifique o arquivo cards.js!</p>";
            return;
        }
        
        // Configura o evento do botão de passar turno
        if (this.nextTurnBtn) {
            this.nextTurnBtn.addEventListener("click", () => this.nextTurn());
        }

        this.renderBoard();
    }

    log(message) {
        console.log(message);
        if (this.logElement) {
            this.logElement.innerHTML = `<div>> ${message}</div>` + this.logElement.innerHTML;
        }
    }

    renderBoard() {
        this.boardElement.innerHTML = `<h3>Turno Atual: Jogador ${this.turn}</h3>`;
        
        let cardsHtml = '<div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">';
        this.cards.forEach(card => {
            cardsHtml += `
                <div style="border: 2px solid #34495e; padding: 15px; border-radius: 8px; width: 150px; background-color: #ecf0f1; color: #2c3e50;">
                    <strong style="font-size: 1.2em;">${card.name}</strong>
                    <p style="font-size: 0.85em; color: #7f8c8d; margin-top: 5px;">${card.tribe}</p>
                    <hr style="margin: 10px 0;">
                    <p>❤️ Energia: ${card.energy}</p>
                    <p>⚔️ Coragem: ${card.courage}</p>
                    <p>💪 Poder: ${card.power}</p>
                </div>
            `;
        });
        cardsHtml += '</div>';
        
        this.boardElement.innerHTML += cardsHtml;
    }

    nextTurn() {
        this.turn = this.turn === 1 ? 2 : 1;
        this.renderBoard();
        this.log(`Terminou a jogada. Agora é o turno do Jogador ${this.turn}`);
        
        // Exemplo: se for turno do Jogador 2, faz um ataque automático para testes
        if (this.turn === 2 && this.cards.length >= 2) {
            setTimeout(() => this.simulateAttack(), 1000);
        }
    }

    simulateAttack() {
        const attacker = this.cards[1]; // Chaor
        const defender = this.cards[0]; // Maxxor
        
        const damage = 15;
        defender.energy -= damage;
        
        this.log(`⚔️ Oponente atacou com ${attacker.name}! Causou ${damage} de dano a ${defender.name}.`);
        this.renderBoard();
        
        if (defender.energy <= 0) {
            this.log(`💀 ${defender.name} foi derrotado! Oponente venceu.`);
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
