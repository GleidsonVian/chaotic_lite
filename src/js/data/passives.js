// Catálogo de passivas do jogo.
// Cada entrada define: id, nome exibido, ícone, descrição e a função execute(trigger, creature, opponent, log).
// Para adicionar uma nova passiva basta inserir uma nova entrada aqui — main.js não precisa mudar.

const passivesDatabase = {

    intimidate: {
        name: "Intimidate",
        icon: "😰",
        description: (p) => `Reduz ${p.value ?? 10} de ${p.stat ?? 'courage'} do adversário ao iniciar combate.`,
        execute(trigger, passive, creature, opponent, log) {
            if (trigger !== 'combatStart') return;
            const stat = passive.stat ?? 'courage';
            const val  = passive.value ?? 10;
            opponent[stat] = Math.max(0, (opponent[stat] ?? 0) - val);
            log(`😰 ${creature.name} [Intimidate]: ${opponent.name} perde ${val} de ${stat}!`);
        }
    },

    swift: {
        name: "Swift",
        icon: "💨",
        description: (p) => `+${p.value ?? 10} Speed na disputa de iniciativa.`,
        execute(trigger, passive, creature, opponent, log) {
            if (trigger !== 'initiativeCalc') return;
            const val = passive.value ?? 10;
            creature._swiftBonus = val;
            log(`💨 ${creature.name} [Swift ${val}]: +${val} Speed na iniciativa!`);
        }
    },

    fireproof: {
        name: "Fireproof",
        icon: "🧯",
        description: (p) => `Reduz ${p.value ?? 10} de dano de ataques Fire.`,
        execute(trigger, passive, creature, opponent, log) {
            if (trigger !== 'damageTaken') return;
            const reduction = passive.value ?? 10;
            creature._damageReduction = (creature._damageReduction ?? 0) + reduction;
            log(`🧯 ${creature.name} [Fireproof]: reduz ${reduction} de dano de Fogo!`);
        }
    },

    tough: {
        name: "Tough",
        icon: "🛡️",
        description: (p) => `Reduz ${p.value ?? 5} de qualquer dano recebido.`,
        execute(trigger, passive, creature, opponent, log) {
            if (trigger !== 'damageTaken') return;
            const reduction = passive.value ?? 5;
            creature._damageReduction = (creature._damageReduction ?? 0) + reduction;
            log(`🛡️ ${creature.name} [Tough]: reduz ${reduction} de dano!`);
        }
    },

    berserk: {
        name: "Berserk",
        icon: "🔥",
        description: (p) => `+${p.value ?? 15} Power quando abaixo de 50% de energia.`,
        execute(trigger, passive, creature, opponent, log) {
            if (trigger !== 'attackStart') return;
            if (creature.energy > creature.maxEnergy / 2) return;
            const val = passive.value ?? 15;
            creature._berserkBonus = val;
            log(`🔥 ${creature.name} [Berserk]: +${val} Power com baixa energia!`);
        }
    },

    strike: {
        name: "Strike",
        icon: "⚡",
        description: (p) => `+${p.value ?? 10} dano bônus no primeiro ataque do combate.`,
        execute(trigger, passive, creature, opponent, log, activeCombat) {
            if (trigger !== 'combatStart') return;
            if (!activeCombat) return;
            const isStriker = activeCombat.currentStriker === (creature.player === 1 ? 1 : 2);
            if (!isStriker) return;
            const val = passive.value ?? 10;
            creature._strikeBonus = val;
            log(`⚡ ${creature.name} [Strike ${val}]: +${val} dano no primeiro ataque!`);
        }
    },

    // Prontas para uso futuro — apenas declare a passiva na criatura para ativar
    elementproof: {
        name: "Elementproof",
        icon: "🔰",
        description: (p) => `Reduz ${p.value ?? 10} de dano do elemento ${p.element ?? '?'}.`,
        execute(trigger, passive, creature, opponent, log) {
            if (trigger !== 'damageTaken') return;
            // O caller verifica o elemento antes de chamar; aqui só aplica a redução
            const reduction = passive.value ?? 10;
            creature._damageReduction = (creature._damageReduction ?? 0) + reduction;
            log(`🔰 ${creature.name} [Elementproof ${passive.element}]: -${reduction} dano!`);
        }
    },

    adjacentOverWorldPower: {
        name: "OverWorld Bond",
        icon: "🌿",
        description: (p) => `+${p.value ?? 5} Power para cada OverWorld aliado adjacente ao atacar.`,
        execute(trigger, passive, creature, opponent, log, activeCombat, game) {
            if (trigger !== 'attackStart') return;
            if (!game) return;
            const position = game.getCardPosition(creature);
            if (!position) return;
            const board = position.player === 1 ? game.boardP1 : game.boardP2;
            const adjacent = game.getAdjacentPositions(position.r, position.c);
            const count = adjacent.reduce((sum, [r, c]) => {
                const ally = board[r] && board[r][c];
                return sum + (ally && ally.tribe === 'OverWorld' ? 1 : 0);
            }, 0);
            if (count <= 0) return;
            const bonus = count * (passive.value ?? 5);
            creature._adjacentOverWorldPower = bonus;
            log(`🌿 ${creature.name} [OverWorld Bond]: +${bonus} Power (${count} aliados adjacentes).`);
        }
    },

    reckless: {
        name: "Reckless",
        icon: "💢",
        description: (p) => `+${p.value ?? 20} Power mas recebe ${p.value ?? 10} dano extra.`,
        execute(trigger, passive, creature, opponent, log) {
            if (trigger !== 'attackStart') return;
            const val = passive.value ?? 20;
            creature._berserkBonus = (creature._berserkBonus ?? 0) + val;
            creature._recklessPenalty = (passive.penalty ?? 10);
            log(`💢 ${creature.name} [Reckless]: +${val} Power, mas ficará vulnerável!`);
        }
    }
};

window.passivesDatabase = passivesDatabase;
