// Banco de Dados de Cartas de Ataque — Dawn of Perim (49 cartas)
// statMode: "challenge" = precisa X+ a mais que o oponente | "check" = precisa ter >= X absoluto
// elementEffect: efeito especial quando tem o elemento (além de elementDamage)
// specialEffect: efeito especial da carta independente de elemento/stat
// statHeal: cura em vez de dano no stat check

const attacksDatabase = [
    // ── 0 Build Points ──────────────────────────────────────────────────────
    { id:"a1",  name:"Degenervate",    bp:0, baseDamage:0,  elementRequirement:"Water", elementDamage:0,  elementEffect:{type:"drain_all_stats_lose_element", value:25}, rarity:"Rare" },
    { id:"a2",  name:"Delerium",       bp:0, baseDamage:0,  statRequirement:"wisdom",  statMode:"check",     statThreshold:50, statDamage:5,  rarity:"Common" },
    { id:"a3",  name:"Ektospasm",      bp:0, baseDamage:0,  statRequirement:"power",   statMode:"check",     statThreshold:50, statDamage:5,  rarity:"Common" },
    { id:"a4",  name:"Evaporize",      bp:0, baseDamage:0,  statRequirement:"courage", statMode:"challenge", statThreshold:15, statDamage:0,  statHeal:10, rarity:"Rare" },
    { id:"a5",  name:"Flashwarp",      bp:0, baseDamage:0,  statRequirement:"power",   statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Common" },
    { id:"a6",  name:"Hive Call",      bp:0, baseDamage:0,  specialEffect:{type:"hive_call"}, rarity:"Rare" },
    { id:"a7",  name:"Mirthquake",     bp:0, baseDamage:0,  elementRequirement:"Earth", elementDamage:0, elementEffect:{type:"new_location_lose_element", element:"Earth"}, rarity:"Rare" },
    { id:"a8",  name:"Quick Exit",     bp:0, baseDamage:0,  statRequirement:"wisdom",  statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Common" },
    { id:"a9",  name:"Shadow Strike",  bp:0, baseDamage:0,  statRequirement:"courage", statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Common" },
    { id:"a10", name:"Shriek Shock",   bp:0, baseDamage:0,  statRequirement:"speed",   statMode:"check",     statThreshold:50, statDamage:5,  rarity:"Common" },
    { id:"a11", name:"Spirit Gust",    bp:0, baseDamage:0,  statRequirement:"courage", statMode:"check",     statThreshold:50, statDamage:5,  rarity:"Common" },
    { id:"a12", name:"Tornado Tackle", bp:0, baseDamage:0,  elementRequirement:"Air",  elementDamage:0, elementEffect:{type:"shuffle_both_attack_decks"}, rarity:"Rare" },
    { id:"a13", name:"Velocitrap",     bp:0, baseDamage:0,  statRequirement:"speed",   statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Common" },
    { id:"a14", name:"Flash Mend",     bp:0, baseDamage:0,  statRequirement:"wisdom",  statMode:"check",     statThreshold:50, statDamage:0,  statHeal:5,  rarity:"Rare" },
    { id:"a15", name:"Incinerase",     bp:0, baseDamage:0,  elementRequirement:"Fire", elementDamage:10, elementEffect:{type:"lose_element", element:"Fire"}, rarity:"Rare" },

    // ── 1 Build Point ───────────────────────────────────────────────────────
    { id:"a16", name:"Ash Torrent",    bp:1, baseDamage:0,  statRequirement:"power",   statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Uncommon" },
    { id:"a17", name:"Ember Swarm",    bp:1, baseDamage:5,  elementRequirement:"Fire", elementDamage:0,  elementEffect:{type:"drain_stat", stat:"wisdom", value:25}, rarity:"Uncommon" },
    { id:"a18", name:"Flash Kick",     bp:1, baseDamage:5,  specialEffect:{type:"peek_location_deck"}, rarity:"Uncommon" },
    { id:"a19", name:"Inferno Gust",   bp:1, baseDamage:0,  elementRequirement:"Fire", elementDamage:5,  statRequirement:"speed",   statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Uncommon" },
    { id:"a20", name:"Iron Balls",     bp:1, baseDamage:0,  specialEffect:{type:"no_tribal_mugic_this_attack"}, rarity:"Super Rare" },
    { id:"a21", name:"Lightning Burst",bp:1, baseDamage:5,  elementRequirement:"Air",  elementDamage:0,  elementEffect:{type:"drain_stat", stat:"power", value:25}, rarity:"Uncommon" },
    { id:"a22", name:"Pebblestorm",    bp:1, baseDamage:5,  elementRequirement:"Earth",elementDamage:5,  statRequirement:"speed",   statMode:"challenge", statThreshold:5,  statDamage:5, rarity:"Common" },
    { id:"a23", name:"Rip Tide",       bp:1, baseDamage:5,  elementRequirement:"Water",elementDamage:0,  elementEffect:{type:"drain_stat", stat:"courage", value:25}, rarity:"Uncommon" },
    { id:"a24", name:"Rustoxic",       bp:1, baseDamage:0,  statRequirement:"courage", statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Uncommon" },
    { id:"a25", name:"Squeeze Play",   bp:1, baseDamage:5,  specialEffect:{type:"peek_attack_deck"}, rarity:"Uncommon" },
    { id:"a26", name:"Steam Rage",     bp:1, baseDamage:0,  elementRequirement:"Fire", elementDamage:5,  statRequirement:"speed",   statMode:"challenge", statThreshold:5,  statDamage:5, rarity:"Common" },
    { id:"a27", name:"Unsanity",       bp:1, baseDamage:0,  statRequirement:"wisdom",  statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Uncommon" },
    { id:"a28", name:"Vine Snare",     bp:1, baseDamage:5,  elementRequirement:"Earth",elementDamage:0,  elementEffect:{type:"drain_stat", stat:"speed", value:25}, rarity:"Uncommon" },
    { id:"a29", name:"Windslash",      bp:1, baseDamage:5,  specialEffect:{type:"reveal_battlegear"}, rarity:"Uncommon" },

    // ── 2 Build Points ──────────────────────────────────────────────────────
    { id:"a30", name:"Fearocity",      bp:2, baseDamage:5,  statRequirement:"courage", statMode:"check",     statThreshold:75, statDamage:10, rarity:"Super Rare" },
    { id:"a31", name:"Flame Orb",      bp:2, baseDamage:5,  elementRequirement:"Fire", elementDamage:5,  statRequirement:"power",   statMode:"check",     statThreshold:75, statDamage:10, rarity:"Super Rare" },
    { id:"a32", name:"Frost Blight",   bp:2, baseDamage:5,  statRequirement:"speed",   statMode:"check",     statThreshold:75, statDamage:10, rarity:"Super Rare" },
    { id:"a33", name:"Paral-Eyes",     bp:2, baseDamage:10, statRequirement:"speed",   statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Rare" },
    { id:"a34", name:"Power Pulse",    bp:2, baseDamage:10, statRequirement:"power",   statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Rare" },
    { id:"a35", name:"Rock Wave",      bp:2, baseDamage:5,  statRequirement:"wisdom",  statMode:"check",     statThreshold:75, statDamage:10, rarity:"Super Rare" },
    { id:"a36", name:"Skeletal Strike",bp:2, baseDamage:10, statRequirement:"courage", statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Rare" },
    { id:"a37", name:"Sleep Sting",    bp:2, baseDamage:10, statRequirement:"wisdom",  statMode:"challenge", statThreshold:15, statDamage:10, rarity:"Rare" },
    { id:"a38", name:"Thunder Shout",  bp:2, baseDamage:10, elementRequirement:"Air",  elementDamage:10, rarity:"Common" },
    { id:"a39", name:"Torrent of Flame",bp:2,baseDamage:5,  elementRequirement:"Fire", elementDamage:10, statRequirement:"speed",   statMode:"challenge", statThreshold:5, statDamage:5, rarity:"Common" },

    // ── 3 Build Points ──────────────────────────────────────────────────────
    { id:"a40", name:"Coil Crush",     bp:3, baseDamage:5,  statRequirement:"power",   statMode:"check",     statThreshold:75, statDamage:0, specialEffect:{type:"destroy_battlegear_on_check", checkStat:"power", checkThreshold:75}, rarity:"Super Rare" },
    { id:"a41", name:"Hail Storm",     bp:3, baseDamage:10, elementRequirement:"Water",elementDamage:5,  statRequirement:"speed",   statMode:"challenge", statThreshold:5, statDamage:5, rarity:"Super Rare" },
    { id:"a42", name:"Lavalanche",     bp:3, baseDamage:10, elementRequirement:"Fire", elementDamage:10, statRequirement:"power",   statMode:"challenge", statThreshold:5, statDamage:5, rarity:"Super Rare" },
    { id:"a43", name:"Sludge Gush",    bp:3, baseDamage:10, elementRequirement:"Earth",elementDamage:5,  statRequirement:"wisdom",  statMode:"challenge", statThreshold:5, statDamage:5, rarity:"Super Rare" },
    { id:"a44", name:"Telekinetic Bolt",bp:3,baseDamage:10, specialEffect:{type:"double_challenge", checks:[{stat:"courage",threshold:15},{stat:"wisdom",threshold:15}], bonusDamage:10, bonusHeal:10}, rarity:"Super Rare" },
    { id:"a45", name:"Toxic Gust",     bp:3, baseDamage:10, elementRequirement:"Air",  elementDamage:5,  statRequirement:"power",   statMode:"challenge", statThreshold:5, statDamage:5, rarity:"Super Rare" },
    { id:"a46", name:"Viperlash",      bp:3, baseDamage:15, rarity:"Rare" },

    // ── 4+ Build Points ─────────────────────────────────────────────────────
    { id:"a47", name:"Lucky Shot",     bp:4, baseDamage:0,  specialEffect:{type:"lucky_shot", value:40}, rarity:"Ultra Rare" },
    { id:"a48", name:"Megaroar",       bp:4, baseDamage:0,  specialEffect:{type:"megaroar", threshold:70, value:10}, rarity:"Ultra Rare" },
    { id:"a49", name:"Allmageddon",    bp:5, baseDamage:10, statRequirement:"courage", statMode:"challenge", statThreshold:10, statDamage:10,
                extraChecks:[
                    {stat:"power",   mode:"challenge", threshold:10, damage:10},
                    {stat:"wisdom",  mode:"challenge", threshold:10, damage:10},
                    {stat:"speed",   mode:"challenge", threshold:10, damage:10}
                ], rarity:"Super Rare" },
];

window.attacksDatabase = attacksDatabase;
