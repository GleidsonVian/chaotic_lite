// engine-turn.js
Object.assign(GameEngine.prototype, {

    nextTurn(fromRemote = false) {
        if (this._nextTurnLock) return;
        this._nextTurnLock = true;
        setTimeout(() => { this._nextTurnLock = false; }, 500);

        // Expira flags temporárias de turno em todas as criaturas
        const expireCard = (card) => {
            if (card._invisibility && card._invisibilityTurn !== undefined && card._invisibilityTurn < this.turn) {
                delete card._invisibility;
                delete card._invisibilityTurn;
                this.log(`👁️ ${card.name} não está mais invisível.`);
            }
            delete card._cannotMove;
        };
        this._boardWalk(1, expireCard);
        this._boardWalk(2, expireCard);

        this.selectedAttacker = null;
        this.gameState = 'IDLE';
        this.turn = this.turn === 1 ? 2 : 1;
        if (this._stats) this._stats.turns++;

        this.log(`---------- Turno do Jogador ${this.turn} ----------`);
        this.renderBoard();
        this.renderMugics();

        // Em multiplayer: só envia nextTurn quem estava no turno que acabou
        // (evita que os dois clientes enviem e causem flip duplo)
        if (!fromRemote && this.multiplayerMode) {
            const turnThatJustEnded = this.turn === 1 ? 2 : 1; // turn já virou, então quem mandou era o anterior
            if (turnThatJustEnded === this.myPlayerNumber) {
                this.sendAction('nextTurn');
            }
        }

        if (this.turn === 2) {
            if (!this.multiplayerMode && !this.isSpectator) {
                setTimeout(() => this.aiTurn(), 1000);
            }
        }
    },

    checkWinCondition() {
        const p1Alive = this._countAlive(this.boardP1);
        const p2Alive = this._countAlive(this.boardP2);
        if (p1Alive > 0 && p2Alive > 0) return false; // ainda não acabou

        const myNum = this.myPlayerNumber;
        let winner; // 1 ou 2
        if (p1Alive === 0 && p2Alive === 0) {
            winner = 0; // empate improvável mas tratado
        } else {
            winner = p1Alive > 0 ? 1 : 2;
        }

        // Em multiplayer só mostra a tela para ambos os jogadores
        if (this.multiplayerMode && !this._winSent) {
            this._winSent = true;
            this.sendAction('gameOver', { winner });
        }

        const isWin = (!this.multiplayerMode && winner === 1) ||
                      (this.multiplayerMode  && winner === myNum) ||
                      winner === 0;
        const isDraw = winner === 0;

        this._showWinScreen(isWin, isDraw, winner);
        return true;
    },

    _showWinScreen(isWin, isDraw, winner) {
        // Remove indicador de borda ao encerrar
        this._setScreenBorder && this._setScreenBorder('none');

        // Partida encerrada — limpa dados persistidos
        try {
            sessionStorage.removeItem('chaotic_vote');
            sessionStorage.removeItem('chaotic_room');
        } catch(_) {}

        // ── Atualiza placar do torneio ────────────────────────────────────────
        const myP = this.multiplayerMode ? this.myPlayerNumber : 1;
        if (this._tournament && !isDraw) {
            if (winner === 1) this._tournament.p1Wins++;
            else if (winner === 2) this._tournament.p2Wins++;
            this._tournament.game++;

            // Verifica se a série foi decidida
            const seriesWinner = this._tournament.p1Wins >= this._tournament.maxWins ? 1
                               : this._tournament.p2Wins >= this._tournament.maxWins ? 2 : null;
            if (seriesWinner) {
                // Sincroniza placar final no multiplayer
                if (this.multiplayerMode) this.sendAction('tournament_score', { t: this._tournament });
                this._showSeriesWinScreen(seriesWinner);
                return;
            }
            // Sincroniza placar intermediário
            if (this.multiplayerMode) this.sendAction('tournament_score', { t: this._tournament });
        }

        const old = document.getElementById('win-overlay');
        if (old) old.remove();

        const winnerLabel = winner === 1 ? (this.p1Name || 'Jogador 1') : winner === 2 ? (this.p2Name || 'Jogador 2') : '—';

        let title, subtitle, emoji, accentColor, glowColor, headerBg;
        if (isDraw) {
            title       = 'Empate!';
            subtitle    = 'Todas as criaturas foram destruídas ao mesmo tempo.';
            emoji       = '🤝';
            accentColor = '#94a3b8';
            glowColor   = 'rgba(148,163,184,0.3)';
            headerBg    = 'linear-gradient(135deg,#1e293b,#334155)';
        } else if (isWin) {
            title       = 'Vitória!';
            subtitle    = 'Você derrotou todas as criaturas do oponente!';
            emoji       = '🏆';
            accentColor = '#fbbf24';
            glowColor   = 'rgba(251,191,36,0.4)';
            headerBg    = 'linear-gradient(135deg,#78350f,#d97706,#fbbf24)';
        } else {
            title       = 'Derrota!';
            subtitle    = `${winnerLabel} destruiu todas as suas criaturas.`;
            emoji       = '💀';
            accentColor = '#ef4444';
            glowColor   = 'rgba(239,68,68,0.3)';
            headerBg    = 'linear-gradient(135deg,#1e293b,#7f1d1d,#991b1b)';
        }

        // ── Estatísticas da partida ──────────────────────────────────────────
        const s = this._stats || {};
        const stats = [
            { icon: '🔄', label: 'Turnos jogados',    value: s.turns   || 0 },
            { icon: '⚔️', label: 'Ataques realizados', value: s.attacks || 0 },
            { icon: '🎵', label: 'Mugics usadas',      value: s.mugics  || 0 },
            { icon: '💀', label: 'Criaturas abatidas', value: s.kills   || 0 },
            { icon: '💥', label: 'Maior dano único',   value: s.maxDmg > 0 ? s.maxDmg : '—' },
        ];

        const statsHtml = stats.map(s => `
            <div style="text-align:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 8px;">
                <div style="font-size:20px;margin-bottom:4px;">${s.icon}</div>
                <div style="font-size:18px;font-weight:900;color:#f1f5f9;">${s.value}</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px;line-height:1.2;">${s.label}</div>
            </div>`).join('');

        // ── Estatísticas por criatura ────────────────────────────────────────
        const creatureStatsHtml = (() => {
            if (!this.matchHistory || this.matchHistory.length === 0) return '';

            // Agrega dados de todos os combates da partida
            const dmgDealt   = {}; // criatura → total de dano causado
            const dmgTaken   = {}; // criatura → total de dano recebido
            const mugicsUsed = {}; // criatura → total de mugics conjuradas
            const kills      = {}; // criatura → criaturas abatidas
            const survived   = new Set(); // criaturas que sobreviveram (vencedoras)
            const creatureImg = {};
            const creatureTribe = {};

            this.matchHistory.forEach(combat => {
                // Dano causado
                (combat.attacks || []).forEach(({ attacker, totalDamage, attImg, attTribe }) => {
                    dmgDealt[attacker]   = (dmgDealt[attacker]   || 0) + (totalDamage || 0);
                });
                // Dano recebido
                (combat.attacks || []).forEach(({ defender, totalDamage }) => {
                    dmgTaken[defender]   = (dmgTaken[defender]   || 0) + (totalDamage || 0);
                });
                // Mugics
                (combat.mugics || []).forEach(({ targetName }) => {
                    mugicsUsed[targetName] = (mugicsUsed[targetName] || 0) + 1;
                });
                // Kill (vencedor do combate)
                if (combat.winnerName) kills[combat.winnerName] = (kills[combat.winnerName] || 0) + 1;
                if (combat.winnerName) survived.add(combat.winnerName);
                // Imagens
                if (combat.winnerImg)   creatureImg[combat.winnerName]   = combat.winnerImg;
                if (combat.loserImg)    creatureImg[combat.loserName]    = combat.loserImg;
                if (combat.winnerTribe) creatureTribe[combat.winnerName] = combat.winnerTribe;
                if (combat.loserTribe)  creatureTribe[combat.loserName]  = combat.loserTribe;
            });

            // Destaques
            const allNames   = [...new Set([...Object.keys(dmgDealt), ...Object.keys(dmgTaken)])];
            if (allNames.length === 0) return '';

            const topDmg    = allNames.sort((a,b) => (dmgDealt[b]||0)-(dmgDealt[a]||0))[0];
            const topTank   = allNames.sort((a,b) => (dmgTaken[b]||0)-(dmgTaken[a]||0))[0];
            const topKills  = Object.keys(kills).sort((a,b) => kills[b]-kills[a])[0];
            const survived1 = [...survived][0];

            const tribeColor = { OverWorld:'#3b82f6', UnderWorld:'#ef4444', Mipedian:'#f59e0b', Danian:'#8b5cf6' };

            const card = (icon, label, name, value, extra='') => {
                if (!name) return '';
                const img   = creatureImg[name];
                const tribe = creatureTribe[name] || '';
                const color = tribeColor[tribe] || '#64748b';
                return `
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
                    border-radius:10px;padding:10px 10px 8px;display:flex;align-items:center;gap:10px;">
                    ${img ? `<img src="${img}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;border:1px solid ${color}40;">` :
                             `<div style="width:36px;height:36px;border-radius:6px;background:${color}20;border:1px solid ${color}40;display:flex;align-items:center;justify-content:center;font-size:16px;">${icon}</div>`}
                    <div>
                        <div style="font-size:10px;color:#64748b;margin-bottom:1px;">${label}</div>
                        <div style="font-size:12px;font-weight:700;color:#f1f5f9;">${name}</div>
                        <div style="font-size:11px;color:${color};font-weight:600;">${value}${extra}</div>
                    </div>
                </div>`;
            };

            const cards = [
                card('⚔️', 'Maior destruidor',   topDmg,   `${dmgDealt[topDmg]||0} dano causado`),
                card('🛡️', 'Mais resiliente',    topTank,  `${dmgTaken[topTank]||0} dano absorvido`),
                card('💀', 'Mais abates',         topKills, `${kills[topKills]||0} vitória${kills[topKills]>1?'s':''}`),
                card('🌟', 'Sobrevivente',        survived1, 'Terminou de pé'),
            ].filter(Boolean).join('');

            return cards ? `
            <div style="padding:4px 22px 14px;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,0.3);margin-bottom:10px;">
                    ⭐ Destaques da Partida
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${cards}</div>
            </div>` : '';
        })();

        // ── Partículas de confete (só na vitória) ────────────────────────────
        const confettiHtml = isWin ? `<canvas id="win-confetti" style="position:fixed;inset:0;pointer-events:none;z-index:10000;"></canvas>` : '';

        const overlay = document.createElement('div');
        overlay.id = 'win-overlay';
        overlay.style.cssText = `
            position:fixed;inset:0;z-index:9999;
            display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,0.88);
            animation:_wFadeIn 0.4s ease-out;
        `;

        overlay.innerHTML = `
            ${confettiHtml}
            <style>
                @keyframes _wFadeIn  { from{opacity:0}         to{opacity:1} }
                @keyframes _wPopIn   { from{transform:scale(0.6) translateY(30px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
                @keyframes _wFloat   { 0%,100%{transform:translateY(0) rotate(-4deg)} 50%{transform:translateY(-14px) rotate(4deg)} }
                @keyframes _wShine   { 0%{background-position:-200% center} 100%{background-position:200% center} }
                #_wCard  { animation: _wPopIn 0.5s cubic-bezier(.175,.885,.32,1.275) forwards; }
                #_wEmoji { animation: _wFloat 2.4s ease-in-out infinite; display:inline-block; }
            </style>
            <div id="_wCard" style="
                background:#0f172a;
                border:1px solid rgba(255,255,255,0.1);
                border-radius:20px;
                max-width:460px; width:92%;
                box-shadow:0 0 60px ${glowColor}, 0 24px 64px rgba(0,0,0,0.8);
                overflow:hidden;
                font-family:inherit;
            ">
                <!-- Header colorido -->
                <div style="background:${headerBg};padding:32px 28px 24px;text-align:center;position:relative;overflow:hidden;">
                    <!-- Brilho animado -->
                    <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%);background-size:200% 100%;animation:_wShine 2.4s linear infinite;"></div>
                    <div id="_wEmoji" style="font-size:72px;margin-bottom:12px;filter:drop-shadow(0 0 20px ${glowColor});">${emoji}</div>
                    <h1 style="color:#fff;font-size:2.6em;font-weight:900;margin:0 0 6px;text-shadow:0 2px 12px rgba(0,0,0,0.5);letter-spacing:-.01em;">${title}</h1>
                    <p style="color:rgba(255,255,255,0.8);font-size:1em;margin:0;">${subtitle}</p>
                </div>

                <!-- Placar do torneio (se ativo) -->
                ${this._tournament ? (() => {
                    const t  = this._tournament;
                    const p1 = this.p1Name || 'Jogador 1';
                    const p2 = this.p2Name || 'Jogador 2';
                    const w1 = t.p1Wins, w2 = t.p2Wins;
                    const pip = (n, max, color) => Array.from({length: max}, (_, i) =>
                        `<span style="width:14px;height:14px;border-radius:50%;display:inline-block;margin:0 2px;
                        background:${i < n ? color : 'rgba(255,255,255,0.12)'};
                        border:1px solid ${i < n ? color : 'rgba(255,255,255,0.2)'};"></span>`
                    ).join('');
                    return `
                    <div style="padding:14px 22px 0;text-align:center;">
                        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,0.3);margin-bottom:10px;">
                            🏆 Melhor de ${t.maxWins * 2 - 1} — Partida ${t.game - 1}
                        </div>
                        <div style="display:flex;align-items:center;justify-content:center;gap:16px;">
                            <div style="text-align:center;">
                                <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">${p1}</div>
                                <div>${pip(w1, t.maxWins, '#fbbf24')}</div>
                                <div style="font-size:28px;font-weight:900;color:#f1f5f9;margin-top:4px;">${w1}</div>
                            </div>
                            <div style="font-size:20px;color:#334155;font-weight:900;">VS</div>
                            <div style="text-align:center;">
                                <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">${p2}</div>
                                <div>${pip(w2, t.maxWins, '#fbbf24')}</div>
                                <div style="font-size:28px;font-weight:900;color:#f1f5f9;margin-top:4px;">${w2}</div>
                            </div>
                        </div>
                    </div>`;
                })() : ''}

                <!-- Stats grid -->
                <div style="padding:20px 22px 4px;">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,0.3);margin-bottom:10px;">📊 Resumo da Partida</div>
                    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">
                        ${statsHtml}
                    </div>
                </div>

                <!-- Destaques por criatura -->
                ${creatureStatsHtml}

                <!-- Botões -->
                <div style="padding:20px 22px 24px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                    ${this._tournament ? `
                    <!-- Torneio ativo: próxima partida -->
                    ${this.multiplayerMode ? `
                    <button id="btn-rematch" onclick="game._requestRematch()" style="
                        flex:1;min-width:140px;padding:13px 10px;border-radius:12px;border:none;cursor:pointer;
                        background:#f59e0b;color:#000;font-size:14px;font-weight:900;font-family:inherit;
                        box-shadow:0 4px 20px rgba(245,158,11,0.4);transition:transform .15s;">
                        ▶ Próxima Partida
                    </button>` : `
                    <button onclick="game._tournamentNextGame()" style="
                        flex:1;min-width:140px;padding:13px 10px;border-radius:12px;border:none;cursor:pointer;
                        background:#f59e0b;color:#000;font-size:14px;font-weight:900;font-family:inherit;
                        box-shadow:0 4px 20px rgba(245,158,11,0.4);transition:transform .15s;">
                        ▶ Próxima Partida
                    </button>`}
                    ` : `
                    <!-- Sem torneio: revanche normal + botão para iniciar torneio -->
                    ${this.multiplayerMode ? `
                    <button id="btn-rematch" onclick="game._requestRematch()" style="
                        flex:1;min-width:120px;padding:13px 10px;border-radius:12px;border:none;cursor:pointer;
                        background:${accentColor};color:#000;font-size:14px;font-weight:900;
                        font-family:inherit;box-shadow:0 4px 20px ${glowColor};transition:transform .15s;">
                        ⚔️ Revanche
                    </button>
                    <button onclick="game._startTournament()" style="
                        flex:1;min-width:120px;padding:13px 10px;border-radius:12px;cursor:pointer;
                        background:rgba(245,158,11,0.15);border:1px solid #f59e0b;
                        color:#fcd34d;font-size:13px;font-weight:700;font-family:inherit;transition:transform .15s;">
                        🏆 Melhor de 3
                    </button>` : `
                    <button onclick="game._rematchSinglePlayer()" style="
                        flex:1;min-width:120px;padding:13px 10px;border-radius:12px;border:none;cursor:pointer;
                        background:${accentColor};color:#000;font-size:14px;font-weight:900;
                        font-family:inherit;box-shadow:0 4px 20px ${glowColor};transition:transform .15s;">
                        ⚔️ Revanche
                    </button>
                    <button onclick="game._startTournament()" style="
                        flex:1;min-width:120px;padding:13px 10px;border-radius:12px;cursor:pointer;
                        background:rgba(245,158,11,0.15);border:1px solid #f59e0b;
                        color:#fcd34d;font-size:13px;font-weight:700;font-family:inherit;transition:transform .15s;">
                        🏆 Melhor de 3
                    </button>`}
                    `}
                    <button onclick="location.reload()" style="
                        flex:1;min-width:120px;padding:13px 10px;border-radius:12px;border:none;cursor:pointer;
                        background:rgba(255,255,255,0.1);color:#f1f5f9;font-size:13px;font-weight:700;
                        font-family:inherit;border:1px solid rgba(255,255,255,0.15);
                        transition:transform .15s;
                    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        🔄 Menu
                    </button>
                    <button onclick="document.getElementById('win-overlay').remove()" style="
                        flex:1;min-width:120px;padding:13px 10px;border-radius:12px;cursor:pointer;
                        background:transparent;border:1px solid rgba(255,255,255,0.15);
                        color:rgba(255,255,255,0.5);font-size:13px;font-weight:600;
                        font-family:inherit;
                        transition:border-color .15s,color .15s;
                    " onmouseover="this.style.borderColor='rgba(255,255,255,0.4)';this.style.color='#fff'"
                       onmouseout="this.style.borderColor='rgba(255,255,255,0.15)';this.style.color='rgba(255,255,255,0.5)'">
                        🔭 Ver Tabuleiro
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.log(`${emoji} ${title} — ${subtitle}`);

        // ── Confete leve (só vitória) ────────────────────────────────────────
        if (isWin) {
            const canvas = document.getElementById('win-confetti');
            if (canvas) {
                canvas.width  = window.innerWidth;
                canvas.height = window.innerHeight;
                const ctx = canvas.getContext('2d');
                const pieces = Array.from({length: 90}, () => ({
                    x:  Math.random() * canvas.width,
                    y: -Math.random() * canvas.height,
                    r:  4 + Math.random() * 6,
                    d:  2 + Math.random() * 3,
                    color: ['#fbbf24','#f59e0b','#34d399','#60a5fa','#f472b6','#a78bfa'][Math.floor(Math.random()*6)],
                    tilt: Math.random() * 10 - 5,
                    tiltSpeed: 0.1 + Math.random() * 0.15,
                    angle: 0,
                }));
                let frame = 0;
                const draw = () => {
                    if (frame++ > 260) return; // para após ~4s
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    pieces.forEach(p => {
                        p.y    += p.d;
                        p.angle += p.tiltSpeed;
                        p.tilt  = Math.sin(p.angle) * 12;
                        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
                        ctx.beginPath();
                        ctx.ellipse(p.x, p.y, p.r, p.r / 2, p.tilt * Math.PI / 180, 0, Math.PI * 2);
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = Math.max(0, 1 - frame / 260);
                        ctx.fill();
                    });
                    requestAnimationFrame(draw);
                };
                requestAnimationFrame(draw);
            }
        }
    },

    // ── Revanche single-player: volta ao draft sem recarregar a página ────────
    // ── Torneio ──────────────────────────────────────────────────────────────

    _startTournament() {
        this._tournament = { p1Wins: 0, p2Wins: 0, game: 1, maxWins: 2, mode: this.gameMode };
        if (this.multiplayerMode) {
            this.sendAction('tournament_start', { t: this._tournament });
            this._requestRematch();
        } else {
            this._tournamentNextGame();
        }
    },

    _tournamentNextGame() {
        // Reinicia o jogo preservando o placar
        const t = this._tournament;
        this._rematchSinglePlayer();
        // Restaura o torneio (rematch reseta tudo)
        this._tournament = t;
    },

    _showSeriesWinScreen(seriesWinner) {
        const old = document.getElementById('win-overlay');
        if (old) old.remove();

        const myP      = this.multiplayerMode ? this.myPlayerNumber : 1;
        const isWinner = seriesWinner === myP;
        const t        = this._tournament;
        const p1       = this.p1Name || 'Jogador 1';
        const p2       = this.p2Name || 'Jogador 2';
        const winName  = seriesWinner === 1 ? p1 : p2;

        const accentColor = isWinner ? '#fbbf24' : '#ef4444';
        const glowColor   = isWinner ? 'rgba(251,191,36,0.5)' : 'rgba(239,68,68,0.3)';
        const emoji       = isWinner ? '🏆' : '💀';
        const title       = isWinner ? 'Série Vencida!' : 'Série Perdida!';

        // ── Salva no histórico de torneios ───────────────────────────────────
        this._saveTournamentToHistory({
            date:      new Date().toLocaleDateString('pt-BR'),
            mode:      this.gameMode,
            p1Name:    p1,
            p2Name:    p2,
            p1Wins:    t.p1Wins,
            p2Wins:    t.p2Wins,
            myP,
            seriesWinner,
            won:       isWinner,
        });

        // Limpa torneio
        this._tournament = null;

        const overlay = document.createElement('div');
        overlay.id = 'win-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.92);';
        overlay.innerHTML = `
            <div style="background:#0f172a;border:2px solid ${accentColor};border-radius:20px;
                max-width:420px;width:92%;overflow:hidden;font-family:inherit;
                box-shadow:0 0 80px ${glowColor};">
                <div style="background:linear-gradient(135deg,${isWinner?'#78350f,#d97706,#fbbf24':'#1e293b,#7f1d1d,#991b1b'});
                    padding:36px 28px;text-align:center;">
                    <div style="font-size:80px;margin-bottom:8px;">${emoji}</div>
                    <h1 style="color:#fff;font-size:2.4em;font-weight:900;margin:0 0 6px;">${title}</h1>
                    <p style="color:rgba(255,255,255,0.8);font-size:1em;margin:0;">${winName} venceu a série!</p>
                </div>
                <!-- Placar final -->
                <div style="padding:24px;text-align:center;">
                    <div style="font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;">Placar Final</div>
                    <div style="display:flex;align-items:center;justify-content:center;gap:24px;">
                        <div>
                            <div style="font-size:11px;color:#94a3b8;">${p1}</div>
                            <div style="font-size:48px;font-weight:900;color:${seriesWinner===1?'#fbbf24':'#64748b'};">${t.p1Wins}</div>
                        </div>
                        <div style="font-size:24px;color:#334155;">-</div>
                        <div>
                            <div style="font-size:11px;color:#94a3b8;">${p2}</div>
                            <div style="font-size:48px;font-weight:900;color:${seriesWinner===2?'#fbbf24':'#64748b'};">${t.p2Wins}</div>
                        </div>
                    </div>
                </div>
                <!-- Botões -->
                <div style="padding:0 22px 24px;display:flex;gap:10px;">
                    ${this.multiplayerMode ? `
                    <button id="btn-rematch" onclick="game._requestRematch()" style="
                        flex:1;padding:13px;border-radius:12px;border:none;cursor:pointer;
                        background:${accentColor};color:#000;font-size:14px;font-weight:900;font-family:inherit;">
                        🏆 Nova Série
                    </button>` : `
                    <button onclick="game._rematchSinglePlayer()" style="
                        flex:1;padding:13px;border-radius:12px;border:none;cursor:pointer;
                        background:${accentColor};color:#000;font-size:14px;font-weight:900;font-family:inherit;">
                        🏆 Nova Série
                    </button>`}
                    <button onclick="location.reload()" style="
                        flex:1;padding:13px;border-radius:12px;cursor:pointer;
                        background:transparent;border:1px solid rgba(255,255,255,0.15);
                        color:rgba(255,255,255,0.5);font-size:13px;font-weight:600;font-family:inherit;">
                        🔄 Menu
                    </button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    },

    _rematchSinglePlayer() {
        const overlay = document.getElementById('win-overlay');
        if (overlay) overlay.remove();
        // Se estava em multiplayer e quer jogar solo na revanche, desconecta sem overlay
        if (this.socket && this.multiplayerMode) {
            this._intentionalDisconnect = true;
            this.socket.disconnect();
            this.socket = null;
            this.multiplayerMode = false;
        }

        // Reset do estado de jogo (preserva torneio)
        const savedTournament = this._tournament;
        this.boardP1 = [[null,null,null],[null,null],[null]];
        this.boardP2 = [[null,null,null],[null,null],[null]];
        this.p1AttackDeck = []; this.p2AttackDeck = [];
        this.p1AttackHand = []; this.p2AttackHand = [];
        this.p1AttackDiscard = []; this.p2AttackDiscard = [];
        this.locationDeck = []; this.activeLocation = null;
        this.activeCombat = null; this.pendingCombat = null;
        this.selectedAttacker = null; this.burstStack = [];
        this.turn = 1; this.gameState = 'IDLE';
        this.draftedCards = []; this.draftedBattlegears = [];
        this.draftedMugics = []; this.draftedAttacks = [];
        this.playerMugics = []; this.p2Mugics = [];
        this._customFormation = null; this._stats = {};
        this._logRound = 0;
        this._tournament = savedTournament; // restaura torneio

        // Volta para a tela de draft
        const battle = document.getElementById('battle-screen');
        const draft  = document.getElementById('draft-screen');
        if (battle) battle.classList.add('hidden');
        if (draft)  draft.classList.remove('hidden');
        if (this.logElement) this.logElement.innerHTML = '';

        this.appState   = 'DRAFT';
        this.draftState = 'CREATURES';
        this.renderDraft && this.renderDraft();
        this.log('🔄 Revanche! Façam o Draft para iniciar a nova partida.');
    },

    // ── Revanche multiplayer: envia pedido ao oponente ────────────────────────
    _requestRematch() {
        const btn = document.getElementById('btn-rematch');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Aguardando oponente...';
            btn.style.opacity = '0.6';
        }
        this.sendAction('rematch_request');
        this.log('⚔️ Pedido de revanche enviado. Aguardando oponente...');
    },

    _handleRematchRequest() {
        // Oponente pediu revanche — mostra botão de aceitar
        this.log('⚔️ Oponente quer uma revanche!');
        const overlay = document.getElementById('win-overlay');
        if (!overlay) return;

        // Substitui o botão Revanche por "Aceitar Revanche"
        const btn = document.getElementById('btn-rematch');
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.textContent = '✅ Aceitar Revanche!';
            btn.style.background = '#22c55e';
            btn.onclick = () => {
                this.sendAction('rematch_accept');
                this._executeMultiplayerRematch();
            };
        } else {
            // Fallback: overlay de pedido
            this.showAlert('⚔️ Revanche!', 'Seu oponente quer uma revanche!\nClique OK para aceitar.').then(() => {
                this.sendAction('rematch_accept');
                this._executeMultiplayerRematch();
            });
        }
    },

    _executeMultiplayerRematch() {
        // Ambos aceitaram — cada um volta ao draft
        const overlay = document.getElementById('win-overlay');
        if (overlay) overlay.remove();
        this._rematchSinglePlayer(); // reseta estado e volta ao draft
        this.log('⚔️ Revanche aceita! Façam o Draft para a nova partida.');
    },

});
