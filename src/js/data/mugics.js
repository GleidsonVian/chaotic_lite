const mugicsDatabase = [
    { id: "m1", name: "Song of Resurgence", type: "OverWorld Mugic", tribe: "OverWorld", cost: 1, costOffTribe: 2, effectType: "heal", effectValue: 25, targetType: "engaged", description: "Cura 25 de Energia de uma criatura engajada em combate." },
    { id: "m2", name: "Refrain of Denial", type: "OverWorld Mugic", tribe: "OverWorld", cost: 2, costOffTribe: 3, effectType: "heal", effectValue: 50, targetType: "any_ally", description: "Cura 50 de Energia de qualquer criatura sua no tabuleiro." },
    { id: "m3", name: "Melody of Miragai", type: "Mipedian Mugic", tribe: "Mipedian", cost: 3, costOffTribe: 4, effectType: "heal_multiple", effectValue: 30, targetType: "up_to_two_allies", description: "Cura 30 de Energia de até 2 criaturas suas diferentes." },
    { id: "m4", name: "Canon of Casualty", type: "UnderWorld Mugic", tribe: "UnderWorld", cost: 1, costOffTribe: 3, effectType: "damage", effectValue: 20, targetType: "engaged_enemy", description: "Causa 20 de dano direto à criatura inimiga engajada em combate." },
    { id: "m5", name: "Warbattle Hymn", type: "Danian Mugic", tribe: "Danian", cost: 1, costOffTribe: 2, effectType: "damage", effectValue: 15, targetType: "any_enemy", description: "Causa 15 de dano direto a qualquer criatura inimiga no tabuleiro." },
    { id: "m6", name: "Cadence of Malice", type: "M'arrillian Mugic", tribe: "M'arrillian", cost: 3, costOffTribe: 4, effectType: "damage_all_engaged", effectValue: 20, targetType: "all_engaged_enemies", description: "Causa 20 de dano a todas as criaturas inimigas engajadas no turno atual." },
    { id: "m7", name: "Verse of Valor", type: "OverWorld Mugic", tribe: "OverWorld", cost: 1, costOffTribe: 2, effectType: "buff_courage", effectValue: 20, targetType: "engaged_ally", description: "Dá +20 de Coragem à criatura engajada até o fim do turno." },
    { id: "m8", name: "Fortissimo", type: "UnderWorld Mugic", tribe: "UnderWorld", cost: 2, costOffTribe: 3, effectType: "buff_power_strength", effectValue: 25, targetType: "engaged_ally", description: "Dá +25 de Força e +25 de Poder à criatura engajada até o fim do turno." },
    { id: "m9", name: "Ode to Obscurity", type: "Mipedian Mugic", tribe: "Mipedian", cost: 1, costOffTribe: 2, effectType: "buff_wisdom", effectValue: 20, targetType: "engaged_ally", description: "Dá +20 de Sabedoria à criatura engajada até o fim do turno." },
    { id: "m10", name: "Quickstep Cadence", type: "Danian Mugic", tribe: "Danian", cost: 1, costOffTribe: 2, effectType: "buff_speed", effectValue: 20, targetType: "engaged_ally", description: "Dá +20 de Velocidade à criatura engajada até o fim do turno." },
    { id: "m11", name: "Rhyme of the Reckless", type: "UnderWorld Mugic", tribe: "UnderWorld", cost: 2, costOffTribe: 3, effectType: "recklessness", effectValue: 15, targetType: "engaged_ally", description: "A criatura engajada ganha Recklessness 15 (+15 dano de ataque, mas recebe +10 de dano por ataque sofrido)." },
    { id: "m12", name: "Lullaby of Mirage", type: "Mipedian Mugic", tribe: "Mipedian", cost: 2, costOffTribe: 3, effectType: "cancel_battlegear", effectValue: 0, targetType: "engaged_enemy", description: "Cancela o efeito de um Battlegear inimigo até o fim do turno." },
    { id: "m13", name: "Echo of Perim", type: "Generic Mugic", tribe: "Generic", cost: 1, costOffTribe: 1, effectType: "copy_element", effectValue: 0, targetType: "engaged_enemy", description: "Copia o efeito elemental da última carta de Ataque jogada pelo oponente e aplica nela mesma." },
    { id: "m14", name: "Dirge of Defeat", type: "M'arrillian Mugic", tribe: "M'arrillian", cost: 3, costOffTribe: 4, effectType: "dispel_buffs", effectValue: 0, targetType: "engaged_enemy", description: "Remove todos os buffs e efeitos ativos da criatura inimiga engajada." },
    { id: "m15", name: "Chorus of Chaos", type: "Generic Mugic", tribe: "Generic", cost: 2, costOffTribe: 2, effectType: "scramble_initiative", effectValue: 0, targetType: "combat", description: "Embaralha as iniciativas do combate atual (Inverte quem ataca primeiro neste strike)." }
];

if (typeof window !== 'undefined') {
    window.mugicsDatabase = mugicsDatabase;
}
