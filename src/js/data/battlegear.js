// Estrutura de dados das cartas de Equipamento de Batalha (Battlegear)

const battlegearDatabase = [
    {
        id: "bg1",
        name: "Sword of Khy'at",
        bonusCourage: 15,
        bonusPower: 20,
        bonusWisdom: 0,
        bonusSpeed: 0,
        bonusEnergy: 0,
        bonusElements: [],
        description: "Garante +20 de Poder e +15 de Coragem ao revelar."
    },
    {
        id: "bg2",
        name: "Aqua Shield",
        bonusCourage: 0,
        bonusPower: 0,
        bonusWisdom: 10,
        bonusSpeed: 0,
        bonusEnergy: 20,
        bonusElements: ["Water"],
        sacrificeEffect: { type: "heal", value: 15 },
        description: "Garante +20 Vida, +10 Sab, Elemento Água. [Sacrifício: Cura 15 Vida]"
    },
    {
        id: "bg3",
        name: "Windstrider Boots",
        bonusCourage: 0,
        bonusPower: 0,
        bonusWisdom: 0,
        bonusSpeed: 25,
        bonusEnergy: 0,
        bonusElements: ["Air"],
        description: "Garante +25 Velocidade e Elemento Ar."
    },
    {
        id: "bg4",
        name: "Vlaric Shard",
        bonusCourage: 0,
        bonusPower: 0,
        bonusWisdom: 25,
        bonusSpeed: 0,
        bonusEnergy: 10,
        bonusElements: ["Earth"],
        description: "Garante +25 de Sabedoria, +10 Vida e Elemento Terra."
    },
    {
        id: "bg5",
        name: "Pyroblaster",
        bonusCourage: 10,
        bonusPower: 15,
        bonusWisdom: 0,
        bonusSpeed: 0,
        bonusEnergy: 0,
        bonusElements: ["Fire"],
        sacrificeEffect: { type: "damage", value: 15 },
        description: "Garante +15 Poder, Elemento Fogo. [Sacrifício: Causa 15 de dano ao inimigo atual]"
    },
    {
        id: "bg6",
        name: "Elixir of Tenacity",
        bonusCourage: 5,
        bonusPower: 5,
        bonusWisdom: 5,
        bonusSpeed: 5,
        bonusEnergy: 25,
        bonusElements: [],
        sacrificeEffect: { type: "buff", value: 10 },
        description: "Garante +25 Vida, +5 geral. [Sacrifício: +10 permanente em disciplinas]"
    },
    {
        id: "bg7",
        name: "Mugician's Lyre",
        bonusCourage: 0,
        bonusPower: 0,
        bonusWisdom: 15,
        bonusSpeed: 0,
        bonusEnergy: 5,
        bonusElements: [],
        bonusMugicCounters: 1,
        description: "Garante +1 Mugic Counter e +15 de Sabedoria."
    }
];

if (typeof window !== 'undefined') {
    window.battlegearDatabase = battlegearDatabase;
}
