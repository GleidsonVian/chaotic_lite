// engine-ui.js
Object.assign(GameEngine.prototype, {

    // ── Tooltip Rico de Mugic ────────────────────────────────────────────────

    /** Conselho contextual baseado no tipo de efeito */
    _mugicAdvice(mg) {
        const adviceMap = {
            heal:                    '💡 Use quando sua criatura tiver pouca vida.',
            conditional_heal:        '💡 Use quando a condição for favorável (HP baixo ou elemento ativo).',
            heal_and_grant_element:  '💡 Cura e concede elemento — use para ativar bônus elemental.',
            heal_and_reduce_fire:    '💡 Ideal contra criaturas Fire para curar e reduzir dano.',
            energy_steal:            '💡 Rouba vida do inimigo — poderoso se inimigo tiver muita vida.',
            energy_transfer:         '💡 Transfere vida — use para equilibrar HP entre suas criaturas.',
            damage:                  '💡 Use para finalizar criaturas com pouca vida.',
            buff_all_stats:          '💡 Booste todos os stats — ideal no início do combate.',
            buff_combat_stats:       '💡 Aumenta stats de combate — use antes de um ataque decisivo.',
            damage_reduction_aura:   '💡 Reduz dano elemental — use antes de receber ataque elemental.',
            negate_mugic:            '🚫 Nega uma mugic inimiga — use no burst quando oponente jogar.',
            grant_element:           '💡 Concede elemento — ativa bônus de ataques elementais.',
            debuff_all_stats:        '💡 Enfraquece o inimigo — use antes de um strike.',
            destroy_battlegear:      '💡 Destrói o equipamento inimigo — remove bônus passivos.',
            remove_abilities:        '💡 Remove habilidades — neutraliza criaturas com passivas fortes.',
            shuffle_attack_deck:     '💡 Embaralha o deck — use para dar aleatoriedade ao oponente.',
            swap_combat_stats:       '💡 Troca stats — útil se seu stat for maior que o do inimigo.',
        };
        return adviceMap[mg.effectType] || '💡 Avalie o momento certo para jogar.';
    },

    _showMugicTooltip(event, index) {
        const mg = this.playerMugics[index];
        if (!mg) return;

        const tip = document.getElementById('mugic-tooltip');
        if (!tip) return;

        const tribeColors = {
            OverWorld: '#0ea5e9', UnderWorld: '#dc2626',
            Mipedian: '#d97706', Danian: '#9333ea',
            "M'arrillian": '#0f766e', Generic: '#64748b'
        };
        const tribeColor = tribeColors[mg.tribe] || '#64748b';
        const rarityIcon = mg.rarity === 'Ultra Rare' ? '💎' : mg.rarity === 'Super Rare' ? '🔷' : mg.rarity === 'Rare' ? '🔶' : mg.rarity === 'Uncommon' ? '🔹' : '⚪';

        // Contexto de combate — mostra custo real se houver penalidade de tribo
        const armyTribes = new Set((this.draftedCards || []).map(c => c.tribe));
        const penalty    = mg.tribe !== 'Generic' && !armyTribes.has(mg.tribe);

        const countersAvailable = (() => {
            let total = 0;
            const board = this.boardP1 || [];
            for (const row of board) for (const card of row) if (card) total += (card.mugicCounters || 0);
            return total;
        })();
        const realCost  = penalty ? mg.cost + 1 : mg.cost;
        const canPlay   = countersAvailable >= realCost;

        tip.innerHTML = `
            <!-- Header com cor da tribo -->
            <div style="padding:12px 14px 10px; background:linear-gradient(135deg, ${tribeColor}22, transparent); border-bottom:1px solid ${tribeColor}33;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
                    <span style="font-size:15px;font-weight:900;color:#f1f5f9;line-height:1.2;">${mg.name}</span>
                    <span style="font-size:16px;" title="${mg.rarity||'Common'}">${rarityIcon}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="background:${tribeColor}33;border:1px solid ${tribeColor}66;color:${tribeColor};font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;">${mg.tribe}</span>
                    <span style="font-size:11px;color:#9b59b6;font-weight:700;margin-left:auto;">
                        Custo: ${realCost} ♪ ${penalty ? '<span style="color:#ef4444;font-size:10px;">(+1 penalidade)</span>' : ''}
                    </span>
                </div>
            </div>

            ${mg.image ? `
            <div style="width:100%; height:120px; border-bottom:1px solid #1e293b; overflow:hidden;">
                <img src="${mg.image}" style="width:100%; height:100%; object-fit:cover; object-position:center top;" alt="${mg.name}">
            </div>` : ''}

            <!-- Descrição completa -->
            <div style="padding:10px 14px;border-bottom:1px solid #1e293b;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin-bottom:5px;">Efeito</div>
                <div style="font-size:12px;color:#e2e8f0;line-height:1.5;">${mg.description || '—'}</div>
            </div>

            <!-- Quando usar -->
            <div style="padding:10px 14px;border-bottom:1px solid #1e293b;">
                <div style="font-size:11px;color:#94a3b8;line-height:1.4;">${this._mugicAdvice(mg)}</div>
            </div>

            <!-- Status de uso -->
            <div style="padding:8px 14px;display:flex;align-items:center;gap:6px;">
                <span style="font-size:11px;color:${canPlay?'#22c55e':'#ef4444'};font-weight:600;">
                    ${canPlay ? `✅ Pode jogar (${countersAvailable} ♪ disponíveis)` : `❌ Counters insuficientes (${countersAvailable}/${realCost})`}
                </span>
            </div>`;

        tip.style.visibility = 'visible';
        tip.style.opacity    = '1';
        this._moveMugicTooltip(event);
    },

    _moveMugicTooltip(event) {
        const tip = document.getElementById('mugic-tooltip');
        if (!tip || tip.style.opacity === '0') return;
        const margin = 14;
        const tw = tip.offsetWidth  || 240;
        const th = tip.offsetHeight || 220;
        let x = event.clientX + margin;
        let y = event.clientY - th - margin;
        if (x + tw > window.innerWidth  - 8) x = event.clientX - tw - margin;
        if (y < 8)                           y = event.clientY + margin;
        tip.style.left = x + 'px';
        tip.style.top  = y + 'px';
    },

    _hideMugicTooltip() {
        const tip = document.getElementById('mugic-tooltip');
        if (tip) { tip.style.opacity = '0'; tip.style.visibility = 'hidden'; }
    },

    // ── Tooltip de Carta de Ataque ───────────────────────────────────────────

    _showAttackTooltip(event, atkCard, attacker) {
        if (!atkCard) return;
        const tip = document.getElementById('mugic-tooltip');
        if (!tip) return;

        const rarityColor = {
            'Ultra Rare':'#e056fd', 'Super Rare':'#74b9ff',
            'Rare':'#f9ca24', 'Uncommon':'#6ab04c', 'Common':'#dfe6e9'
        };
        const rarityIcon = { 'Ultra Rare':'💎', 'Super Rare':'🔷', 'Rare':'🔶', 'Uncommon':'🔹', 'Common':'⚪' };
        const rc = rarityColor[atkCard.rarity] || '#dfe6e9';
        const ri = rarityIcon[atkCard.rarity] || '⚪';

        // Elementos efetivos do atacante (inclui battlegear)
        const atkElems = new Set([
            ...(attacker?.elements || []),
            ...(attacker?.bgRevealed && attacker?.battlegear?.elementGranted
                ? [attacker.battlegear.elementGranted] : [])
        ]);

        // Usa _describeAttack se disponível, senão gera descrição inline
        const descLines = this._describeAttack
            ? this._describeAttack(atkCard)
            : [];

        // Dano total esperado (com elementos do atacante)
        let totalDmg = atkCard.baseDamage || 0;
        if (atkCard.elementRequirement && atkElems.has(atkCard.elementRequirement)) {
            totalDmg += atkCard.elementDamage || 0;
        }

        const descHtml = descLines.map(line => {
            // Colorir linhas de acordo com tipo
            let color = '#94a3b8';
            if (/💥/.test(line))  color = '#fbbf24';
            if (/🔥|💧|🪨|🌪️/.test(line)) color = atkElems.has(atkCard.elementRequirement) ? '#fbbf24' : '#475569';
            if (/⚔️|💪|🧠|⚡/.test(line)) color = '#93c5fd';
            if (/👁️|📍|🗑️|📢|📊/.test(line)) color = '#fb923c';
            return `<div style="color:${color};line-height:1.5;">${line}</div>`;
        }).join('');

        // Bônus de local se ativo
        let localBonus = '';
        if (this.activeLocation?.effect) {
            const ef = this.activeLocation.effect;
            if (ef.type === 'elemental_modifiers' && atkCard.elementRequirement && atkElems.has(atkCard.elementRequirement)) {
                const bonus = ef.bonuses?.[atkCard.elementRequirement];
                if (bonus) localBonus = `<div style="font-size:10px;color:#38bdf8;margin-top:4px;">📍 ${this.activeLocation.name}: +${bonus} dano extra (${atkCard.elementRequirement})</div>`;
            }
        }

        tip.innerHTML = `
            <div style="padding:12px 14px 10px;background:linear-gradient(135deg,rgba(251,191,36,0.1),transparent);border-bottom:1px solid #f59e0b33;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
                    <span style="font-size:14px;font-weight:900;color:#fbbf24;">${atkCard.name}</span>
                    <span style="font-size:15px;" title="${atkCard.rarity||''}">${ri}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="background:${rc}22;border:1px solid ${rc}55;color:${rc};font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;">${atkCard.rarity||'Common'}</span>
                    <span style="font-size:20px;font-weight:900;color:#fbbf24;margin-left:auto;">💥 ${totalDmg}</span>
                </div>
            </div>

            ${atkCard.image ? `
            <div style="width:100%; height:120px; border-bottom:1px solid #1e293b; overflow:hidden;">
                <img src="${atkCard.image}" style="width:100%; height:100%; object-fit:cover; object-position:center top;" alt="${atkCard.name}">
            </div>` : ''}

            <div style="padding:10px 14px;border-bottom:1px solid #1e293b;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin-bottom:5px;">Efeitos</div>
                ${descHtml || '<div style="color:#475569;font-size:11px;">Sem efeitos especiais.</div>'}
                ${localBonus}
            </div>

            ${attacker ? `
            <div style="padding:8px 14px;">
                <div style="font-size:10px;color:#64748b;">
                    Atacante: <span style="color:#f1f5f9;font-weight:600;">${attacker.name}</span>
                    ${atkCard.elementRequirement ? `· Elemento ${atkCard.elementRequirement}: <span style="color:${atkElems.has(atkCard.elementRequirement)?'#22c55e':'#ef4444'};font-weight:700;">${atkElems.has(atkCard.elementRequirement)?'✅ ativo':'❌ inativo'}</span>` : ''}
                </div>
            </div>` : ''}
        `;

        tip.style.visibility = 'visible';
        tip.style.opacity    = '1';
        this._positionTooltip(event, tip);
    },

    _positionTooltip(event, tip) {
        const margin = 14;
        const tw = tip.offsetWidth  || 240;
        const th = tip.offsetHeight || 200;
        let x = event.clientX + margin;
        let y = event.clientY - th - margin;
        if (x + tw > window.innerWidth  - 8) x = event.clientX - tw - margin;
        if (y < 8)                           y = event.clientY + margin;
        tip.style.left = x + 'px';
        tip.style.top  = y + 'px';
    },

    _hideAttackTooltip() {
        const tip = document.getElementById('mugic-tooltip');
        if (tip) { tip.style.opacity = '0'; tip.style.visibility = 'hidden'; }
    },

    // ── Tooltip de Battlegear no Board ───────────────────────────────────────

    _showBattlegearTooltip(event, player, r, c) {
        const board = player === 1 ? this.boardP1 : this.boardP2;
        if (!board || !board[r]) return;
        const card = board[r][c];
        if (!card || !card.battlegear) return;
        const bg = card.battlegear;

        const tip = document.getElementById('mugic-tooltip');
        if (!tip) return;

        const iconMap = { Fire:'🔥', Water:'💧', Earth:'🪨', Air:'🌪️' };

        // Bônus de stats
        const mod = bg.modifiers || {};
        const statRows = [
            { key: 'courage', label: 'Coragem',    icon: '⚔️' },
            { key: 'power',   label: 'Poder',      icon: '💪' },
            { key: 'wisdom',  label: 'Sabedoria',  icon: '🧠' },
            { key: 'speed',   label: 'Velocidade', icon: '⚡' },
            { key: 'energy',  label: 'Energia',    icon: '❤️' },
        ].filter(s => mod[s.key] && mod[s.key] !== 0);

        const statsHtml = statRows.length > 0
            ? statRows.map(s => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid #1e293b;">
                    <span style="color:#94a3b8;font-size:11px;">${s.icon} ${s.label}</span>
                    <span style="color:${mod[s.key] > 0 ? '#4ade80' : '#f87171'};font-weight:700;font-size:12px;">
                        ${mod[s.key] > 0 ? '+' : ''}${mod[s.key]}
                    </span>
                </div>`).join('')
            : `<div style="font-size:11px;color:#475569;">Sem bônus de stat.</div>`;

        // Elemento concedido
        const elemGranted = bg.elementGranted || bg.tribalElement?.element;
        const elemHtml = elemGranted ? `
            <div style="padding:8px 12px;border-top:1px solid #1e293b;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#475569;margin-bottom:4px;">Elemento Concedido</div>
                <span style="background:rgba(255,255,255,0.08);border:1px solid #334155;border-radius:6px;padding:3px 10px;font-size:12px;">
                    ${iconMap[elemGranted] || '✨'} ${elemGranted}
                    ${bg.tribalElement ? `<span style="font-size:10px;color:#64748b;">(tribal: ${bg.tribalElement.tribe})</span>` : ''}
                </span>
            </div>` : '';

        // Raridade
        const rarityIcon = bg.rarity === 'Ultra Rare' ? '💎' : bg.rarity === 'Super Rare' ? '🔷' : bg.rarity === 'Rare' ? '🔶' : bg.rarity === 'Uncommon' ? '🔹' : '⚪';

        tip.innerHTML = `
            <!-- Header -->
            <div style="padding:10px 12px 8px;background:linear-gradient(135deg,rgba(251,191,36,0.12),transparent);border-bottom:1px solid rgba(251,191,36,0.2);">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                    <div>
                        <div style="font-size:13px;font-weight:900;color:#fbbf24;line-height:1.1;">🗡️ ${bg.name}</div>
                        <div style="font-size:10px;color:#64748b;margin-top:2px;">Battlegear · ${bg.rarity || 'Common'}</div>
                    </div>
                    <span style="font-size:18px;">${rarityIcon}</span>
                </div>
            </div>

            ${bg.image && !bg.image.includes('placeholder.jpg') ? `
            <div style="width:100%; height:120px; border-bottom:1px solid #1e293b; overflow:hidden;">
                <img src="${bg.image}" style="width:100%; height:100%; object-fit:cover; object-position:center top;" alt="${bg.name}">
            </div>` : ''}

            <!-- Descrição -->
            ${bg.description ? `
            <div style="padding:8px 12px;border-bottom:1px solid #1e293b;">
                <div style="font-size:11px;color:#cbd5e1;line-height:1.5;">${bg.description}</div>
            </div>` : ''}

            <!-- Bônus de stats -->
            <div style="padding:8px 12px;border-bottom:1px solid #1e293b;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#475569;margin-bottom:6px;">Bônus de Stats</div>
                ${statsHtml}
            </div>

            ${elemHtml}

            <!-- Equipado em -->
            <div style="padding:6px 12px;">
                <div style="font-size:10px;color:#475569;">Equipado em: <span style="color:#f1f5f9;font-weight:600;">${card.name}</span></div>
            </div>
        `;

        tip.style.visibility = 'visible';
        tip.style.opacity    = '1';
        this._positionTooltip(event, tip);
    },

    // ── Tooltip de Criatura no Board ─────────────────────────────────────────

    _showCreatureTooltip(event, player, r, c) {
        const board = player === 1 ? this.boardP1 : this.boardP2;
        if (!board || !board[r]) return;
        const card = board[r][c];
        if (!card) return;

        const tip = document.getElementById('creature-tooltip');
        if (!tip) return;

        // Cores por tribo
        const tribeColors = {
            OverWorld: '#0ea5e9', UnderWorld: '#dc2626',
            Mipedian: '#d97706', Danian: '#16a34a',
            "M'arrillian": '#0f766e', Generic: '#64748b'
        };
        const tc = tribeColors[card.tribe] || '#64748b';

        const rarityIcon = card.rarity === 'Ultra Rare' ? '💎' : card.rarity === 'Super Rare' ? '🔷' : card.rarity === 'Rare' ? '🔶' : card.rarity === 'Uncommon' ? '🔹' : '⚪';

        // Stats reais (com sinergia + battlegear se revelado)
        const syn = this.getSynergyBonus ? this.getSynergyBonus(player, r, c) : null;
        const mod = (card.bgRevealed && card.battlegear?.modifiers) ? card.battlegear.modifiers : {};

        const courage  = card.courage  + (syn?.courage  || 0) + (mod.courage  || 0);
        const power    = card.power    + (syn?.power    || 0) + (mod.power    || 0);
        const wisdom   = card.wisdom   + (syn?.wisdom   || 0) + (mod.wisdom   || 0);
        const speed    = card.speed    + (syn?.speed    || 0) + (mod.speed    || 0);
        const hpCur    = Math.max(0, card.energy);
        const hpMax    = card.maxEnergy || card.energy;
        const hpPct    = hpMax > 0 ? hpCur / hpMax : 1;
        const hpColor  = hpPct > 0.5 ? '#22c55e' : hpPct > 0.2 ? '#fbbf24' : '#ef4444';

        // Elementos (nativos + battlegear)
        const iconMap = { Fire:'🔥', Water:'💧', Earth:'🪨', Air:'🌪️' };
        const allElems = new Set([
            ...(card.elements || []),
            ...(card.bgRevealed && card.battlegear?.elementGranted ? [card.battlegear.elementGranted] : [])
        ]);
        const elemHtml = [...allElems].map(el =>
            `<span style="background:rgba(0,0,0,0.5);border:1px solid #475569;border-radius:6px;padding:2px 7px;font-size:11px;">${iconMap[el] || '✨'} ${el}</span>`
        ).join('');

        // Passivas
        const passives = [];
        if (card.abilities) {
            for (const [k, v] of Object.entries(card.abilities)) {
                if (!v) continue;
                const labels = {
                    brave: '🛡️ Brave', intimidate: '😨 Intimidate',
                    swift: `⚡ Swift ${v}`, tough: `🪨 Tough ${v}`,
                    reckless: '⚔️ Reckless', range: '🏹 Range',
                    invisibility: '👻 Invisibility', initiative: `🎯 Initiative: ${v}`,
                    elementproof_fire: '🔥 Fireproof', elementproof_water: '💧 Waterproof',
                    elementproof_earth: '🪨 Earthproof', elementproof_air: '🌪️ Airproof',
                };
                if (labels[k.toLowerCase()]) passives.push(labels[k.toLowerCase()]);
            }
        }

        // Battlegear
        let bgHtml = '';
        if (card.battlegear) {
            const bgLabel = card.bgRevealed
                ? `<span style="color:#94a3b8;">${card.battlegear.name}</span>${card.battlegear.description ? `<br><span style="font-size:10px;color:#64748b;">${card.battlegear.description}</span>` : ''}`
                : `<span style="color:#475569;">🔒 Face Down</span>`;
            bgHtml = `
            <div style="padding:8px 12px;border-top:1px solid #1e293b;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#475569;margin-bottom:4px;">🗡️ Battlegear</div>
                <div style="font-size:11px;">${bgLabel}</div>
            </div>`;
        }

        // Counters de mugic
        const mc = card.mugicCounters || 0;

        tip.innerHTML = `
            <!-- Header tribo -->
            <div style="padding:10px 12px 8px;background:linear-gradient(135deg,${tc}20,transparent);border-bottom:1px solid ${tc}30;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                    <div>
                        <div style="font-size:14px;font-weight:900;color:#f1f5f9;line-height:1.1;">${card.name}</div>
                        <div style="font-size:10px;color:${tc};font-weight:700;margin-top:2px;">${card.tribe}</div>
                    </div>
                    <span style="font-size:20px;" title="${card.rarity||''}">${rarityIcon}</span>
                </div>
            </div>

            <!-- Imagem pequena + HP bar -->
            ${card.image ? `
            <div style="position:relative;height:80px;overflow:hidden;">
                <img src="${card.image}" style="width:100%;height:100%;object-fit:cover;object-position:top;filter:brightness(0.85);" alt="${card.name}">
                <div style="position:absolute;bottom:0;left:0;right:0;padding:4px 8px;background:linear-gradient(transparent,rgba(0,0,0,0.85));">
                    <div style="height:6px;border-radius:3px;background:#1e293b;overflow:hidden;">
                        <div style="width:${Math.round(hpPct*100)}%;height:100%;background:${hpColor};border-radius:3px;transition:width .3s;"></div>
                    </div>
                    <div style="font-size:10px;color:${hpColor};font-weight:700;margin-top:2px;">❤️ ${hpCur} / ${hpMax}${mc > 0 ? ` &nbsp;♪ ${mc}` : ''}</div>
                </div>
            </div>` : `
            <div style="padding:6px 12px;">
                <div style="height:6px;border-radius:3px;background:#1e293b;overflow:hidden;">
                    <div style="width:${Math.round(hpPct*100)}%;height:100%;background:${hpColor};border-radius:3px;"></div>
                </div>
                <div style="font-size:10px;color:${hpColor};font-weight:700;margin-top:2px;">❤️ ${hpCur} / ${hpMax}</div>
            </div>`}

            <!-- Stats -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:8px 12px;border-top:1px solid #1e293b;">
                ${[
                    {icon:'⚔️', label:'COR', val:courage, base:card.courage},
                    {icon:'💪', label:'POD', val:power,   base:card.power},
                    {icon:'🧠', label:'SAB', val:wisdom,  base:card.wisdom},
                    {icon:'⚡', label:'VEL', val:speed,   base:card.speed},
                ].map(s => `
                    <div style="text-align:center;background:#1e293b;border-radius:6px;padding:4px 2px;">
                        <div style="font-size:11px;">${s.icon}</div>
                        <div style="font-size:9px;color:#64748b;letter-spacing:.04em;">${s.label}</div>
                        <div style="font-size:13px;font-weight:800;color:${s.val > s.base ? '#3b82f6' : '#f1f5f9'};">${s.val}</div>
                    </div>`).join('')}
            </div>

            <!-- Elementos -->
            ${allElems.size > 0 ? `
            <div style="padding:0 12px 8px;display:flex;gap:4px;flex-wrap:wrap;">
                ${elemHtml}
            </div>` : ''}

            <!-- Passivas -->
            ${passives.length > 0 ? `
            <div style="padding:6px 12px;border-top:1px solid #1e293b;display:flex;gap:4px;flex-wrap:wrap;">
                ${passives.map(p => `<span style="background:#1e293b;border:1px solid #334155;border-radius:6px;padding:2px 7px;font-size:10px;color:#94a3b8;">${p}</span>`).join('')}
            </div>` : ''}

            ${bgHtml}

            <!-- Sinergia -->
            ${syn ? `
            <div style="padding:6px 12px;border-top:1px solid #1e293b;">
                <div style="font-size:10px;color:#3b82f6;">⚡ Sinergia: ${syn.description}</div>
            </div>` : ''}
        `;

        tip.style.visibility = 'visible';
        tip.style.opacity    = '1';
        this._moveCreatureTooltip(event);
    },

    _moveCreatureTooltip(event) {
        const tip = document.getElementById('creature-tooltip');
        if (!tip || tip.style.opacity === '0') return;
        const margin = 16;
        const tw = tip.offsetWidth  || 280;
        const th = tip.offsetHeight || 300;
        let x = event.clientX + margin;
        let y = event.clientY - th / 2;
        if (x + tw > window.innerWidth  - 8) x = event.clientX - tw - margin;
        if (y < 8)                           y = 8;
        if (y + th > window.innerHeight - 8) y = window.innerHeight - th - 8;
        tip.style.left = x + 'px';
        tip.style.top  = y + 'px';
    },

    _hideCreatureTooltip() {
        const tip = document.getElementById('creature-tooltip');
        if (tip) { tip.style.opacity = '0'; tip.style.visibility = 'hidden'; }
    },

    // ── Drag & Drop de criaturas no board ────────────────────────────────────

    _onCardDragStart(event, player, r, c) {
        // Guarda origem no dataTransfer e no estado interno
        this._dragOrigin = { player, r, c };
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', `${player},${r},${c}`);

        // Seleciona a carta como atacante para aproveitar isValidMove
        this.selectedAttacker = { player, r, c };
        this.gameState = 'SELECT_TARGET';

        // Visual: semitransparente enquanto arrasta
        const el = event.currentTarget;
        setTimeout(() => { if (el) el.style.opacity = '0.4'; }, 0);

        this.renderBoard();
    },

    _onCardDragEnd(event) {
        // Restaura opacidade
        const el = event.currentTarget;
        if (el) el.style.opacity = '';

        // Remove highlights de drop dos slots
        document.querySelectorAll('.board-slot-empty').forEach(s => {
            s.classList.remove('drag-over-valid', 'drag-over-invalid');
        });

        // Se não houve drop válido, cancela seleção
        if (this.gameState === 'SELECT_TARGET' && this._dragOrigin) {
            this.selectedAttacker = null;
            this.gameState = 'IDLE';
            this._dragOrigin = null;
            this.renderBoard();
        }
    },

    _onSlotDragOver(event, player, r, c) {
        event.preventDefault();
        const origin = this._dragOrigin;
        if (!origin) return;

        const valid = this.isValidMove(origin.r, origin.c, r, c);
        event.dataTransfer.dropEffect = valid ? 'move' : 'none';

        // Feedback visual no slot
        const el = event.currentTarget;
        el.classList.remove('drag-over-valid', 'drag-over-invalid');
        el.classList.add(valid ? 'drag-over-valid' : 'drag-over-invalid');
    },

    _onSlotDragLeave(event) {
        event.currentTarget.classList.remove('drag-over-valid', 'drag-over-invalid');
    },

    _onSlotDrop(event, player, r, c) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over-valid', 'drag-over-invalid');

        const origin = this._dragOrigin;
        if (!origin) return;

        const myPlayer = this.multiplayerMode ? this.myPlayerNumber : 1;

        if (this.isValidMove(origin.r, origin.c, r, c)) {
            this.resolveMove(myPlayer, origin.r, origin.c, r, c);
        } else {
            this.log('⚠️ Movimento inválido — só é possível mover para espaços adjacentes vazios.');
            this.selectedAttacker = null;
            this.gameState = 'IDLE';
            this.renderBoard();
        }
        this._dragOrigin = null;
    },

    // ── Notificação de burst no título da aba ────────────────────────────────

    _startTabFlash(message) {
        this._stopTabFlash(); // limpa qualquer flash anterior
        const original = 'Chaotic Lite';
        let visible = true;
        document.title = `🔔 ${message} — ${original}`;
        this._tabFlashInterval = setInterval(() => {
            visible = !visible;
            document.title = visible ? `🔔 ${message} — ${original}` : original;
        }, 900);

        // Para automaticamente após 30s (segurança caso closeBurstModal não seja chamado)
        this._tabFlashTimeout = setTimeout(() => this._stopTabFlash(), 30000);
    },

    _stopTabFlash() {
        if (this._tabFlashInterval) {
            clearInterval(this._tabFlashInterval);
            this._tabFlashInterval = null;
        }
        if (this._tabFlashTimeout) {
            clearTimeout(this._tabFlashTimeout);
            this._tabFlashTimeout = null;
        }
        document.title = 'Chaotic Lite';
    },

    // ── Animação de Morte (explode em pedaços) ───────────────────────────────

    _playDeathAnimation(player, r, c) {
        return new Promise(resolve => {
            const el = document.querySelector(`[data-pos="p${player}-${r}-${c}"]`);
            if (!el) { resolve(); return; }

            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width  / 2;
            const cy = rect.top  + rect.height / 2;
            const w  = rect.width;
            const h  = rect.height;

            // ── 1. Flash branco de impacto ────────────────────────────────────
            el.style.transition = 'filter 0.08s ease-out, transform 0.08s ease-out';
            el.style.filter     = 'brightness(4) saturate(0) contrast(2)';
            el.style.transform  = 'scale(1.06)';

            // ── 2. Fragmentos voando ─────────────────────────────────────────
            const container = document.createElement('div');
            container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99997;overflow:visible;';
            document.body.appendChild(container);

            // Captura a imagem do card para usar como fundo dos fragmentos
            const cardImg = el.querySelector('img.card-image');
            const imgSrc  = cardImg ? cardImg.src : null;

            // Gera fragmentos em grade 4×5 (20 pedaços)
            const COLS = 4, ROWS = 5;
            const fw = w / COLS, fh = h / ROWS;

            for (let row = 0; row < ROWS; row++) {
                for (let col = 0; col < COLS; col++) {
                    const frag = document.createElement('div');

                    // Posição inicial do fragmento = posição na grade do card
                    const fx = rect.left + col * fw;
                    const fy = rect.top  + row * fh;

                    // Direção de explosão: radial a partir do centro
                    const dx = (fx + fw/2) - cx;
                    const dy = (fy + fh/2) - cy;
                    const dist = 80 + Math.random() * 120;
                    const norm = Math.sqrt(dx*dx + dy*dy) || 1;
                    const tx = (dx / norm) * dist + (Math.random() - 0.5) * 60;
                    const ty = (dy / norm) * dist + (Math.random() - 0.5) * 60 + 30; // gravidade
                    const rot = (Math.random() - 0.5) * 540;
                    const dur = 420 + Math.random() * 220;
                    const delay = Math.random() * 60;

                    frag.style.cssText = `
                        position:fixed;
                        left:${fx}px; top:${fy}px;
                        width:${fw + 1}px; height:${fh + 1}px;
                        overflow:hidden;
                        border-radius:2px;
                        box-shadow:0 2px 8px rgba(0,0,0,0.6);
                        will-change:transform,opacity;
                        transition: transform ${dur}ms cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms,
                                    opacity  ${dur * 0.7}ms ease-in ${delay + dur * 0.3}ms;
                    `;

                    // Fundo: recorte da imagem do card OU cor sólida fallback
                    if (imgSrc) {
                        frag.style.backgroundImage  = `url('${imgSrc}')`;
                        frag.style.backgroundSize   = `${w}px ${h}px`;
                        frag.style.backgroundPosition = `-${col * fw}px -${row * fh}px`;
                        frag.style.backgroundRepeat = 'no-repeat';
                    } else {
                        const colors = ['#1e293b','#334155','#475569','#0f172a'];
                        frag.style.background = colors[Math.floor(Math.random() * colors.length)];
                    }

                    container.appendChild(frag);

                    // Dispara animação após paint
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        frag.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(0.15)`;
                        frag.style.opacity   = '0';
                    }));
                }
            }

            // ── 3. Some o card original ──────────────────────────────────────
            setTimeout(() => {
                el.style.transition = 'transform 0.15s ease-in, opacity 0.15s ease-in';
                el.style.transform  = 'scale(0.85)';
                el.style.opacity    = '0';
            }, 60);

            // ── 4. Limpa e resolve ───────────────────────────────────────────
            setTimeout(() => {
                container.remove();
                resolve();
            }, 680);
        });
    },

    // ── Animação de Ataque (salto do atacante) ───────────────────────────────

    /**
     * O atacante "salta" na direção do defensor e volta.
     * Retorna uma Promise que resolve após a animação terminar.
     */
    _playAttackAnimation(attackerCard, attackingPlayer, atkR, atkC) {
        return new Promise(resolve => {
            // Aguarda 2 frames para garantir que o modal fechou e o board está visível
            requestAnimationFrame(() => requestAnimationFrame(() => {

                const board = document.getElementById('board');
                if (!board) { resolve(); return; }

                // Encontra o elemento do atacante pela posição exata (data-pos),
                // evitando ambiguidade quando há criaturas com o mesmo nome no board
                let atkEl = null;
                if (atkR !== undefined && atkC !== undefined) {
                    atkEl = board.querySelector(`[data-pos="p${attackingPlayer}-${atkR}-${atkC}"]`);
                }
                // Fallback: busca por nome (compatibilidade com chamadas sem posição)
                if (!atkEl) {
                    const allCards = board.querySelectorAll('.card');
                    for (const el of allCards) {
                        const nameEl = el.querySelector('.card-name');
                        if (nameEl && nameEl.textContent.trim().startsWith(attackerCard.name)) {
                            atkEl = el; break;
                        }
                    }
                }
                if (!atkEl) { resolve(); return; }

                // Direção: P1 (esquerda) → direita; P2 (direita) → esquerda
                const jumpX = attackingPlayer === 1 ? 42 : -42;

                // Libera overflow de todos os pais para o salto não ser cortado
                const parents = [];
                let node = atkEl.parentElement;
                while (node && node !== document.body) {
                    const ov = getComputedStyle(node).overflow;
                    if (ov !== 'visible') {
                        parents.push({ el: node, ov: node.style.overflow });
                        node.style.overflow = 'visible';
                    }
                    node = node.parentElement;
                }
                atkEl.style.position = 'relative';
                atkEl.style.zIndex   = '9999';

                // ── Fase 1: salto para frente ────────────────────────────────
                atkEl.style.transition = 'transform 0.18s cubic-bezier(0.55,0,1,0.45)';
                atkEl.style.transform  = `translateX(${jumpX}px) scale(1.1) rotate(${attackingPlayer === 1 ? 3 : -3}deg)`;

                setTimeout(() => {
                    // ── Fase 2: volta com mola ───────────────────────────────
                    atkEl.style.transition = 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1)';
                    atkEl.style.transform  = 'translateX(0) scale(1) rotate(0deg)';

                    // Flash dourado de impacto
                    const flash = document.createElement('div');
                    flash.style.cssText = `
                        position:absolute; inset:0; border-radius:14px; pointer-events:none; z-index:100;
                        background: radial-gradient(circle at 60%, rgba(251,191,36,0.7) 0%, rgba(251,191,36,0) 65%);
                        animation: attackFlash 0.45s ease-out forwards;
                    `;
                    atkEl.appendChild(flash);
                    setTimeout(() => flash.remove(), 460);

                    // ── Restaura tudo e resolve ──────────────────────────────
                    setTimeout(() => {
                        atkEl.style.transition = '';
                        atkEl.style.transform  = '';
                        atkEl.style.zIndex     = '';
                        parents.forEach(({ el, ov }) => el.style.overflow = ov || '');
                        resolve();
                    }, 300);
                }, 190);

            })); // double rAF
        });
    },

    // ── Animação de entrada das cartas no tabuleiro ──────────────────────────

    /**
     * Quando o tabuleiro é renderizado pela primeira vez, anima cada carta
     * "caindo" em posição com delay escalonado (stagger).
     */
    _playBoardEntryAnimation() {
        requestAnimationFrame(() => {
            const board = document.getElementById('board');
            if (!board) return;
            const cards = board.querySelectorAll('.card');
            cards.forEach((card, i) => {
                card.style.opacity    = '0';
                card.style.transform  = 'translateY(-30px) scale(0.9)';
                card.style.transition = 'none';
                setTimeout(() => {
                    card.style.transition = 'opacity 0.35s ease-out, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
                    card.style.opacity    = '';
                    card.style.transform  = '';
                }, 60 + i * 80); // 80ms de stagger entre cada carta
            });
        });
    },

    // ── Floating Damage Numbers ───────────────────────────────────────────────

    /**
     * Exibe número flutuante (+20 verde / -35 vermelho) sobre uma carta no tabuleiro.
     * @param {object} card   - objeto da carta (precisa de card.name e card.player)
     * @param {number} value  - valor do dano (positivo) ou cura (positivo também)
     * @param {'damage'|'heal'|'reckless'} type
     */
    _spawnFloatingNumber(card, value, type) {
        if (!card || value === 0) return;

        // Encontra o elemento da carta no DOM pelo nome
        const board = document.getElementById('board');
        if (!board) return;

        // Procura o card pelo data-card-name ou pelo texto do nome
        const allCards = board.querySelectorAll('.card');
        let cardEl = null;
        for (const el of allCards) {
            const nameEl = el.querySelector('.card-name');
            if (nameEl && nameEl.textContent.trim().startsWith(card.name)) {
                cardEl = el;
                break;
            }
        }
        if (!cardEl) return;

        const configs = {
            damage:   { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   prefix: '-', icon: '💥' },
            heal:     { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   prefix: '+', icon: '💚' },
            reckless: { color: '#f97316', bg: 'rgba(249,115,22,0.15)', prefix: '-', icon: '💢' },
            mugic:    { color: '#a855f7', bg: 'rgba(168,85,247,0.15)', prefix: '-', icon: '🎵' },
            drain:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', prefix: '-', icon: '📉' },
            buff:     { color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', prefix: '+', icon: '⬆️' },
            location: { color: '#fb923c', bg: 'rgba(251,146,60,0.15)', prefix: '-', icon: '📍' },
            sacrifice: { color: '#e879f9', bg: 'rgba(232,121,249,0.15)', prefix: '', icon: '⚔️' },
        };
        const cfg = configs[type] || configs.damage;

        const el = document.createElement('div');
        el.className = `floating-number${value >= 30 ? ' big' : ''}`;
        el.innerHTML = `${cfg.icon} <span>${cfg.prefix}${value}</span>`;
        el.style.cssText = `
            position: absolute;
            top: 30%;
            left: 50%;
            transform: translateX(-50%);
            color: ${cfg.color};
            background: ${cfg.bg};
            border: 1px solid ${cfg.color}60;
            border-radius: 20px;
            padding: 4px 12px;
            font-size: 18px;
            font-weight: 900;
            white-space: nowrap;
            pointer-events: none;
            z-index: 9999;
            animation: floatUp 1.4s ease-out forwards;
            text-shadow: 0 1px 4px rgba(0,0,0,0.8);
        `;

        // O card precisa de position:relative (já tem)
        cardEl.style.overflow = 'visible';
        cardEl.appendChild(el);
        setTimeout(() => el.remove(), 1400);
    },

    // ── Minimizar / Restaurar Modais ─────────────────────────────────────────

    /**
     * Minimiza um modal para uma pílula flutuante na base da tela.
     * @param {string} modalId  - id do elemento modal
     * @param {string} label    - texto da pílula (ex: "⚔️ Seleção de Ataque")
     */
    minimizeModal(modalId, label) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Esconde o modal (sem remover flex-modal, para restaurar depois)
        modal.classList.add('modal-minimized');

        // Cria a pílula flutuante
        const tray = document.getElementById('minimized-modals');
        if (!tray) return;

        // Evita duplicatas
        if (tray.querySelector(`[data-modal="${modalId}"]`)) return;

        const pill = document.createElement('button');
        pill.className = 'modal-pill';
        pill.setAttribute('data-modal', modalId);
        pill.innerHTML = `${label} <span class="modal-pill-restore">▲ Restaurar</span>`;
        pill.style.pointerEvents = 'auto';
        pill.onclick = () => this.restoreModal(modalId);
        tray.appendChild(pill);

        // Animação de entrada
        requestAnimationFrame(() => pill.classList.add('modal-pill-visible'));
    },

    /**
     * Restaura um modal minimizado para sua posição original.
     * @param {string} modalId
     */
    restoreModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('modal-minimized');

        // Remove pílula
        const tray = document.getElementById('minimized-modals');
        const pill = tray && tray.querySelector(`[data-modal="${modalId}"]`);
        if (pill) {
            pill.classList.remove('modal-pill-visible');
            setTimeout(() => pill.remove(), 250);
        }

        // Scroll suave de volta ao modal
        setTimeout(() => {
            if (modal) modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
    },

    // ── Visualizador de Descarte ─────────────────────────────────────────────
    openDiscardViewer() {
        const modal = document.getElementById('discard-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('flex-modal');
        this._discardTab('crit1');
    },

    _discardTab(tab) {
        // Atualiza tabs
        ['crit1','crit2','mug1','mug2'].forEach(t => {
            const el = document.getElementById(`dtab-${t}`);
            if (el) el.className = 'dtab' + (t === tab ? ' dtab-active' : '');
        });

        const content = document.getElementById('discard-content');
        if (!content) return;

        const tribeColor = { OverWorld:'#0ea5e9', UnderWorld:'#dc2626', Mipedian:'#d97706', Danian:'#9333ea', Generic:'#6b7280' };
        const rarityIcon = { 'Ultra Rare':'💎', 'Super Rare':'🔷', 'Rare':'🔶', 'Uncommon':'🔹', 'Common':'⚪' };

        if (tab === 'crit1' || tab === 'crit2') {
            const pile = tab === 'crit1' ? (this.p1CreatureDiscard || []) : (this.p2CreatureDiscard || []);
            const label = tab === 'crit1' ? 'Suas criaturas derrotadas' : 'Criaturas da IA derrotadas';
            if (pile.length === 0) {
                content.innerHTML = `<div style="text-align:center;color:#64748b;padding:40px;">Nenhuma criatura no descarte ainda.</div>`;
                return;
            }
            content.innerHTML = `
                <div style="font-size:11px;color:#64748b;margin-bottom:10px;text-align:center;">${label} — ${pile.length} criatura(s)</div>
                <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
                    ${pile.map(c => {
                        const tc = tribeColor[c.tribe] || '#6b7280';
                        const ri = rarityIcon[c.rarity] || '⚪';
                        const elIcons = (c.elements||[]).map(e => ({Fire:'🔥',Water:'💧',Earth:'🪨',Air:'🌪️'}[e]||'✨')).join('');
                        return `<div style="background:#1e293b;border:1px solid ${tc};border-radius:10px;padding:10px 12px;width:140px;text-align:center;">
                            <div style="font-size:10px;color:${tc};font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">${c.tribe}</div>
                            <div style="font-weight:bold;color:#f1c40f;margin:4px 0;font-size:13px;">${ri} ${c.name}</div>
                            ${c.image ? `<img src="${c.image}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin:4px 0;opacity:0.7;filter:grayscale(60%);">` : ''}
                            <div style="font-size:10px;color:#94a3b8;margin-top:4px;">
                                ⚔️${c.courage} 💪${c.power} 🧠${c.wisdom} ⚡${c.speed}
                            </div>
                            <div style="font-size:11px;color:#dc2626;font-weight:bold;">❤️ ${c.maxEnergy || c.energy}</div>
                            ${elIcons ? `<div style="font-size:14px;margin-top:3px;">${elIcons}</div>` : ''}
                        </div>`;
                    }).join('')}
                </div>`;
        } else {
            const pile = tab === 'mug1' ? (this.p1MugicDiscard || []) : (this.p2MugicDiscard || []);
            const label = tab === 'mug1' ? 'Suas Mugics usadas' : 'Mugics da IA usadas';
            if (pile.length === 0) {
                content.innerHTML = `<div style="text-align:center;color:#64748b;padding:40px;">Nenhuma Mugic no descarte ainda.</div>`;
                return;
            }
            content.innerHTML = `
                <div style="font-size:11px;color:#64748b;margin-bottom:10px;text-align:center;">${label} — ${pile.length} Mugic(s)</div>
                <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
                    ${pile.map(mg => {
                        const tc = tribeColor[mg.tribe] || '#6b7280';
                        const ri = rarityIcon[mg.rarity] || '⚪';
                        return `<div style="background:#1e293b;border:1px solid ${tc};border-radius:10px;padding:10px 12px;width:160px;text-align:center;">
                            <div style="font-size:10px;color:${tc};font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">${mg.tribe}</div>
                            <div style="font-weight:bold;color:#c084fc;margin:4px 0;font-size:13px;">${ri} ${mg.name}</div>
                            <div style="font-size:10px;color:#f59e0b;">Custo: ${mg.cost} ♪</div>
                            <div style="font-size:10px;color:#94a3b8;margin-top:5px;line-height:1.4;">${mg.description}</div>
                        </div>`;
                    }).join('')}
                </div>`;
        }
    },

    // ── Banner do Local Ativo no modal de ataque ─────────────────────────────
    _buildLocationBannerHtml(attacker, defender) {
        const loc = this.activeLocation;
        if (!loc) return '';

        const ef = loc.effect;
        const elemIcons = { Fire:'🔥', Water:'💧', Earth:'🪨', Air:'🌪️' };
        const lines = [];

        if (ef) {
            switch (ef.type) {
                case 'elemental_modifiers': {
                    const atkEls = attacker.elements || [];
                    const defEls = defender.elements  || [];
                    Object.entries(ef.bonuses || {}).forEach(([el, val]) => {
                        const icon = elemIcons[el] || '✨';
                        const hasIt = atkEls.includes(el);
                        lines.push({ ok: hasIt, text: `${icon} ${el}: +${val} dano (você ${hasIt ? '✅ tem' : '❌ não tem'})` });
                    });
                    Object.entries(ef.penalties || {}).forEach(([el, val]) => {
                        const icon = elemIcons[el] || '✨';
                        lines.push({ ok: null, text: `${icon} ${el}: −${val} dano (penalidade)` });
                    });
                    break;
                }
                case 'first_attack_tribe_bonus':
                    if (this.activeCombat && this.activeCombat.isFirstAttack) {
                        const hasIt = attacker.tribe === ef.tribe;
                        lines.push({ ok: hasIt, text: `🏆 Primeiro ataque ${ef.tribe}: +${ef.value} dano (você ${hasIt ? '✅' : '❌'})` });
                    }
                    break;
                case 'first_attack_element_bonus':
                    if (this.activeCombat && this.activeCombat.isFirstAttack) {
                        const hasIt = (attacker.elements||[]).includes(ef.element);
                        lines.push({ ok: hasIt, text: `${elemIcons[ef.element]||'✨'} Primeiro ataque com ${ef.element}: +${ef.value} dano (você ${hasIt ? '✅' : '❌'})` });
                    }
                    break;
                case 'first_attack_zero_if_lower_speed':
                    if (this.activeCombat && this.activeCombat.isFirstAttack) {
                        lines.push({ ok: null, text: `⚡ Primeiro ataque: 0 dano se sua Speed for menor que a do defensor` });
                    }
                    break;
                case 'heal_on_water_attack': {
                    const hasW = (attacker.elements||[]).includes('Water');
                    lines.push({ ok: hasW, text: `💧 Ataque de Água: cura ${ef.value} do atacante (você ${hasW ? '✅ tem Água' : '❌ sem Água'})` });
                    break;
                }
                case 'no_mugic':
                    lines.push({ ok: false, text: `🚫 Mugics bloqueadas neste local!` });
                    break;
                case 'no_tribal_mugic':
                    lines.push({ ok: null, text: `⚠️ Apenas Mugics Genéricas permitidas` });
                    break;
                case 'extra_mugic_cost_tribe':
                    lines.push({ ok: null, text: `♪ Mugics ${ef.tribe} custam +${ef.value} contador extra` });
                    break;
                case 'underworld_city_bonus': {
                    const isUW = attacker.tribe === 'UnderWorld';
                    lines.push({ ok: isUW, text: `🏙️ UnderWorld com Power 15+ maior: +5 dano (você ${isUW ? '✅' : '❌'})` });
                    break;
                }
                default:
                    lines.push({ ok: null, text: `✨ ${loc.description}` });
            }
        }

        if (lines.length === 0) {
            lines.push({ ok: null, text: loc.description });
        }

        const linesHtml = lines.map(l => {
            const col = l.ok === true ? '#2ecc71' : l.ok === false ? '#e74c3c' : '#f39c12';
            return `<span style="color:${col}; font-size:11px;">${l.text}</span>`;
        }).join('<br>');

        return `
            <div id="loc-banner-attack" style="
                margin-top: 14px;
                background: rgba(7,89,133,0.25);
                border: 1px solid #38bdf8;
                border-radius: 10px;
                padding: 10px 16px;
                text-align: center;
                max-width: 500px;
                width: 100%;
            ">
                <div style="font-size:11px; color:#38bdf8; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px;">
                    📍 Local: <strong>${loc.name}</strong>
                </div>
                <div style="display:flex; flex-direction:column; gap:3px; align-items:center;">
                    ${linesHtml}
                </div>
            </div>`;
    },

    // ── Animação de morte com sangue ──────────────────────────────────────────
    _spawnBloodDrops(cardEl) {
        if (!cardEl) return;

        // Garante position:relative no card para os filhos ficarem relativos a ele
        cardEl.style.overflow = 'visible';

        // Poça de sangue no fundo
        const pool = document.createElement('div');
        pool.className = 'blood-pool';
        cardEl.appendChild(pool);

        // 10 gotículas em direções aleatórias
        const dropCount = 10;
        for (let i = 0; i < dropCount; i++) {
            const drop = document.createElement('div');
            drop.className = 'blood-drop';

            // Tamanho aleatório (6px - 18px)
            const size = 6 + Math.random() * 12;
            drop.style.width  = size + 'px';
            drop.style.height = size * 1.3 + 'px';

            // Posição de origem: centro do card (com variação)
            drop.style.left = (30 + Math.random() * 40) + '%';
            drop.style.top  = (20 + Math.random() * 40) + '%';

            // Vetor de voo: espalhado em todas as direções, mais para baixo (gravidade)
            const angle  = (Math.random() * 360) * (Math.PI / 180);
            const dist   = 40 + Math.random() * 80;
            const dx     = Math.cos(angle) * dist;
            const dy     = Math.sin(angle) * dist + 30; // +30 de gravidade
            const rot    = (-180 + Math.random() * 360) + 'deg';
            const dur    = (0.55 + Math.random() * 0.5).toFixed(2) + 's';
            const delay  = (Math.random() * 0.18).toFixed(2) + 's';

            drop.style.setProperty('--dx',    dx.toFixed(1) + 'px');
            drop.style.setProperty('--dy',    dy.toFixed(1) + 'px');
            drop.style.setProperty('--rot',   rot);
            drop.style.setProperty('--dur',   dur);
            drop.style.setProperty('--delay', delay);

            cardEl.appendChild(drop);
        }

        // Remove os filhos depois da animação terminar (1.4s)
        setTimeout(() => {
            cardEl.querySelectorAll('.blood-drop, .blood-pool').forEach(el => el.remove());
        }, 1400);
    },

    showLocationToast(location, isNew = false) {
        const old = document.getElementById('location-toast');
        if (old) old.remove();

        const initIcon = { courage:'⚔️', power:'💪', wisdom:'🧠', speed:'⚡' };
        const initLabel = { courage:'Coragem', power:'Poder', wisdom:'Sabedoria', speed:'Velocidade' };
        const icon = initIcon[location.initiative] || '🗺️';
        const statName = initLabel[location.initiative] || location.initiative;

        const toast = document.createElement('div');
        toast.id = 'location-toast';
        toast.style.cssText = `
            position: fixed; top: 24px; left: 50%; transform: translateX(-50%) translateY(-20px);
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 2px solid #f1c40f;
            border-radius: 14px; padding: 16px 28px;
            z-index: 8000; text-align: center; color: white;
            box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 20px rgba(241,196,15,0.3);
            max-width: 480px; width: 90%;
            opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: none;
        `;

        toast.innerHTML = `
            <div style="font-size:11px; color:#f1c40f; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px;">
                ${isNew ? '📍 Novo Local Revelado' : '📍 Local de Batalha'}
            </div>
            <div style="font-size:20px; font-weight:bold; color:#fff; margin-bottom:6px;">
                ${location.name}
            </div>
            <div style="font-size:12px; color:#bdc3c7; line-height:1.5; margin-bottom:8px;">
                ${location.description}
            </div>
            <div style="display:inline-block; background:rgba(241,196,15,0.15); border:1px solid rgba(241,196,15,0.4);
                        border-radius:20px; padding:3px 12px; font-size:11px; color:#f1c40f;">
                ${icon} Iniciativa por ${statName}
            </div>
        `;

        document.body.appendChild(toast);

        // Anima entrada
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });

        // Some após 4s
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => toast.remove(), 350);
        }, 4000);
    },

    _showInitiativeBanner(striker, stat) {
        const existing = document.getElementById('initiative-banner');
        if (existing) existing.remove();

        const statNames = { courage: 'Coragem', power: 'Poder', wisdom: 'Sabedoria', speed: 'Velocidade' };
        const statIcons = { courage: '⚔️', power: '💪', wisdom: '🧠', speed: '⚡' };
        const isMe = !this.multiplayerMode
            ? striker === 1
            : striker === this.myPlayerNumber;
        const strikerLabel = this.multiplayerMode
            ? (striker === this.myPlayerNumber ? '⚡ VOCÊ ataca primeiro!' : '🛡️ Oponente ataca primeiro!')
            : (striker === 1 ? '⚡ VOCÊ ataca primeiro!' : '🛡️ Oponente ataca primeiro!');
        const borderColor = isMe ? '#2ecc71' : '#e74c3c';
        const glowColor  = isMe ? 'rgba(46,204,113,0.4)' : 'rgba(231,76,60,0.4)';

        const banner = document.createElement('div');
        banner.id = 'initiative-banner';
        banner.style.cssText = `
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            background: rgba(10,15,25,0.97);
            border: 3px solid ${borderColor};
            border-radius: 16px; padding: 28px 50px;
            z-index: 9999; text-align: center; color: white;
            box-shadow: 0 0 40px ${glowColor};
            animation: initiativePop 0.35s ease forwards;
        `;
        banner.innerHTML = `
            <div style="font-size:13px;color:#bdc3c7;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">⚔️ Combate Iniciado</div>
            <div style="font-size:26px;font-weight:bold;color:${borderColor};margin-bottom:8px;">${strikerLabel}</div>
            <div style="font-size:15px;color:#f1c40f;">${statIcons[stat] || '📊'} Iniciativa por <strong>${statNames[stat] || stat.toUpperCase()}</strong></div>
            ${this.activeLocation ? `<div style="font-size:12px;color:#3498db;margin-top:8px;">📍 ${this.activeLocation.name}</div>` : ''}
        `;

        if (!document.getElementById('initiative-anim-style')) {
            const style = document.createElement('style');
            style.id = 'initiative-anim-style';
            style.textContent = `
                @keyframes initiativePop {
                    from { opacity:0; transform: translate(-50%,-50%) scale(0.7); }
                    to   { opacity:1; transform: translate(-50%,-50%) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(banner);
        setTimeout(() => {
            banner.style.transition = 'opacity 0.4s ease';
            banner.style.opacity = '0';
            setTimeout(() => banner.remove(), 420);
        }, 2100);
    },

    showAlert(title, message) {
        return new Promise(resolve => {
            let modal = document.getElementById("custom-alert-modal");
            if (!modal) {
                modal = document.createElement("div");
                modal.id = "custom-alert-modal";
                modal.className = "modal-overlay";
                modal.innerHTML = `
                    <div style="background: #1e293b; border: 2px solid #f1c40f; border-radius: 12px; padding: 25px; width: 450px; max-width: 90%; color: white; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.8);">
                        <h2 id="custom-alert-title" style="color: #f1c40f; margin-bottom: 15px; font-size: 22px;"></h2>
                        <div id="custom-alert-message" style="font-size: 16px; margin-bottom: 25px; line-height: 1.5; color: #cbd5e1; white-space: pre-line;"></div>
                        <button id="custom-alert-btn" class="btn btn-primary" style="padding: 10px 30px; font-size: 16px;">OK</button>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            document.getElementById("custom-alert-title").innerHTML = title;
            // Remover '✨ MUGIC RESOLVIDA: nome' do inicio da mensagem pois agora tem titulo
            document.getElementById("custom-alert-message").innerHTML = message;

            modal.classList.remove('hidden');
            modal.classList.add('flex-modal');

            const btn = document.getElementById("custom-alert-btn");
            btn.onclick = () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex-modal');
                resolve();
            };
        });
    },

    // ── Histórico de Partida ─────────────────────────────────────────────────

    /** Registra um combate encerrado no histórico da partida */
    _recordMatchHistory(combat, loserCard, winnerCard) {
        if (!this.matchHistory) this.matchHistory = [];

        const dmgBy = {};
        (combat.damageHistory || []).forEach(({ target, damage }) => {
            dmgBy[target] = (dmgBy[target] || 0) + damage;
        });

        const totalDmgOnWinner = dmgBy[winnerCard.name] || 0;
        const totalDmgOnLoser  = dmgBy[loserCard.name]  || 0;

        this.matchHistory.push({
            combatIndex: this.matchHistory.length + 1,
            turn:        this.turn,
            location:    this.activeLocation ? this.activeLocation.name : '—',
            winnerName:  winnerCard.name,
            winnerImg:   winnerCard.image || '',
            winnerTribe: winnerCard.tribe || '',
            winnerDmgTaken: totalDmgOnWinner,
            loserName:   loserCard.name,
            loserImg:    loserCard.image || '',
            loserTribe:  loserCard.tribe || '',
            loserDmgTaken: totalDmgOnLoser,
            rounds:      combat.rounds,
            attacks:     combat.attackHistory  ? [...combat.attackHistory]  : [],
            mugics:      combat.mugicHistory   ? [...combat.mugicHistory]   : [],
            heals:       combat.healHistory    ? [...combat.healHistory]    : [],
        });

        this._updateMatchHistoryPanel();
    },

    /** Atualiza o badge e re-renderiza o painel se estiver aberto */
    _updateMatchHistoryPanel() {
        const badge = document.getElementById('mh-badge');
        if (badge) {
            badge.textContent = this.matchHistory.length;
            badge.style.display = this.matchHistory.length > 0 ? 'inline-block' : 'none';
        }

        // Sempre re-renderiza (painel aberto ou fechado — lista sempre atualizada)
        this._renderMatchHistory();
    },

    /** Abre/fecha o painel lateral */
    toggleMatchHistory() {
        const panel = document.getElementById('match-history-panel');
        if (!panel) return;
        const closed = panel.classList.toggle('mh-closed');
        // Sempre re-renderiza ao abrir para garantir conteúdo atualizado
        if (!closed) this._renderMatchHistory();
        const btn = document.getElementById('mh-toggle-btn');
        if (btn) btn.setAttribute('aria-expanded', String(!closed));
    },

    /** Renderiza o conteúdo do painel */
    _renderMatchHistory() {
        const list = document.getElementById('mh-list');
        if (!list) return;

        if (!this.matchHistory || this.matchHistory.length === 0) {
            list.innerHTML = `<div class="mh-empty">Nenhum combate encerrado ainda.</div>`;
            return;
        }

        const tribeColors = {
            OverWorld: '#0ea5e9', UnderWorld: '#dc2626',
            Mipedian: '#d97706', Danian: '#9333ea', "M'arrillian": '#0f766e'
        };

        list.innerHTML = [...this.matchHistory].reverse().map(entry => {
            const wColor = tribeColors[entry.winnerTribe] || '#64748b';
            const lColor = tribeColors[entry.loserTribe]  || '#64748b';

            // Resumo de mugics
            const mgCount = entry.mugics.length;
            const mgText  = mgCount > 0 ? `🎶 ${mgCount} mugic${mgCount > 1 ? 's' : ''}` : '';

            // Resumo de curas
            const totalHeal = entry.heals.reduce((s, h) => s + (h.amount || 0), 0);
            const healText  = totalHeal > 0 ? `💚 +${totalHeal}` : '';

            return `
            <div class="mh-entry" onclick="game._expandMatchEntry(${entry.combatIndex - 1})">
                <div class="mh-entry-header">
                    <span class="mh-num">#${entry.combatIndex}</span>
                    <span class="mh-location">📍 ${entry.location}</span>
                    <span class="mh-rounds">${entry.rounds} rounds</span>
                </div>
                <div class="mh-fighters">
                    <!-- Vencedor -->
                    <div class="mh-fighter mh-winner">
                        ${entry.winnerImg ? `<img src="${entry.winnerImg}" class="mh-avatar">` : '<div class="mh-avatar-ph"></div>'}
                        <div class="mh-fighter-info">
                            <span class="mh-fighter-name" style="color:${wColor}">${entry.winnerName}</span>
                            <span class="mh-fighter-detail">recebeu 💥${entry.winnerDmgTaken}</span>
                        </div>
                        <span class="mh-crown">🏆</span>
                    </div>
                    <div class="mh-vs">⚔️</div>
                    <!-- Derrotado -->
                    <div class="mh-fighter mh-loser">
                        ${entry.loserImg ? `<img src="${entry.loserImg}" class="mh-avatar mh-dead">` : '<div class="mh-avatar-ph mh-dead"></div>'}
                        <div class="mh-fighter-info">
                            <span class="mh-fighter-name" style="color:${lColor}">${entry.loserName}</span>
                            <span class="mh-fighter-detail">recebeu 💥${entry.loserDmgTaken}</span>
                        </div>
                        <span class="mh-skull">💀</span>
                    </div>
                </div>
                ${(mgText || healText) ? `<div class="mh-extras">${[mgText, healText].filter(Boolean).join('  ·  ')}</div>` : ''}
                <!-- Detalhes colapsáveis -->
                <div id="mh-detail-${entry.combatIndex - 1}" class="mh-detail hidden"></div>
            </div>`;
        }).join('');
    },

    /** Expande/colapsa os detalhes de um combate específico */
    _expandMatchEntry(idx) {
        const detailEl = document.getElementById(`mh-detail-${idx}`);
        if (!detailEl) return;
        const isHidden = detailEl.classList.toggle('hidden');
        if (isHidden) return;

        const entry = this.matchHistory[idx];
        if (!entry) return;

        let html = '<div class="mh-detail-inner">';

        // Linha do tempo de ataques
        if (entry.attacks.length > 0) {
            html += '<div class="mh-detail-section">⚔️ Ataques</div>';
            entry.attacks.forEach(({ round, attacker, attack, totalDamage }) => {
                const col = attacker === entry.winnerName ? '#22c55e' : '#ef4444';
                html += `<div class="mh-detail-row">
                    <span style="color:#475569">#${round}</span>
                    <span style="color:${col};font-weight:600">${attacker}</span>
                    <span style="color:#64748b">→</span>
                    <span style="color:#cbd5e1">${attack}</span>
                    <span style="color:${totalDamage>0?'#fbbf24':'#475569'};margin-left:auto">${totalDamage > 0 ? `💥${totalDamage}` : '—'}</span>
                </div>`;
            });
        }

        // Mugics
        if (entry.mugics.length > 0) {
            html += '<div class="mh-detail-section">🎶 Mugics</div>';
            entry.mugics.forEach(({ player, mugicName }) => {
                html += `<div class="mh-detail-row">
                    <span style="color:#94a3b8">${player}</span>
                    <span style="color:#c4b5fd">${mugicName}</span>
                </div>`;
            });
        }

        // Curas
        if (entry.heals.length > 0) {
            html += '<div class="mh-detail-section">💚 Curas</div>';
            entry.heals.forEach(({ targetName, amount, source }) => {
                html += `<div class="mh-detail-row">
                    <span style="color:#4ade80">+${amount}</span>
                    <span style="color:#94a3b8">${targetName}</span>
                    <span style="color:#475569;font-size:10px">via ${source}</span>
                </div>`;
            });
        }

        html += '</div>';
        detailEl.innerHTML = html;
    },

});
