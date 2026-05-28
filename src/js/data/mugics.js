const mugicsDatabase = [
    {
        id: "m1",
        name: "Canon of Casualty",
        type: "UnderWorld Mugic",
        cost: 1,
        effectType: "damage",
        effectValue: 20,
        description: "Dispara uma coluna de chamas. Causa 20 de dano à criatura alvo."
    },
    {
        id: "m2",
        name: "Ember Flourish",
        type: "Generic Mugic",
        cost: 1,
        effectType: "heal",
        effectValue: 15,
        description: "Uma aura de prata e vermelho que cura 15 pontos de vida da criatura alvo."
    },
    {
        id: "m3",
        name: "Fortissimo",
        type: "Generic Mugic",
        cost: 1,
        effectType: "buff",
        effectValue: 10,
        description: "Alvo ganha +10 em Coragem, Poder, Sabedoria, Velocidade e Vida Máxima!"
    }
];

window.mugicsDatabase = mugicsDatabase;
