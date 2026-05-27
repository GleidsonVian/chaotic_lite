// Lógica principal do jogo (Sua responsabilidade principal)

document.addEventListener("DOMContentLoaded", () => {
    console.log("Chaotic Lite Iniciado!");
    
    const board = document.getElementById("board");
    const cards = window.cardsDatabase || [];

    // Exemplo de como renderizar algo na tela baseado nos dados
    if (cards.length > 0) {
        board.innerHTML = `<h3>Cartas Carregadas: ${cards.length}</h3>`;
        
        let cardsHtml = '<ul style="list-style:none; padding: 0;">';
        cards.forEach(card => {
            cardsHtml += `<li style="margin: 10px; padding: 10px; border: 1px solid #ccc;">
                            <strong>${card.name}</strong> - Energia: ${card.energy}
                          </li>`;
        });
        cardsHtml += '</ul>';
        
        board.innerHTML += cardsHtml;
    } else {
        board.innerHTML = "<p>Nenhuma carta encontrada. Verifique o arquivo cards.js!</p>";
    }
});
