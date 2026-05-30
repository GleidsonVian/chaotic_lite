// engine-turn.js
Object.assign(GameEngine.prototype, {

    nextTurn(fromRemote = false) {
        if (this._nextTurnLock) return;
        this._nextTurnLock = true;
        setTimeout(() => { this._nextTurnLock = false; }, 500);

        // Expira flags temporárias de turno em todas as criaturas
        const expireFlags = (board) => {
            for (const row of board) for (const card of row) {
                if (!card) continue;
                // Invisibility dura apenas 1 turno completo
                if (card._invisibility) {
                    if (card._invisibilityTurn !== undefined && card._invisibilityTurn < this.turn) {
                        delete card._invisibility;
                        delete card._invisibilityTurn;
                        this.log(`👁️ ${card.name} não está mais invisível.`);
                    }
                }
                // _cannotMove expira a cada virada de turno
                delete card._cannotMove;
            }
        };
        expireFlags(this.boardP1);
        expireFlags(this.boardP2);

        this.selectedAttacker = null;
        this.gameState = 'IDLE';
        this.turn = this.turn === 1 ? 2 : 1;

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
        // Remove overlay anterior se existir
        const old = document.getElementById('win-overlay');
        if (old) old.remove();

        const winnerLabel = winner === 1 ? 'Jogador 1' : winner === 2 ? 'Jogador 2' : '—';

        let title, subtitle, emoji, bgColor;
        if (isDraw) {
            title = 'Empate!';
            subtitle = 'Todas as criaturas foram destruídas ao mesmo tempo.';
            emoji = '🤝';
            bgColor = 'linear-gradient(135deg, #636e72, #2d3436)';
        } else if (isWin) {
            title = 'Vitória!';
            subtitle = `Parabéns! Você derrotou todas as criaturas do oponente.`;
            emoji = '🏆';
            bgColor = 'linear-gradient(135deg, #f9ca24, #f0932b)';
        } else {
            title = 'Derrota!';
            subtitle = `${winnerLabel} destruiu todas as suas criaturas.`;
            emoji = '💀';
            bgColor = 'linear-gradient(135deg, #636e72, #e17055)';
        }

        const overlay = document.createElement('div');
        overlay.id = 'win-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.85);
            animation: fadeInOverlay 0.5s ease-out;
        `;

        overlay.innerHTML = `
            <style>
                @keyframes fadeInOverlay { from { opacity:0; } to { opacity:1; } }
                @keyframes popIn { from { transform: scale(0.5); opacity:0; } to { transform: scale(1); opacity:1; } }
                @keyframes floatEmoji { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
                #win-card { animation: popIn 0.4s cubic-bezier(.175,.885,.32,1.275) forwards; }
                #win-emoji { animation: floatEmoji 2s ease-in-out infinite; display: inline-block; }
            </style>
            <div id="win-card" style="
                background: ${bgColor};
                border-radius: 20px;
                padding: 50px 60px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.7);
                max-width: 420px;
                width: 90%;
            ">
                <div id="win-emoji" style="font-size: 80px; margin-bottom: 20px;">${emoji}</div>
                <h1 style="color: #fff; font-size: 2.8em; margin: 0 0 10px; text-shadow: 2px 2px 8px rgba(0,0,0,0.5);">${title}</h1>
                <p style="color: rgba(255,255,255,0.9); font-size: 1.1em; margin: 0 0 30px;">${subtitle}</p>
                <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="location.reload()" style="
                        background: rgba(255,255,255,0.25);
                        border: 2px solid rgba(255,255,255,0.6);
                        color: #fff;
                        font-size: 1em;
                        font-weight: bold;
                        padding: 12px 28px;
                        border-radius: 30px;
                        cursor: pointer;
                        transition: all 0.2s;
                        backdrop-filter: blur(4px);
                    " onmouseover="this.style.background='rgba(255,255,255,0.4)'" onmouseout="this.style.background='rgba(255,255,255,0.25)'">
                        🔄 Jogar Novamente
                    </button>
                    <button onclick="document.getElementById('win-overlay').remove()" style="
                        background: transparent;
                        border: 2px solid rgba(255,255,255,0.35);
                        color: rgba(255,255,255,0.75);
                        font-size: 1em;
                        padding: 12px 28px;
                        border-radius: 30px;
                        cursor: pointer;
                        transition: all 0.2s;
                    " onmouseover="this.style.borderColor='rgba(255,255,255,0.7)';this.style.color='#fff'" onmouseout="this.style.borderColor='rgba(255,255,255,0.35)';this.style.color='rgba(255,255,255,0.75)'">
                        Ver Tabuleiro
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.log(`${emoji} ${title} — ${subtitle}`);
    },

});
