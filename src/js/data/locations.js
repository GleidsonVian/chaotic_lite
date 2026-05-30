// Banco de Dados de Cartas de Localização — Dawn of Perim (30 locais)

const locationsDatabase = [
    {
        id: 1, name: "Castle Bodhran", initiative: "power",
        description: "No início do combate, cada jogador pode retornar uma Mugic do descarte para a mão.",
        modifiers: {},
        effect: { type: "combat_start_return_mugic" }
    },
    {
        id: 2, name: "Castle Pillar", initiative: "courage",
        description: "No início do combate, se uma criatura engajada tiver mais Wisdom que a oponente, ela ganha 1 contador Mugic.",
        modifiers: {},
        effect: { type: "combat_start_mugic_counter_higher_wisdom" }
    },
    {
        id: 3, name: "Cordac Falls", initiative: "wisdom",
        description: "No início do combate, criaturas engajadas ganham 5 de Energia.",
        modifiers: {},
        effect: { type: "combat_start_energy", value: 5, target: "both" }
    },
    {
        id: 4, name: "Cordac Falls Plungepool", initiative: "courage",
        description: "No início do combate, criaturas engajadas sofrem 5 de dano.",
        modifiers: {},
        effect: { type: "combat_start_damage", value: 5, target: "both" }
    },
    {
        id: 5, name: "Crystal Cave", initiative: "speed",
        description: "Se uma criatura engajada tiver menos Speed que a oponente, ela causa 0 de dano no seu primeiro ataque.",
        modifiers: {},
        effect: { type: "first_attack_zero_if_lower_speed" }
    },
    {
        id: 6, name: "Doors of the Deepmines", initiative: "speed",
        description: "No início do combate, criaturas com Water ganham 10 de Energia.",
        modifiers: {},
        effect: { type: "combat_start_element_energy", element: "Water", value: 10 }
    },
    {
        id: 7, name: "Dranakis Threshold", initiative: "courage",
        description: "Mugics e habilidades ativadas não podem ser jogadas.",
        modifiers: {},
        effect: { type: "no_mugic" }
    },
    {
        id: 8, name: "Everrain", initiative: "courage",
        description: "Ataques de Água causam +5 de dano. Ataques de Terra causam -5 de dano.",
        modifiers: {},
        effect: { type: "elemental_modifiers", bonuses: { Water: 5 }, penalties: { Earth: 5 } }
    },
    {
        id: 9, name: "Eye of the Maelstrom", initiative: "power",
        description: "Quando este se torna o Local ativo, cada jogador descarta uma Mugic.",
        modifiers: {},
        effect: { type: "on_enter_discard_mugic" }
    },
    {
        id: 10, name: "Fear Valley", initiative: "wisdom",
        description: "No início do combate, se uma criatura engajada tiver menos Courage que a oponente, ela perde 10 de Energia.",
        modifiers: {},
        effect: { type: "combat_start_damage_lower_courage", value: 10 }
    },
    {
        id: 11, name: "Forest of Life", initiative: "wisdom",
        description: "No início do combate, se uma criatura tiver mais Power que a oponente, ela ganha 5 de Energia.",
        modifiers: {},
        effect: { type: "combat_start_energy_higher_power", value: 5 }
    },
    {
        id: 12, name: "Gigantempopolis", initiative: "power",
        description: "No início do combate, criaturas OverWorld engajadas ganham 1 contador Mugic.",
        modifiers: {},
        effect: { type: "combat_start_mugic_counter_tribe", tribe: "OverWorld" }
    },
    {
        id: 13, name: "Glacier Plains", initiative: "power",
        description: "Criaturas pagam 1 contador extra para jogar Mugics UnderWorld.",
        modifiers: {},
        effect: { type: "extra_mugic_cost_tribe", tribe: "UnderWorld", value: 1 }
    },
    {
        id: 14, name: "Gloomuck Swamp", initiative: "courage",
        description: "Ataques de Terra causam +5 de dano. Ataques de Fogo causam -5 de dano.",
        modifiers: {},
        effect: { type: "elemental_modifiers", bonuses: { Earth: 5 }, penalties: { Fire: 5 } }
    },
    {
        id: 15, name: "Gothos Tower", initiative: "speed",
        description: "Criaturas que não sejam Lord Van Bloot têm -10 de Courage. Lord Van Bloot ganha Invisibility: Strike 15.",
        modifiers: {},
        effect: { type: "gothos_tower_special" }
    },
    {
        id: 16, name: "Iron Pillar", initiative: "courage",
        description: "Battlegears não têm habilidades e não podem ganhar habilidades.",
        modifiers: {},
        effect: { type: "no_battlegear_abilities" }
    },
    {
        id: 17, name: "Kiru City", initiative: "wisdom",
        description: "Criaturas OverWorld têm +10 de Energia.",
        modifiers: {},
        effect: { type: "tribe_energy_bonus", tribe: "OverWorld", value: 10 }
    },
    {
        id: 18, name: "Lake Ken-I-Po", initiative: "power",
        description: "Cada Mugic é 'Untargetable' (não pode ser negada).",
        modifiers: {},
        effect: { type: "mugic_untargetable" }
    },
    {
        id: 19, name: "Lava Pond", initiative: "speed",
        description: "Ataques de Fogo causam +5 de dano. Ataques de Ar causam -5 de dano.",
        modifiers: {},
        effect: { type: "elemental_modifiers", bonuses: { Fire: 5 }, penalties: { Air: 5 } }
    },
    {
        id: 20, name: "Mipedim Oasis", initiative: "courage",
        description: "Criaturas Mipedian causam +10 de dano em seu primeiro ataque.",
        modifiers: {},
        effect: { type: "first_attack_tribe_bonus", tribe: "Mipedian", value: 10 }
    },
    {
        id: 21, name: "Mount Pillar", initiative: "wisdom",
        description: "Quando este se torna ativo, ativa Hive: todas as criaturas Danian ganham +5 em todos os stats.",
        modifiers: {},
        effect: { type: "on_enter_activate_hive" }
    },
    {
        id: 22, name: "Ravanaugh Ridge", initiative: "power",
        description: "No início do combate, se uma criatura engajada tiver Ar, seu jogador vê o topo do Attack Deck.",
        modifiers: {},
        effect: { type: "combat_start_peek_if_air" }
    },
    {
        id: 23, name: "Riverlands", initiative: "wisdom",
        description: "Quando uma criatura causa dano de Água, cura 5 de Energia.",
        modifiers: {},
        effect: { type: "heal_on_water_attack", value: 5 }
    },
    {
        id: 24, name: "Runic Grove", initiative: "courage",
        description: "Mugics tribais não podem ser jogadas (apenas Generic).",
        modifiers: {},
        effect: { type: "no_tribal_mugic" }
    },
    {
        id: 25, name: "Stone Pillar", initiative: "wisdom",
        description: "Criaturas UnderWorld engajadas pagam 1 contador a menos para jogar sua primeira Mugic.",
        modifiers: {},
        effect: { type: "mugic_discount_tribe_first", tribe: "UnderWorld", value: 1 }
    },
    {
        id: 26, name: "Stronghold Morn", initiative: "speed",
        description: "No início do combate, criaturas engajadas ganham Fogo, Água, Ar e Terra.",
        modifiers: {},
        effect: { type: "combat_start_grant_all_elements" }
    },
    {
        id: 27, name: "The Storm Tunnel", initiative: "power",
        description: "Ataques de Ar causam +5 de dano. Ataques de Água causam -5 de dano.",
        modifiers: {},
        effect: { type: "elemental_modifiers", bonuses: { Air: 5 }, penalties: { Water: 5 } }
    },
    {
        id: 28, name: "UnderWorld City", initiative: "speed",
        description: "Ataques de criaturas UnderWorld têm Challenge Power 15: +5 dano.",
        modifiers: {},
        effect: { type: "underworld_city_bonus" }
    },
    {
        id: 29, name: "UnderWorld Colosseum", initiative: "speed",
        description: "Criaturas com Fogo causam +10 de dano em seu primeiro ataque.",
        modifiers: {},
        effect: { type: "first_attack_element_bonus", element: "Fire", value: 10 }
    },
    {
        id: 30, name: "Wooden Pillar", initiative: "wisdom",
        description: "Criaturas pagam 1 contador extra para jogar Mugics OverWorld.",
        modifiers: {},
        effect: { type: "extra_mugic_cost_tribe", tribe: "OverWorld", value: 1 }
    }
];

window.locationsDatabase = locationsDatabase;
