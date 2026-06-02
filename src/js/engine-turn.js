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
            if (!this.multiplayerMode) {
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
        const old = document.getElementById('win-overlay');
        if (old) old.remove();

        const winnerLabel = winner === 1 ? (this.p1Name || 'Jogador 1') : winner === 2 ? (this.p2Name || 'Jogador 2') : '—';
        const myP = this.multiplayerMode ? this.myPlayerNumber : 1;

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

                <!-- Stats grid -->
                <div style="padding:20px 22px 4px;">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,0.3);margin-bottom:10px;">📊 Resumo da Partida</div>
                    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">
                        ${statsHtml}
                    </div>
                </div>

                <!-- Botões -->
                <div style="padding:20px 22px 24px;display:flex;gap:12px;justify-content:center;">
                    <button onclick="location.reload()" style="
                        flex:1;padding:13px 10px;border-radius:12px;border:none;cursor:pointer;
                        background:${accentColor};color:#000;font-size:14px;font-weight:900;
                        font-family:inherit;letter-spacing:.02em;
                        box-shadow:0 4px 20px ${glowColor};
                        transition:transform .15s,box-shadow .15s;
                    " onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
                        🔄 Jogar Novamente
                    </button>
                    <button onclick="document.getElementById('win-overlay').remove()" style="
                        flex:1;padding:13px 10px;border-radius:12px;cursor:pointer;
                        background:transparent;border:1px solid rgba(255,255,255,0.2);
                        color:rgba(255,255,255,0.6);font-size:14px;font-weight:700;
                        font-family:inherit;
                        transition:border-color .15s,color .15s;
                    " onmouseover="this.style.borderColor='rgba(255,255,255,0.5)';this.style.color='#fff'"
                       onmouseout="this.style.borderColor='rgba(255,255,255,0.2)';this.style.color='rgba(255,255,255,0.6)'">
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

});
