// Banco de Dados de Equipamentos — Dawn of Perim (29 cartas)
//
// Campos:
//   modifiers          : bônus estáticos de stats enquanto equipado e revelado
//   elementGranted     : elemento adicionado à criatura ao revelar
//   passivesGranted    : passivas adicionadas à criatura ao revelar  [{id, ...params}]
//   faceUp             : começa revelado desde o início da batalha
//   sacrificeEffect    : efeito ao sacrificar o battlegear { type, ... }
//   combatStartEffect  : efeito ao iniciar combate { type, ... }
//   conditionalModifier: bônus de stat condicional { condition, stat, value }

const battlegearDatabase = [
    {
        id: "bg1",
        name: "Aqua Shield",
        image: "src/assets/battlegears/bg1.jpg",
        rarity: "Super Rare",
        description: "Criatura equipada tem +5 Energia. Sacrifique: Cura 15 de dano a uma criatura alvo.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 5 },
        elementGranted: null,
        sacrificeEffect: { type: "heal_target", value: 15 }
    },
    {
        id: "bg2",
        name: "Cyclance",
        image: "src/assets/battlegears/bg2.jpg",
        rarity: "Rare",
        description: "Sacrifique: Criatura equipada ganha Ar até o fim do combate.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null,
        sacrificeEffect: { type: "grant_element", element: "Air" }
    },
    {
        id: "bg3",
        name: "Diamond of Vlaric",
        image: "src/assets/battlegears/bg3.jpg",
        rarity: "Rare",
        description: "Sacrifique: Criatura equipada ganha Terra até o fim do combate.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null,
        sacrificeEffect: { type: "grant_element", element: "Earth" }
    },
    {
        id: "bg4",
        name: "Dragon Pulse",
        image: "src/assets/battlegears/bg4.jpg",
        rarity: "Common",
        description: "Criatura equipada tem +25 Coragem.",
        modifiers: { courage: 25, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null
    },
    {
        id: "bg5",
        name: "Elixir of Tenacity",
        image: "src/assets/battlegears/bg5.jpg",
        rarity: "Common",
        description: "Criatura equipada tem +10 Coragem e +10 Velocidade. Se tiver 50+ Poder, +10 Energia.",
        modifiers: { courage: 10, power: 0, wisdom: 0, speed: 10, energy: 0 },
        elementGranted: null,
        conditionalModifier: { condition: "power_gte_50", stat: "energy", value: 10 }
    },
    {
        id: "bg6",
        name: "Flux Bauble",
        image: "src/assets/battlegears/bg6.jpg",
        rarity: "Rare",
        description: "Ao iniciar combate: veja as 2 cartas do topo do seu Deck de Locais.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null,
        combatStartEffect: { type: "peek_location_deck", count: 2 }
    },
    {
        id: "bg7",
        name: "Gauntlets of Might",
        image: "src/assets/battlegears/bg7.jpg",
        rarity: "Common",
        description: "Criatura equipada tem +25 Poder.",
        modifiers: { courage: 0, power: 25, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null
    },
    {
        id: "bg8",
        name: "Liquilizer",
        image: "src/assets/battlegears/bg8.jpg",
        rarity: "Rare",
        description: "Sacrifique: Criatura equipada ganha Água até o fim do combate.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null,
        sacrificeEffect: { type: "grant_element", element: "Water" }
    },
    {
        id: "bg9",
        name: "Mipedian Cactus",
        image: "src/assets/battlegears/bg9.jpg",
        rarity: "Super Rare",
        description: "Criatura equipada tem +15 Sabedoria. Se for Mipedian, pode mover-se para qualquer espaço como se fosse adjacente.",
        modifiers: { courage: 0, power: 0, wisdom: 15, speed: 0, energy: 0 },
        elementGranted: null
    },
    {
        id: "bg10",
        name: "Mowercycle",
        image: "src/assets/battlegears/bg10.jpg",
        rarity: "Common",
        description: "Criatura equipada tem +25 Velocidade.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 25, energy: 0 },
        elementGranted: null
    },
    {
        id: "bg11",
        name: "Mugician's Lyre",
        image: "src/assets/battlegears/bg11.jpg",
        rarity: "Common",
        description: "Sacrifique: Adicione 1 Mugic Counter à criatura equipada.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null,
        sacrificeEffect: { type: "add_mugic_counter", value: 1 }
    },
    {
        id: "bg12",
        name: "Nexus Fuse",
        image: "src/assets/battlegears/bg12.jpg",
        rarity: "Super Rare",
        description: "Criatura equipada tem +5 Energia. Sacrifique: Causa 15 de dano a uma criatura alvo.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 5 },
        elementGranted: null,
        sacrificeEffect: { type: "damage_target", value: 15 }
    },
    {
        id: "bg13",
        name: "Orb of Foresight",
        image: "src/assets/battlegears/bg13.jpg",
        rarity: "Rare",
        description: "Ao iniciar combate: veja as 3 cartas do topo do seu Deck de Ataques.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null,
        combatStartEffect: { type: "peek_attack_deck", count: 3 }
    },
    {
        id: "bg14",
        name: "Phobia Mask",
        image: "src/assets/battlegears/bg14.jpg",
        rarity: "Uncommon",
        description: "Criatura equipada ganha Intimidate: Courage 10 e Intimidate: Power 10.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null,
        passivesGranted: [
            { id: "intimidate", stat: "courage", value: 10 },
            { id: "intimidate", stat: "power",   value: 10 }
        ]
    },
    {
        id: "bg15",
        name: "Prism of Vacuity",
        image: "src/assets/battlegears/bg15.jpg",
        rarity: "Uncommon",
        description: "Criatura equipada tem +5 Energia. Sacrifique: Criatura alvo perde 20 Poder.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 5 },
        elementGranted: null,
        sacrificeEffect: { type: "drain_stat", stat: "power", value: 20 }
    },
    {
        id: "bg16",
        name: "Pyroblaster",
        image: "src/assets/battlegears/bg16.jpg",
        rarity: "Rare",
        description: "Sacrifique: Criatura equipada ganha Fogo até o fim do combate.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null,
        sacrificeEffect: { type: "grant_element", element: "Fire" }
    },
    {
        id: "bg17",
        name: "Ring of Na'arin",
        image: "src/assets/battlegears/bg17.jpg",
        rarity: "Common",
        description: "Criatura equipada tem +10 Poder e +10 Sabedoria. Se tiver 50+ Coragem, +10 Energia.",
        modifiers: { courage: 0, power: 10, wisdom: 10, speed: 0, energy: 0 },
        elementGranted: null,
        conditionalModifier: { condition: "courage_gte_50", stat: "energy", value: 10 }
    },
    {
        id: "bg18",
        name: "Riverland Star",
        image: "src/assets/battlegears/bg18.jpg",
        rarity: "Super Rare",
        description: "Criatura equipada tem +15 Coragem. Se for OverWorld, cura 5 ao causar dano de Água.",
        modifiers: { courage: 15, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null
    },
    {
        id: "bg19",
        name: "Skeletal Steed",
        image: "src/assets/battlegears/bg19.jpg",
        rarity: "Uncommon",
        description: "Criatura equipada ganha Range e Swift 1. Começa revelado.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null,
        faceUp: true,
        passivesGranted: [
            { id: "swift", value: 10 },
            { id: "_range" }
        ]
    },
    {
        id: "bg20",
        name: "Spectral Viewer",
        image: "src/assets/battlegears/bg20.jpg",
        rarity: "Rare",
        description: "Ao engajar em combate: Criatura inimiga perde e não pode ganhar Invisibilidade.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null,
        combatStartEffect: { type: "remove_opponent_invisibility" }
    },
    {
        id: "bg21",
        name: "Staff of Wisdom",
        image: "src/assets/battlegears/bg21.jpg",
        rarity: "Common",
        description: "Criatura equipada tem +25 Sabedoria.",
        modifiers: { courage: 0, power: 0, wisdom: 25, speed: 0, energy: 0 },
        elementGranted: null
    },
    {
        id: "bg22",
        name: "Stone Mail",
        image: "src/assets/battlegears/bg22.jpg",
        rarity: "Ultra Rare",
        description: "Criatura equipada não pode se mover. +50 Energia. Todo dano recebido é aumentado em 5. Sem habilidades.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 50 },
        elementGranted: null,
        faceUp: false,
        specialFlags: { cannotMove: true, noAbilities: true, damagePenalty: 5 }
    },
    {
        id: "bg23",
        name: "Talisman of the Mandiblor",
        image: "src/assets/battlegears/bg23.jpg",
        rarity: "Super Rare",
        description: "Criatura equipada tem +15 Velocidade. Se for Danian, sacrifique-a para retornar um Mandiblor do descarte.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 15, energy: 0 },
        elementGranted: null
    },
    {
        id: "bg24",
        name: "Torrent Krinth",
        image: "src/assets/battlegears/bg24.jpg",
        rarity: "Uncommon",
        description: "Criatura equipada tem Water 5.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: "Water",
        elementBonus: 5
    },
    {
        id: "bg25",
        name: "Torwegg",
        image: "src/assets/battlegears/bg25.jpg",
        rarity: "Uncommon",
        description: "Criatura equipada tem Air 5.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: "Air",
        elementBonus: 5
    },
    {
        id: "bg26",
        name: "Viledriver",
        image: "src/assets/battlegears/bg26.jpg",
        rarity: "Uncommon",
        description: "Criatura equipada tem Fire 5.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: "Fire",
        elementBonus: 5
    },
    {
        id: "bg27",
        name: "Vlaric Shard",
        image: "src/assets/battlegears/bg27.jpg",
        rarity: "Uncommon",
        description: "Criatura equipada tem Earth 5.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: "Earth",
        elementBonus: 5
    },
    {
        id: "bg28",
        name: "Whepcrack",
        image: "src/assets/battlegears/bg28.jpg",
        rarity: "Super Rare",
        description: "Criatura equipada tem +15 Poder. Se for UnderWorld, ganha Fire 5.",
        modifiers: { courage: 0, power: 15, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null,
        tribalElement: { tribe: "UnderWorld", element: "Fire" }
    },
    {
        id: "bg29",
        name: "Windstrider",
        image: "src/assets/battlegears/bg29.jpg",
        rarity: "Super Rare",
        description: "Criatura equipada ganha Swift 2. Começa revelado.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: null,
        faceUp: true,
        passivesGranted: [
            { id: "swift", value: 20 }
        ]
    }
];

window.battlegearDatabase = battlegearDatabase;
