// Banco de Dados de Cartas de Localização

const locationsDatabase = [
    {
        id: 1,
        name: "Kiru City",
        image: "",
        initiative: "courage",
        description: "A capital do OverWorld. Iniciativa por Coragem.",
        modifiers: { courage: 10, power: 0, wisdom: 0, speed: 0 } // Bônus para quem batalhar aqui
    },
    {
        id: 2,
        name: "Lava Pond",
        image: "",
        initiative: "power",
        description: "Poço de magma do UnderWorld. Iniciativa por Poder.",
        modifiers: { courage: 0, power: 15, wisdom: 0, speed: 0 }
    },
    {
        id: 3,
        name: "Glacier Plains",
        image: "",
        initiative: "speed",
        description: "Planícies gélidas. Iniciativa por Velocidade.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 10 }
    },
    {
        id: 4,
        name: "Riverlands",
        image: "",
        initiative: "wisdom",
        description: "Rios traiçoeiros. Iniciativa por Sabedoria.",
        modifiers: { courage: 0, power: 0, wisdom: 10, speed: 0 }
    },
    {
        id: 5,
        name: "Mipedim Oasis",
        image: "",
        initiative: "speed",
        description: "Santuário Mipedian. Iniciativa por Velocidade.",
        modifiers: { courage: 0, power: 0, wisdom: 0, speed: 15 }
    },
    {
        id: 6,
        name: "Mount Pillar",
        image: "",
        initiative: "power",
        description: "A colmeia Danian. Iniciativa por Poder.",
        modifiers: { courage: 5, power: 5, wisdom: 0, speed: 0 }
    }
];

window.locationsDatabase = locationsDatabase;
