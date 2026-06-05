// Banco de Dados de Cartas de Ataque — Dawn of Perim (49 cartas)
// statMode: "challenge" = precisa X+ a mais que o oponente | "check" = precisa ter >= X absoluto
// elementEffect: efeito especial quando tem o elemento (além de elementDamage)
// specialEffect: efeito especial da carta independente de elemento/stat
// statHeal: cura em vez de dano no stat check

const attacksDatabase = [
    // ── 0 Build Points ──────────────────────────────────────────────────────
    { id:"a1", image:"src/assets/attacks/a1.jpg",  name:"Degenervate",    bp:0, baseDamage:0,  elementRequirement:"Water", elementDamage:0,  elementEffect:{type:"drain_all_stats_lose_element_temp", value:25}, rarity:"Rare" },
    { id:"a2", image:"src/assets/attacks/a2.jpg",  name:"Delerium",       bp:0, baseDamage:0,  statRequirement:"wisdom",  statMode:"check",     statThreshold:50, statDamage:5,  rarity:"Common" },
    { id:"a3", image:"src/assets/attacks/a3.jpg",  name:"Ektospasm",      bp:0, baseDamage:0,  statRequirement:"power",   statMode:"check",     statThreshold:50, statDamage:5,  rarity:"Common" },
    { id:"a4", image:"src/assets/attacks/a4.jpg",  name:"Evaporize",      bp:0, baseDamage:0,  statRequirement:"courage", statMode:"challenge", statThreshold:15, statDamage:0,  statHeal:10, rarity:"Rare" },
    { id:"a5", image:"src/assets/attacks/a5.jpg",  name:"Flashwarp",      bp:0, baseDamage:0,  statRequirement:"power",   statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Common" },
    { id:"a6", image:"src/assets/attacks/a6.jpg",  name:"Hive Call",      bp:0, baseDamage:0,  specialEffect:{type:"hive_call"}, rarity:"Rare" },
    { id:"a7", image:"src/assets/attacks/a7.jpg",  name:"Mirthquake",     bp:0, baseDamage:0,  elementRequirement:"Earth", elementDamage:0, elementEffect:{type:"new_location_lose_element", element:"Earth"}, rarity:"Rare" },
    { id:"a8", image:"src/assets/attacks/a8.jpg",  name:"Quick Exit",     bp:0, baseDamage:0,  statRequirement:"wisdom",  statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Common" },
    { id:"a9", image:"src/assets/attacks/a9.jpg",  name:"Shadow Strike",  bp:0, baseDamage:0,  statRequirement:"courage", statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Common" },
    { id:"a10", image:"src/assets/attacks/a10.jpg", name:"Shriek Shock",   bp:0, baseDamage:0,  statRequirement:"speed",   statMode:"check",     statThreshold:50, statDamage:5,  rarity:"Common" },
    { id:"a11", image:"src/assets/attacks/a11.jpg", name:"Spirit Gust",    bp:0, baseDamage:0,  statRequirement:"courage", statMode:"check",     statThreshold:50, statDamage:5,  rarity:"Common" },
    { id:"a12", image:"src/assets/attacks/a12.jpg", name:"Tornado Tackle", bp:0, baseDamage:0,  elementRequirement:"Air",  elementDamage:0, elementEffect:{type:"shuffle_both_attack_decks"}, rarity:"Rare" },
    { id:"a13", image:"src/assets/attacks/a13.jpg", name:"Velocitrap",     bp:0, baseDamage:0,  statRequirement:"speed",   statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Common" },
    { id:"a14", image:"src/assets/attacks/a14.jpg", name:"Flash Mend",     bp:0, baseDamage:0,  statRequirement:"wisdom",  statMode:"check",     statThreshold:50, statDamage:0,  statHeal:5,  rarity:"Rare" },
    { id:"a15", image:"src/assets/attacks/a15.jpg", name:"Incinerase",     bp:0, baseDamage:0,  elementRequirement:"Fire", elementDamage:10, elementEffect:{type:"lose_element", element:"Fire"}, rarity:"Rare" },

    // ── 1 Build Point ───────────────────────────────────────────────────────
    { id:"a16", image:"src/assets/attacks/a16.jpg", name:"Ash Torrent",    bp:1, baseDamage:0, elementRequirement:"Fire", elementDamage:5, extraElements:[{element:"Earth", damage:5}], statRequirement:"power",   statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Uncommon" },
    { id:"a17", image:"src/assets/attacks/a17.jpg", name:"Ember Swarm",    bp:1, baseDamage:5,  elementRequirement:"Fire", elementDamage:0,  elementEffect:{type:"drain_stat_temp", stat:"wisdom", value:25}, rarity:"Uncommon" },
    { id:"a18", image:"src/assets/attacks/a18.jpg", name:"Flash Kick",     bp:1, baseDamage:5,  specialEffect:{type:"peek_location_deck"}, rarity:"Uncommon" },
    { id:"a19", image:"src/assets/attacks/a19.jpg", name:"Inferno Gust",   bp:1, baseDamage:0,  elementRequirement:"Fire", elementDamage:5,  statRequirement:"speed",   statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Uncommon" },
    { id:"a20", image:"src/assets/attacks/a20.jpg", name:"Iron Balls",     bp:1, baseDamage:0,  specialEffect:{type:"no_tribal_mugic_this_attack"}, rarity:"Super Rare" },
    { id:"a21", image:"src/assets/attacks/a21.jpg", name:"Lightning Burst",bp:1, baseDamage:5,  elementRequirement:"Air",  elementDamage:0,  elementEffect:{type:"drain_stat", stat:"power", value:25}, rarity:"Uncommon" },
    { id:"a22", image:"src/assets/attacks/a22.jpg", name:"Pebblestorm",    bp:1, baseDamage:5,  elementRequirement:"Earth",elementDamage:5,  statRequirement:"speed",   statMode:"challenge", statThreshold:5,  statDamage:5, rarity:"Common" },
    { id:"a23", image:"src/assets/attacks/a23.jpg", name:"Rip Tide",       bp:1, baseDamage:5,  elementRequirement:"Water",elementDamage:0,  elementEffect:{type:"drain_stat", stat:"courage", value:25}, rarity:"Uncommon" },
    { id:"a24", image:"src/assets/attacks/a24.jpg", name:"Rustoxic",       bp:1, baseDamage:0,  statRequirement:"courage", statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Uncommon" },
    { id:"a25", image:"src/assets/attacks/a25.jpg", name:"Squeeze Play",   bp:1, baseDamage:5,  specialEffect:{type:"peek_attack_deck"}, rarity:"Uncommon" },
    { id:"a26", image:"src/assets/attacks/a26.jpg", name:"Steam Rage",     bp:1, baseDamage:0,  elementRequirement:"Fire", elementDamage:5,  statRequirement:"speed",   statMode:"challenge", statThreshold:5,  statDamage:5, rarity:"Common" },
    { id:"a27", image:"src/assets/attacks/a27.jpg", name:"Unsanity",       bp:1, baseDamage:0,  statRequirement:"wisdom",  statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Uncommon" },
    { id:"a28", image:"src/assets/attacks/a28.jpg", name:"Vine Snare",     bp:1, baseDamage:5,  elementRequirement:"Earth",elementDamage:0,  elementEffect:{type:"drain_stat", stat:"speed", value:25}, rarity:"Uncommon" },
    { id:"a29", image:"src/assets/attacks/a29.jpg", name:"Windslash",      bp:1, baseDamage:5,  specialEffect:{type:"reveal_battlegear"}, rarity:"Uncommon" },

    // ── 2 Build Points ──────────────────────────────────────────────────────
    { id:"a30", image:"src/assets/attacks/a30.jpg", name:"Fearocity",      bp:2, baseDamage:5,  elementRequirement:"Air", elementDamage:5, statRequirement:"courage", statMode:"check",     statThreshold:75, statDamage:10, rarity:"Super Rare" },
    { id:"a31", image:"src/assets/attacks/a31.jpg", name:"Flame Orb",      bp:2, baseDamage:5,  elementRequirement:"Fire", elementDamage:5,  statRequirement:"power",   statMode:"check",     statThreshold:75, statDamage:10, rarity:"Super Rare" },
    { id:"a32", image:"src/assets/attacks/a32.jpg", name:"Frost Blight",   bp:2, baseDamage:5,  statRequirement:"speed",   statMode:"check",     statThreshold:75, statDamage:10, rarity:"Super Rare" },
    { id:"a33", image:"src/assets/attacks/a33.jpg", name:"Paral-Eyes",     bp:2, baseDamage:10, statRequirement:"speed",   statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Rare" },
    { id:"a34", image:"src/assets/attacks/a34.jpg", name:"Power Pulse",    bp:2, baseDamage:10, statRequirement:"power",   statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Rare" },
    { id:"a35", image:"src/assets/attacks/a35.jpg", name:"Rock Wave",      bp:2, baseDamage:5,  statRequirement:"wisdom",  statMode:"check",     statThreshold:75, statDamage:10, rarity:"Super Rare" },
    { id:"a36", image:"src/assets/attacks/a36.jpg", name:"Skeletal Strike",bp:2, baseDamage:10, statRequirement:"courage", statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Rare" },
    { id:"a37", image:"src/assets/attacks/a37.jpg", name:"Sleep Sting",    bp:2, baseDamage:10, statRequirement:"wisdom",  statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Rare" },
    { id:"a38", image:"src/assets/attacks/a38.jpg", name:"Thunder Shout",  bp:2, baseDamage:10, elementRequirement:"Air",  elementDamage:10, rarity:"Common" },
    { id:"a39", image:"src/assets/attacks/a39.jpg", name:"Torrent of Flame",bp:2,baseDamage:5,  elementRequirement:"Fire", elementDamage:10, statRequirement:"speed",   statMode:"challenge", statThreshold:5, statDamage:5, rarity:"Common" },

    // ── 3 Build Points ──────────────────────────────────────────────────────
    { id:"a40", image:"src/assets/attacks/a40.jpg", name:"Coil Crush",     bp:3, baseDamage:5,  statRequirement:"power",   statMode:"check",     statThreshold:75, statDamage:0, specialEffect:{type:"destroy_battlegear_on_check", checkStat:"power", checkThreshold:75}, rarity:"Super Rare" },
    { id:"a41", image:"src/assets/attacks/a41.jpg", name:"Hail Storm",     bp:3, baseDamage:10, elementRequirement:"Water",elementDamage:5,  statRequirement:"speed",   statMode:"challenge", statThreshold:5, statDamage:5, rarity:"Super Rare" },
    { id:"a42", image:"src/assets/attacks/a42.jpg", name:"Lavalanche",     bp:3, baseDamage:10, elementRequirement:"Fire", elementDamage:5, extraElements:[{element:"Earth", damage:5}], rarity:"Super Rare" },
    { id:"a43", image:"src/assets/attacks/a43.jpg", name:"Sludge Gush",    bp:3, baseDamage:10, elementRequirement:"Earth",elementDamage:5,  statRequirement:"wisdom",  statMode:"challenge", statThreshold:5, statDamage:5, rarity:"Super Rare" },
    { id:"a44", image:"src/assets/attacks/a44.jpg", name:"Telekinetic Bolt",bp:3,baseDamage:10, specialEffect:{type:"double_challenge", checks:[{stat:"courage",threshold:15},{stat:"wisdom",threshold:15}], bonusDamage:10, bonusHeal:10}, rarity:"Super Rare" },
    { id:"a45", image:"src/assets/attacks/a45.jpg", name:"Toxic Gust",     bp:3, baseDamage:10, elementRequirement:"Air",  elementDamage:5,  statRequirement:"power",   statMode:"challenge", statThreshold:5, statDamage:5, rarity:"Super Rare" },
    { id:"a46", image:"src/assets/attacks/a46.jpg", name:"Viperlash",      bp:3, baseDamage:15, rarity:"Rare" },

    // ── 4+ Build Points ─────────────────────────────────────────────────────
    { id:"a47", image:"src/assets/attacks/a47.jpg", name:"Lucky Shot",     bp:4, baseDamage:0,  specialEffect:{type:"lucky_shot", value:40}, rarity:"Ultra Rare" },
    { id:"a48", image:"src/assets/attacks/a48.jpg", name:"Megaroar",       bp:4, baseDamage:0,  specialEffect:{type:"megaroar", threshold:70, value:10}, rarity:"Ultra Rare" },
    { id:"a49", image:"src/assets/attacks/a49.jpg", name:"Allmageddon",    bp:5, baseDamage:10, elementRequirement:"Fire", elementDamage:10,
                extraElements:[
                    {element:"Earth", damage:10},
                    {element:"Air",   damage:10},
                    {element:"Water", damage:10}
                ], rarity:"Super Rare" },
];

window.attacksDatabase = attacksDatabase;
