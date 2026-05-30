// engine-ui.js
Object.assign(GameEngine.prototype, {

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
