// Estrutura de dados das cartas (Seu amigo pode expandir isso)
// Exemplo de como exportar e usar uma variável global simples

const cardsDatabase = [
    {
        id: 1,
        name: "Maxxor",
        type: "Creature",
        energy: 65,
        courage: 80,
        power: 60,
        wisdom: 45,
        speed: 55
    },
    {
        id: 2,
        name: "Chaor",
        type: "Creature",
        energy: 70,
        courage: 90,
        power: 85,
        wisdom: 30,
        speed: 40
    }
];

// Pode ser lido pelo main.js
window.cardsDatabase = cardsDatabase;
