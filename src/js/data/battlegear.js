// Banco de Dados de Equipamentos (Battlegear)

const battlegearDatabase = [
    {
        id: "bg1",
        name: "Vlaric Shard",
        image: "",
        description: "Equipamento sagrado. Concede +10 Sabedoria e +10 Coragem.",
        modifiers: { courage: 10, power: 0, wisdom: 10, speed: 0, energy: 0 },
        elementGranted: null
    },
    {
        id: "bg2",
        name: "Torq of Resolve",
        image: "",
        description: "Amuleto defensivo. Concede +10 Energia Máxima.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 0, energy: 10 },
        elementGranted: null
    },
    {
        id: "bg3",
        name: "Liquid Treads",
        image: "",
        description: "Botas fluídas. Concede +15 Velocidade e o Elemento Água.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 15, energy: 0 },
        elementGranted: "Water"
    },
    {
        id: "bg4",
        name: "Orb of Foreknowledge",
        image: "",
        description: "Esfera ancestral. Concede +20 Sabedoria.",
        modifiers: { courage: 0, power: 0, wisdom: 20, speed: 0, energy: 0 },
        elementGranted: null
    },
    {
        id: "bg5",
        name: "Pyroblaster",
        image: "",
        description: "Arma vulcânica. Concede +10 Poder e o Elemento Fogo.",
        modifiers: { courage: 0, power: 10, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: "Fire"
    },
    {
        id: "bg6",
        name: "Stone Mail",
        image: "",
        description: "Armadura robusta. Concede +15 Coragem e o Elemento Terra.",
        modifiers: { courage: 15, power: 0, wisdom: 0, speed: 0, energy: 0 },
        elementGranted: "Earth"
    },
    {
        id: "bg7",
        name: "Windstrider",
        image: "",
        description: "Artefato veloz. Concede +10 Velocidade e o Elemento Ar.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 10, energy: 0 },
        elementGranted: "Air"
    },
    {
        id: "bg8",
        name: "Skeletal Steed",
        image: "",
        description: "Montaria sombria. Concede +15 Poder e +15 Velocidade.",
        modifiers: { courage: 0, power: 15, wisdom: 0, speed: 15, energy: 0 },
        elementGranted: null
    }
];

window.battlegearDatabase = battlegearDatabase;
