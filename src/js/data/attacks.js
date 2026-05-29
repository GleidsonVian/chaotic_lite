// Estrutura de dados das cartas de Ataque

const attacksDatabase = [
    {
        id: "a1",
        name: "Lavalanche",
        bp: 1,
        baseDamage: 10,
        elementRequirement: "Fire",
        elementDamage: 10,
        statRequirement: "power",
        statDamage: 5
    },
    {
        id: "a2",
        name: "Pebble Styx",
        bp: 0,
        baseDamage: 5,
        elementRequirement: "Earth",
        elementDamage: 10,
        statRequirement: null,
        statDamage: 0
    },
    
    {
        id: "a3",
        name: "Ember Swarm",
        bp: 1,
        baseDamage: 15,
        elementRequirement: "Fire",
        elementDamage: 5,
        statRequirement: "speed",
        statDamage: 5
    },
    {
        id: "a4",
        name: "Torrent of Water",
        bp: 1,
        baseDamage: 10,
        elementRequirement: "Water",
        elementDamage: 15,
        statRequirement: "wisdom",
        statDamage: 5
    },
    {
        id: "a5",
        name: "Wind Strike",
        bp: 0,
        baseDamage: 5,
        elementRequirement: "Air",
        elementDamage: 10,
        statRequirement: "speed",
        statDamage: 10
    },
    {
        id: "a6",
        name: "Sunder",
        bp: 2,
        baseDamage: 20,
        elementRequirement: "Earth",
        elementDamage: 5,
        statRequirement: "power",
        statDamage: 10
    },
    {
        id: "a7",
        name: "Basic Strike",
        bp: 0,
        baseDamage: 10,
        elementRequirement: null,
        elementDamage: 0,
        statRequirement: "courage",
        statDamage: 5
    }
];

window.attacksDatabase = attacksDatabase;
