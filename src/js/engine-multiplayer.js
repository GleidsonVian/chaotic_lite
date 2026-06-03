// engine-multiplayer.js
Object.assign(GameEngine.prototype, {

    initMultiplayer() {
        if (typeof io === 'undefined') return;
        const setup = document.getElementById('setup-screen');
        const game  = document.getElementById('game-container');
        if (setup) setup.style.display = 'none';
        if (game)  game.style.display  = '';
        this._connectSocket();
    },

    // ─── Seleção de sala ─────────────────────────────────────────────────────

    _showRoomSelect() {
        document.getElementById('lobby-room-select').style.display  = 'block';
        document.getElementById('lobby-public-panel').style.display = 'none';
        document.getElementById('lobby-card').style.display         = 'none';
        // Verifica se há ?sala= na URL ao mostrar a seleção de sala
        this._checkInviteParam();
    },

    _openPublicLobby() {
        document.getElementById('lobby-room-select').style.display  = 'none';
        document.getElementById('lobby-public-panel').style.display = 'block';
        document.getElementById('lobby-card').style.display         = 'none';
        this._refreshPublicRooms();
    },

    _backToRoomSelect() {
        this._showRoomSelect();
    },

    _getPlayerName() {
        const input = document.getElementById('lobby-name-input');
        const val   = input && input.value.trim();
        return val || (this.myPlayerNumber === 1 ? 'Jogador 1' : 'Jogador 2');
    },

    _createRoom(type) {
        if (!this.socket || !this.socket.connected) return;
        const name = this._getPlayerName();
        this.socket.emit('create_room', { type, playerName: name, name: `Sala de ${name}` });
    },

    _joinRoom() {
        if (!this.socket || !this.socket.connected) return;
        const codeEl = document.getElementById('lobby-code-input');
        const errEl  = document.getElementById('lobby-join-error');
        const code   = (codeEl && codeEl.value.trim().toUpperCase()) || '';
        if (code.length !== 4) {
            if (errEl) { errEl.textContent = 'Digite um código de 4 letras.'; errEl.style.display = 'block'; }
            return;
        }
        if (errEl) errEl.style.display = 'none';
        this.socket.emit('join_room', { code, playerName: this._getPlayerName() });
    },

    _refreshPublicRooms() {
        if (!this.socket || !this.socket.connected) return;
        this.socket.emit('get_public_rooms');
    },

    _renderPublicRooms(list) {
        const container = document.getElementById('lobby-public-list');
        if (!container) return;
        if (!list || list.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;color:#334155;font-size:13px;padding:24px 0;">
                    <div style="font-size:28px;margin-bottom:8px;">🔍</div>
                    Nenhuma sala aberta no momento.
                </div>`;
            return;
        }
        const modeIcon = { '6v6':'⚔️', '3v3':'⚡', '1v1':'🥊' };
        const modeLabel = { '6v6':'6v6 Padrão', '3v3':'3v3 Rápido', '1v1':'1v1 Duelo' };
        const ago = (ts) => {
            const s = Math.floor((Date.now() - ts) / 1000);
            if (s < 60) return `${s}s atrás`;
            return `${Math.floor(s/60)}min atrás`;
        };
        container.innerHTML = list.map(room => `
            <div style="display:flex;align-items:center;justify-content:space-between;
                background:rgba(255,255,255,0.04);border:1px solid #1e293b;border-radius:10px;
                padding:12px 14px;gap:10px;transition:border-color 0.15s;"
                onmouseover="this.style.borderColor='rgba(34,197,94,0.4)'"
                onmouseout="this.style.borderColor='#1e293b'">
                <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:800;color:#f1f5f9;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${room.name}</div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span style="font-size:11px;color:${room.state==='playing'?'#f59e0b':'#4ade80'};font-weight:600;">
                            ${room.state==='playing' ? '⚔️ Em andamento' : `● ${room.players}/2 jogadores`}
                        </span>
                        ${room.spectators > 0 ? `<span style="font-size:10px;color:#8b5cf6;">👁️ ${room.spectators}</span>` : ''}
                        <span style="font-size:10px;color:#475569;">·</span>
                        <span style="font-size:11px;color:#94a3b8;">${modeIcon[room.gameMode]||'🎮'} ${modeLabel[room.gameMode]||'Aguardando modo'}</span>
                        <span style="font-size:10px;color:#334155;">· ${ago(room.createdAt)}</span>
                    </div>
                </div>
                <div style="display:flex;gap:6px;">
                    ${room.state === 'waiting' ? `
                    <button onclick="game._quickJoin('${room.code}')" style="
                        background:linear-gradient(135deg,#16a34a,#22c55e);border:none;border-radius:8px;
                        color:#000;font-size:12px;font-weight:900;padding:8px 14px;cursor:pointer;
                        white-space:nowrap;font-family:inherit;transition:transform 0.15s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        Entrar →
                    </button>` : ''}
                    ${room.state === 'playing' ? `
                    <button onclick="game.spectateRoom('${room.code}')" style="
                        background:linear-gradient(135deg,#4f46e5,#7c3aed);border:none;border-radius:8px;
                        color:#fff;font-size:12px;font-weight:700;padding:8px 14px;cursor:pointer;
                        white-space:nowrap;font-family:inherit;transition:transform 0.15s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        👁️ Assistir
                    </button>` : ''}
                </div>
            </div>`).join('');
    },

    _quickJoin(code) {
        const codeEl = document.getElementById('lobby-code-input');
        if (codeEl) codeEl.value = code;
        this._joinRoom();
    },

    // ── Entrar como espectador ────────────────────────────────────────────────
    spectateRoom(code) {
        if (!code) {
            const input = document.getElementById('lobby-code-input');
            code = input ? input.value.trim().toUpperCase() : '';
        }
        if (!code || code.length !== 4) {
            this.showAlert('Código inválido', 'Digite um código de sala de 4 letras para espectatar.');
            return;
        }
        if (!this.socket || !this.socket.connected) {
            this.showAlert('Sem conexão', 'Conecte-se ao servidor primeiro.');
            return;
        }
        const name = this._getPlayerName() || 'Espectador';
        this.socket.emit('spectate_room', { code, playerName: name });
    },

    // ── Overlay de espera de reconexão do oponente ────────────────────────────
    _showReconnectWaitOverlay(opponentName, totalSeconds) {
        const old = document.getElementById('reconnect-wait-overlay');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'reconnect-wait-overlay';
        overlay.style.cssText = `
            position:fixed;inset:0;z-index:8900;
            display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);`;
        overlay.innerHTML = `
            <div style="background:#0f172a;border:1px solid #334155;border-radius:16px;
                padding:32px 40px;text-align:center;max-width:380px;width:90%;
                box-shadow:0 16px 48px rgba(0,0,0,0.8);">
                <div style="font-size:40px;margin-bottom:12px;">📡</div>
                <h3 style="color:#f1f5f9;margin:0 0 6px;font-size:18px;">${opponentName} desconectou</h3>
                <p style="color:#64748b;font-size:13px;margin:0 0 20px;">Aguardando reconexão...</p>
                <div style="position:relative;height:8px;background:#1e293b;border-radius:4px;overflow:hidden;margin-bottom:14px;">
                    <div id="reconnect-wait-bar" style="height:100%;background:#f59e0b;border-radius:4px;
                        width:100%;transition:width 1s linear;"></div>
                </div>
                <div id="reconnect-wait-count" style="font-size:28px;font-weight:900;color:#f59e0b;">${totalSeconds}s</div>
                <p style="color:#475569;font-size:11px;margin:8px 0 0;">O jogo continuará automaticamente se ele voltar.</p>
            </div>`;
        document.body.appendChild(overlay);

        // Countdown
        let remaining = totalSeconds;
        this._reconnectWaitTimer = setInterval(() => {
            remaining--;
            const countEl = document.getElementById('reconnect-wait-count');
            const barEl   = document.getElementById('reconnect-wait-bar');
            if (countEl) countEl.textContent = `${remaining}s`;
            if (barEl)   barEl.style.width   = `${(remaining / totalSeconds) * 100}%`;
            if (remaining <= 0) this._hideReconnectWaitOverlay();
        }, 1000);
    },

    _hideReconnectWaitOverlay() {
        clearInterval(this._reconnectWaitTimer);
        const overlay = document.getElementById('reconnect-wait-overlay');
        if (overlay) overlay.remove();
    },

    _sendBoardStateToSpectator() {
        if (!this.socket || !this.myPlayerNumber) return;
        this.socket.emit('sync_state', {
            boardP1:          JSON.parse(JSON.stringify(this.boardP1)),
            boardP2:          JSON.parse(JSON.stringify(this.boardP2)),
            activeLocation:   this.activeLocation ? JSON.parse(JSON.stringify(this.activeLocation)) : null,
            locationDeck:     JSON.parse(JSON.stringify(this.locationDeck || [])),
            turn:             this.turn,
            gameState:        this.gameState,
            appState:         this.appState,
            p1AttackHand:     JSON.parse(JSON.stringify(this.p1AttackHand || [])),
            p2AttackHand:     JSON.parse(JSON.stringify(this.p2AttackHand || [])),
            p1AttackDeck:     JSON.parse(JSON.stringify(this.p1AttackDeck || [])),
            p2AttackDeck:     JSON.parse(JSON.stringify(this.p2AttackDeck || [])),
            p1AttackDiscard:  JSON.parse(JSON.stringify(this.p1AttackDiscard || [])),
            p2AttackDiscard:  JSON.parse(JSON.stringify(this.p2AttackDiscard || [])),
        });
    },

    _showSpectatorBanner(p1Name, p2Name, spectatorCount) {
        const old = document.getElementById('spectator-banner');
        if (old) old.remove();

        const banner = document.createElement('div');
        banner.id = 'spectator-banner';
        banner.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; z-index: 8000;
            background: linear-gradient(90deg, #7c3aed, #4f46e5);
            color: white; padding: 8px 16px;
            display: flex; align-items: center; justify-content: space-between;
            font-size: 13px; font-weight: 600; font-family: inherit;
            box-shadow: 0 2px 12px rgba(0,0,0,0.4);
        `;
        banner.innerHTML = `
            <span>👁️ Modo Espectador — <strong>${p1Name}</strong> vs <strong>${p2Name}</strong></span>
            <span id="spectator-count" style="background:rgba(255,255,255,0.2);border-radius:12px;padding:2px 10px;font-size:11px;">
                👁️ ${spectatorCount} espectador${spectatorCount !== 1 ? 'es' : ''}
            </span>
        `;
        document.body.appendChild(banner);

        // Bloqueia qualquer interação com o tabuleiro
        this.isSpectator = true;
    },

    _updateSpectatorCount(count) {
        const el = document.getElementById('spectator-count');
        if (el) el.textContent = `👁️ ${count} espectador${count !== 1 ? 'es' : ''}`;
    },

    // ── Chat ─────────────────────────────────────────────────────────────────

    sendChat() {
        const input = document.getElementById('chat-input');
        if (!input) return;
        const msg = input.value.trim();
        if (!msg) return;
        input.value = '';

        // Para o indicador de digitando
        this._stopTypingIndicator();

        // Mostra a própria mensagem imediatamente
        this._receiveChatMessage('__me__', msg, Date.now(), false);

        // Usa sendAction — o mesmo canal confiável das jogadas do jogo
        this.sendAction('chat_msg', { msg });
    },

    // Chama isso no keyup do input de chat
    _onChatInputKey() {
        // Envia sinal de "digitando" com debounce de 2s
        if (!this._typingTimeout) {
            this.sendAction('chat_typing');
        }
        clearTimeout(this._typingTimeout);
        this._typingTimeout = setTimeout(() => {
            this._typingTimeout = null;
        }, 2000);
    },

    _stopTypingIndicator() {
        clearTimeout(this._typingTimeout);
        this._typingTimeout = null;
        // Esconde o indicador próprio (não relevante, mas limpa estado)
    },

    _showTypingIndicator(name) {
        const box = document.getElementById('chat-messages');
        if (!box) return;

        // Remove indicador anterior se existir
        const old = document.getElementById('chat-typing-indicator');
        if (old) old.remove();

        const el = document.createElement('div');
        el.id = 'chat-typing-indicator';
        el.style.cssText = 'padding:4px 8px;display:flex;align-items:center;gap:6px;';
        el.innerHTML = `
            <span style="font-size:10px;color:#475569;">${name} está digitando</span>
            <span style="display:flex;gap:3px;align-items:center;">
                ${[0,1,2].map(i => `<span style="width:5px;height:5px;border-radius:50%;background:#475569;
                    animation:typingDot 1.2s ${i*0.2}s ease-in-out infinite;display:inline-block;"></span>`).join('')}
            </span>`;
        box.appendChild(el);
        box.scrollTop = box.scrollHeight;

        // Adiciona keyframe se ainda não existe
        if (!document.getElementById('typing-anim')) {
            const s = document.createElement('style');
            s.id = 'typing-anim';
            s.textContent = `@keyframes typingDot {
                0%,60%,100% { opacity:0.3; transform:translateY(0); }
                30% { opacity:1; transform:translateY(-3px); }
            }`;
            document.head.appendChild(s);
        }

        // Esconde após 3s se não chegar nova mensagem
        clearTimeout(this._typingHideTimeout);
        this._typingHideTimeout = setTimeout(() => {
            document.getElementById('chat-typing-indicator')?.remove();
        }, 3000);
    },

    _receiveChatMessage(name, msg, ts, isSpectator) {
        const box = document.getElementById('chat-messages');
        if (!box) return;

        // '__me__' é a mensagem própria mostrada imediatamente pelo sendChat
        const isMe = name === '__me__';
        const displayName = isMe
            ? (this.myPlayerNumber === 1 ? (this.p1Name || 'Você') : (this.p2Name || 'Você'))
            : name;
        const badge  = isSpectator ? '👁️' : (isMe ? '🟢' : '🔴');
        const align  = isMe ? 'flex-end' : 'flex-start';
        const bubbleBg = isMe
            ? 'linear-gradient(135deg,#1e40af,#2563eb)'
            : isSpectator
                ? 'rgba(107,114,128,0.4)'
                : 'rgba(30,41,59,0.9)';
        const bubbleBorder = isMe ? '#3b82f6' : isSpectator ? '#6b7280' : '#334155';

        const time = new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const el = document.createElement('div');
        el.style.cssText = `display:flex;flex-direction:column;align-items:${align};margin-bottom:6px;`;
        el.innerHTML = `
            <div style="max-width:80%;background:${bubbleBg};border:1px solid ${bubbleBorder};
                border-radius:${isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px'};
                padding:6px 10px;font-size:12px;color:#e2e8f0;word-break:break-word;line-height:1.4;">
                ${!isMe ? `<div style="font-size:10px;font-weight:700;color:${isSpectator?'#9ca3af':'#94a3b8'};margin-bottom:2px;">${badge} ${displayName}</div>` : ''}
                ${msg}
            </div>
            <div style="font-size:9px;color:#475569;margin-top:2px;">${time}</div>
        `;

        box.appendChild(el);
        box.scrollTop = box.scrollHeight;

        // Notificação se o painel estiver fechado
        if (!this._chatOpen) {
            const badge_el = document.getElementById('chat-badge');
            if (badge_el) {
                this._chatUnread = (this._chatUnread || 0) + 1;
                badge_el.textContent = this._chatUnread;
                badge_el.style.display = 'flex';
            }
        }
    },

    toggleChat() {
        const panel = document.getElementById('chat-panel');
        if (!panel) return;
        this._chatOpen = !this._chatOpen;
        panel.style.display = this._chatOpen ? 'flex' : 'none';
        if (this._chatOpen) {
            // Zera badge e foca input
            this._chatUnread = 0;
            const badge = document.getElementById('chat-badge');
            if (badge) badge.style.display = 'none';
            const input = document.getElementById('chat-input');
            if (input) setTimeout(() => input.focus(), 50);
            // Scroll para o fim
            const box = document.getElementById('chat-messages');
            if (box) box.scrollTop = box.scrollHeight;
        }
    },

    _copyRoomCode() {
        const code = this._myRoomCode;
        if (!code) return;
        navigator.clipboard.writeText(code).then(() => {
            const btns = document.querySelectorAll('[onclick="game._copyRoomCode()"]');
            btns.forEach(btn => {
                btn.textContent = '✅ Copiado!';
                setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
            });
        });
    },

    // Copia um link direto que já entra na sala ao abrir
    _copyInviteLink() {
        const code = this._myRoomCode;
        if (!code) return;
        const base = this._lobbyPublicUrl || window.location.origin;
        const link = `${base}?sala=${code}`;
        navigator.clipboard.writeText(link).then(() => {
            const btn = document.getElementById('btn-invite-link');
            if (btn) {
                const orig = btn.textContent;
                btn.textContent = '✅ Link copiado!';
                setTimeout(() => { btn.textContent = orig; }, 2500);
            }
        }).catch(() => {
            // Fallback: prompt manual
            prompt('Copie o link de convite:', link);
        });
    },

    // Detecta ?sala=XXXX na URL e entra automaticamente
    _checkInviteParam() {
        const params = new URLSearchParams(window.location.search);
        const salaCode = params.get('sala');
        if (!salaCode) return;
        // Remove o parâmetro da URL sem recarregar
        const clean = window.location.pathname;
        window.history.replaceState({}, '', clean);
        // Pre-preenche o campo de código e entra
        this.log(`🔗 Link de convite detectado: sala ${salaCode}`);
        setTimeout(() => {
            const input = document.getElementById('lobby-code-input');
            if (input) input.value = salaCode.toUpperCase();
            this._joinRoom && this._joinRoom();
        }, 800);
    },

    _showWaitingRoom(code, playerNumber) {
        document.getElementById('lobby-room-select').style.display = 'none';
        const card = document.getElementById('lobby-card');
        card.style.display = 'block';

        const codeDisplay = document.getElementById('lobby-code-display');
        const codeValue   = document.getElementById('lobby-code-value');
        if (codeDisplay) codeDisplay.style.display = 'block';
        if (codeValue)   codeValue.textContent = code;

        this._showLobby('waiting', playerNumber);
    },

    // ─── Lobby UI ────────────────────────────────────────────────────────────

    _showLobby(state, playerNum) {
        const screen = document.getElementById('lobby-screen');
        if (!screen) return;
        screen.style.display = 'flex';

        const icon    = document.getElementById('lobby-icon');
        const title   = document.getElementById('lobby-title');
        const sub     = document.getElementById('lobby-sub');
        const spinner = document.getElementById('lobby-spinner');
        const spinTxt = document.getElementById('lobby-spin-text');
        const linkBox = document.getElementById('lobby-link-box');
        const actBtn  = document.getElementById('lobby-action-btn');

        const s1icon   = document.getElementById('lobby-slot-1-icon');
        const s1status = document.getElementById('lobby-slot-1-status');
        const s2icon   = document.getElementById('lobby-slot-2-icon');
        const s2status = document.getElementById('lobby-slot-2-status');

        // Reset
        if (actBtn) actBtn.style.display = 'none';
        if (linkBox) linkBox.style.display = 'none';
        if (spinner) spinner.style.display = 'flex';

        const states = {
            connecting: {
                icon: '🌐', title: 'Conectando ao servidor...',
                sub: 'Aguarde um momento.',
                spin: 'Conectando...',
                s1: ['👤', '—'], s2: ['❓', 'Aguardando...']
            },
            waiting: {
                icon: '⏳', title: 'Aguardando oponente...',
                sub: 'Compartilhe o link abaixo para chamar um amigo.',
                spin: 'Aguardando Jogador 2...',
                s1: [playerNum === 1 ? '🟢' : '👤', playerNum === 1 ? 'Você' : 'Conectado'],
                s2: ['❓', 'Aguardando...'],
                showLink: true,
            },
            ready: {
                icon: '🟢', title: 'Oponente conectado!',
                sub: 'Ambos os jogadores estão na sala. Faça o Draft das suas criaturas e clique em "Iniciar Batalha".',
                spin: null,
                s1: ['🟢', playerNum === 1 ? 'Você' : 'Conectado'],
                s2: ['🟢', playerNum === 2 ? 'Você' : 'Conectado'],
                showAction: true,
            },
            drafting: {
                icon: '🃏', title: 'Fazendo o Draft...',
                sub: 'Escolha suas 6 criaturas, battlegears e mugics. Quando terminar, clique em "Iniciar Batalha".',
                spin: null,
                s1: ['🟢', playerNum === 1 ? 'Você' : 'Oponente'],
                s2: ['🟢', playerNum === 2 ? 'Você' : 'Oponente'],
                showAction: true,
                actionLabel: 'Ir para o Draft →',
            },
        };

        const cfg = states[state] || states.connecting;

        if (icon)    icon.textContent    = cfg.icon;
        if (title)   title.textContent   = cfg.title;
        if (sub)     sub.textContent     = cfg.sub;
        if (s1icon)  s1icon.textContent  = cfg.s1[0];
        if (s1status) s1status.textContent = cfg.s1[1];
        if (s2icon)  s2icon.textContent  = cfg.s2[0];
        if (s2status) s2status.textContent = cfg.s2[1];

        if (cfg.spin && spinTxt) {
            spinTxt.textContent = cfg.spin;
            if (spinner) spinner.style.display = 'flex';
        } else {
            if (spinner) spinner.style.display = 'none';
        }

        if (cfg.showLink && linkBox) {
            linkBox.style.display = 'block';
            const input = document.getElementById('lobby-link-input');
            if (input) {
                // Usa URL pública do ngrok se disponível, senão a URL atual
                input.value = this._lobbyPublicUrl || window.location.href;
            }
        }

        if (cfg.showAction && actBtn) {
            // Mostra seletor de modo quando oponente conectar
            const modeSection = document.getElementById('lobby-mode-section');
            if (modeSection) modeSection.style.display = 'block';
            // Botão começa desabilitado — precisa de acordo de modo
            actBtn.style.display   = 'inline-block';
            actBtn.textContent     = cfg.actionLabel || 'Ir para o Draft →';
            actBtn.disabled        = true;
            actBtn.style.opacity   = '0.4';
            actBtn.style.cursor    = 'not-allowed';
        }
    },

    // ─── Nomes dos jogadores ─────────────────────────────────────────────────

    _onLobbyNameChange(value) {
        const name = value.trim() || (this.myPlayerNumber === 1 ? 'Jogador 1' : 'Jogador 2');
        // Atualiza nome próprio
        if (this.myPlayerNumber === 1) {
            this.p1Name = name;
            const el = document.getElementById('lobby-slot-1-name');
            if (el) el.textContent = name;
        } else {
            this.p2Name = name;
            const el = document.getElementById('lobby-slot-2-name');
            if (el) el.textContent = name;
        }
        // Envia ao oponente (com debounce simples)
        clearTimeout(this._nameDebounce);
        this._nameDebounce = setTimeout(() => {
            this.sendAction('player_name', { name });
        }, 400);
    },

    // ─── Sistema de votação de modo ──────────────────────────────────────────

    _voteMode(mode) {
        this._myVote = mode;
        // Persiste voto para sobreviver a reconexões
        try { sessionStorage.setItem('chaotic_vote', mode); } catch(_) {}
        this.setGameMode(mode); // aplica localmente

        // Destaca botão escolhido
        ['6v6','3v3','1v1'].forEach(m => {
            const btn = document.getElementById(`lm-${m}`);
            if (!btn) return;
            const active = m === mode;
            btn.style.borderColor = active ? '#f59e0b' : '#334155';
            btn.style.color       = active ? '#f59e0b' : '#64748b';
            btn.style.background  = active ? 'rgba(245,158,11,0.18)' : 'transparent';
        });

        // Envia voto ao oponente
        this.sendAction('vote_mode', { mode });
        this._updateVoteStatus();
    },

    _updateVoteStatus() {
        const statusEl = document.getElementById('lobby-vote-status');
        const actBtn   = document.getElementById('lobby-action-btn');
        if (!statusEl) return;

        const myVote   = this._myVote;
        const oppVote  = this._oppVote;
        const myLabel  = { '6v6':'⚔️ 6v6', '3v3':'⚡ 3v3', '1v1':'🥊 1v1' };

        if (!myVote) {
            statusEl.style.color = '#64748b';
            statusEl.textContent = 'Escolha um modo acima...';
        } else if (!oppVote) {
            statusEl.style.color = '#f59e0b';
            statusEl.textContent = `Você: ${myLabel[myVote]} — aguardando oponente...`;
        } else if (myVote === oppVote) {
            // ACORDO!
            statusEl.style.color = '#22c55e';
            statusEl.innerHTML = `✅ Acordo! Ambos escolheram <strong>${myLabel[myVote]}</strong>`;
            if (actBtn) {
                actBtn.disabled      = false;
                actBtn.style.opacity = '1';
                actBtn.style.cursor  = 'pointer';
                actBtn.textContent   = `Iniciar Draft (${myVote}) →`;
            }
        } else {
            // DESACORDO
            statusEl.style.color = '#ef4444';
            statusEl.textContent = `⚠️ Você: ${myLabel[myVote]} · Oponente: ${myLabel[oppVote]} — precisam concordar`;
            if (actBtn) {
                actBtn.disabled      = true;
                actBtn.style.opacity = '0.4';
                actBtn.style.cursor  = 'not-allowed';
                actBtn.textContent   = 'Aguardando acordo...';
            }
        }
    },

    _hideLobby() {
        const screen = document.getElementById('lobby-screen');
        if (screen) screen.style.display = 'none';
    },

    _copyLobbyLink() {
        const input = document.getElementById('lobby-link-input');
        if (!input) return;
        navigator.clipboard.writeText(input.value).then(() => {
            const btn = document.getElementById('lobby-copy-btn');
            if (btn) {
                btn.textContent = '✅ Copiado!';
                setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
            }
        }).catch(() => {
            input.select();
            document.execCommand('copy');
        });
    },

    _lobbyAction() {
        // Fecha o lobby e renderiza o draft (que ainda não foi chamado em multiplayer)
        this._hideLobby();
        if (this.draftedCards.length === 0) this.renderDraft();
    },

    _exitLobbyToSolo(mode = '6v6') {
        // Desativa multiplayer e vai direto ao draft solo com o modo escolhido
        this.multiplayerMode = false;
        this.setGameMode(mode);
        if (this.socket) {
            this._intentionalDisconnect = true; // impede o overlay de "Conexão perdida"
            this.socket.disconnect();
            this.socket = null;
        }
        this._hideLobby();
        this.log(`🎮 Modo solo ${mode} ativado.`);
        if (this.draftedCards.length === 0) this.renderDraft();
    },

    _connectSocket() {
        if (typeof io === 'undefined') return;

        this.socket = io({
            reconnection:         true,
            reconnectionAttempts: 10,
            reconnectionDelay:    1000,
            reconnectionDelayMax: 5000,
            timeout:              10000,
        });
        this.multiplayerMode = true;
        this._reconnecting   = false;

        // ── Conectou ao servidor — mostra seleção de sala ───────────────────
        this.socket.on('connect', () => {
            this._hideReconnectOverlay();
            if (!this._reconnecting) {
                const screen = document.getElementById('lobby-screen');
                if (screen) screen.style.display = 'flex';
                this._showRoomSelect();
            }
        });

        // ── Sala criada com sucesso (sou P1) ─────────────────────────────────
        this.socket.on('room_created', ({ code, playerNumber }) => {
            this.myPlayerNumber = playerNumber;
            this._myRoomCode    = code;
            this.log(`🌐 Sala ${code} criada — aguardando oponente`);
            // Persiste para reconexão automática
            try { sessionStorage.setItem('chaotic_room', JSON.stringify({ code, playerNum: playerNumber, playerName: this._getPlayerName() })); } catch(_) {}
            this._showWaitingRoom(code, playerNumber);
        });

        // ── Entrou em sala com sucesso (sou P2) ───────────────────────────────
        this.socket.on('room_joined', ({ code, playerNumber, opponentName }) => {
            this.myPlayerNumber = playerNumber;
            this._myRoomCode    = code;
            this.log(`🌐 Entrou na sala ${code} — oponente: ${opponentName}`);

            // Atualiza nome do P1 (oponente) no slot
            if (this.myPlayerNumber === 2) {
                this.p1Name = opponentName;
                const el = document.getElementById('lobby-slot-1-name');
                if (el) el.textContent = opponentName;
            }

            document.getElementById('lobby-room-select').style.display = 'none';
            document.getElementById('lobby-card').style.display        = 'block';
            document.getElementById('lobby-code-display') && (document.getElementById('lobby-code-display').style.display = 'none');
        });

        // ── Erro ao entrar em sala ─────────────────────────────────────────────
        this.socket.on('join_error', ({ message }) => {
            const errEl = document.getElementById('lobby-join-error');
            if (errEl) { errEl.textContent = message; errEl.style.display = 'block'; }
        });

        // ── Lista de salas públicas ───────────────────────────────────────────
        this.socket.on('public_rooms', (list) => {
            this._renderPublicRooms(list);
        });

        // ── P2 entrou na sala (recebido pelo P1) ──────────────────────────────
        this.socket.on('opponent_joined', ({ opponentName, playerNumber }) => {
            this.p2Name = opponentName;
            const el = document.getElementById('lobby-slot-2-name');
            if (el) el.textContent = opponentName;
        });

        // ── Sala pronta — ambos conectados ────────────────────────────────────
        this.socket.on('room_ready', () => {
            this.log('🟢 Oponente conectado! Façam o Draft e cliquem em Iniciar Batalha.');
            this._showLobby('ready', this.myPlayerNumber);
            const myName = this._getPlayerName();
            if (this.myPlayerNumber === 1) this.p1Name = myName;
            else this.p2Name = myName;
            this.sendAction('player_name', { name: myName });
        });

        this.socket.on('waiting', () => {
            this.log('⏳ Aguardando segundo jogador conectar...');
        });

        this.socket.on('action', (data) => {
            this.executeRemoteAction(data);
        });

        // Oponente desconectou — aguarda reconexão com countdown
        this.socket.on('opponent_reconnecting', ({ playerName, timeout }) => {
            this.log(`⚠️ ${playerName || 'Oponente'} desconectou. Aguardando reconexão (${timeout}s)...`);
            this._showReconnectWaitOverlay(playerName || 'Oponente', timeout);
        });

        // Oponente reconectou — cancela o overlay de espera
        this.socket.on('opponent_reconnected', ({ playerName }) => {
            this.log(`✅ ${playerName || 'Oponente'} reconectou!`);
            this._hideReconnectWaitOverlay();
            // P1 reenvia o estado ao oponente que voltou
            if (this.myPlayerNumber === 1 && this.appState === 'BATTLE') {
                setTimeout(() => this._sendBoardStateToSpectator(), 800);
            }
        });

        // Abandono definitivo (60s sem reconexão)
        this.socket.on('opponent_disconnected', () => {
            this.log('❌ Oponente abandonou a partida.');
            this._hideReconnectWaitOverlay();
            this._showOpponentDisconnectBanner();
        });

        // ── Eventos de reconexão ──────────────────────────────────────────────

        this.socket.on('disconnect', (reason) => {
            // Desconexão intencional (modo solo, revanche) — silencia o overlay
            if (this._intentionalDisconnect) {
                this._intentionalDisconnect = false;
                return;
            }
            this.log(`⚠️ Conexão perdida: ${reason}. Tentando reconectar...`);
            this._reconnecting = true;
            this._showReconnectOverlay('Conexão perdida. Reconectando...');
        });

        this.socket.on('reconnect_attempt', (attempt) => {
            this._updateReconnectOverlay(`Reconectando... (tentativa ${attempt}/10)`);
        });

        this.socket.on('reconnect', (attempt) => {
            this.log(`✅ Reconectado após ${attempt} tentativa(s)!`);

            // Tenta reentrar na sala automaticamente
            try {
                const roomData = JSON.parse(sessionStorage.getItem('chaotic_room') || 'null');
                if (roomData && roomData.code) {
                    this.log(`↩️ Tentando reentrar na sala ${roomData.code}...`);
                    this.socket.emit('rejoin_room', {
                        code:       roomData.code,
                        playerNum:  roomData.playerNum,
                        playerName: roomData.playerName || this._getPlayerName()
                    });
                    return; // aguarda rejoin_ok ou rejoin_error
                }
            } catch(_) {}

            // Restaura voto de modo se não tinha sala para reentrar
            try {
                const savedVote = sessionStorage.getItem('chaotic_vote');
                if (savedVote && !this._myVote) {
                    this._myVote = savedVote;
                    this.setGameMode(savedVote);
                    this.sendAction('vote_mode', { mode: savedVote });
                    this._updateVoteStatus();
                }
            } catch(_) {}
        });

        this.socket.on('reconnect_failed', () => {
            this._reconnecting = false;
            this._updateReconnectOverlay('Não foi possível reconectar.', true);
            this.log('❌ Falha ao reconectar após 10 tentativas.');
        });

        // Reentrada na sala confirmada
        this.socket.on('rejoin_ok', ({ code, playerNum }) => {
            this.myPlayerNumber = playerNum;
            this._myRoomCode    = code;
            this._reconnecting  = false;
            this._hideReconnectOverlay();
            this.log(`↩️ Voltou à sala ${code} como Jogador ${playerNum}!`);
            // Pede o estado atual ao oponente
            setTimeout(() => {
                if (this.socket) this.socket.emit('spectate_request_state');
            }, 500);
        });

        this.socket.on('rejoin_error', ({ message }) => {
            this._reconnecting = false;
            this._updateReconnectOverlay(`Não foi possível reentrar: ${message}`, true);
            try { sessionStorage.removeItem('chaotic_room'); } catch(_) {}
        });

        this.socket.on('reconnect_error', () => {
            // silencioso — o overlay já está visível
        });

        // ── Resposta ao pedido de resync ──────────────────────────────────────
        this.socket.on('resync_state', (data) => {
            this.log('📡 Estado de jogo restaurado!');
            this._applyResyncState(data);
            this._hideReconnectOverlay();
        });

        // sync_state: enviado pelos jogadores para espectadores (e também após morte de criatura)
        this.socket.on('sync_state', (data) => {
            if (!this.isSpectator) return; // jogadores já processam via action
            this._applyResyncState(data);
            this.renderBoard();
            this.renderLocation && this.renderLocation();
        });

        // ── Modo espectador ───────────────────────────────────────────────────
        this.socket.on('spectate_joined', ({ p1Name, p2Name, spectatorCount, gameMode }) => {
            this.isSpectator     = true;
            this.multiplayerMode = true;
            this.p1Name          = p1Name;
            this.p2Name          = p2Name;
            if (gameMode) this.setGameMode(gameMode);

            this.log(`👁️ Entrando como espectador — ${p1Name} vs ${p2Name} (${spectatorCount} espectadores)`);

            // Navega para a tela de batalha
            const lobby  = document.getElementById('lobby-screen');
            const setup  = document.getElementById('setup-screen');
            const game   = document.getElementById('game-container');
            const draft  = document.getElementById('draft-screen');
            const battle = document.getElementById('battle-screen');
            if (lobby)  lobby.style.display  = 'none';
            if (setup)  setup.style.display  = 'none';
            if (game)   game.style.display   = '';
            if (draft)  draft.classList.add('hidden');
            if (battle) battle.classList.remove('hidden');

            this.appState = 'BATTLE';
            this._showSpectatorBanner(p1Name, p2Name, spectatorCount);

            // Solicita o estado atual do tabuleiro via servidor
            if (this.socket) this.socket.emit('spectate_request_state');
        });

        this.socket.on('spectate_error', ({ message }) => {
            this.showAlert('❌ Erro ao Espectatar', message);
        });

        this.socket.on('spectator_joined', ({ name, count }) => {
            this._updateSpectatorCount(count);
            this.log(`👁️ ${name} entrou como espectador (${count} total).`);
            // Só P1 envia o estado (evita duplicata)
            if (this.myPlayerNumber === 1 && this.appState === 'BATTLE') {
                this._sendBoardStateToSpectator();
            }
        });

        this.socket.on('spectator_left', ({ count }) => {
            this._updateSpectatorCount(count);
        });

        // Espectador pediu o estado — P1 responde com o tabuleiro atual
        this.socket.on('spectate_send_state', () => {
            if (this.myPlayerNumber === 1 && this.appState === 'BATTLE') {
                this._sendBoardStateToSpectator();
            }
        });

        // Recebe URL pública do ngrok quando ela fica disponível (pode chegar depois da conexão)
        this.socket.on('public_url', ({ publicUrl }) => {
            if (!publicUrl) return;
            this._lobbyPublicUrl = publicUrl;
            // Atualiza o campo do lobby se ainda estiver visível
            const input = document.getElementById('lobby-link-input');
            if (input) input.value = publicUrl;
            this.log(`🌐 Link público: ${publicUrl}`);
        });
    },

    // ─── Overlay de reconexão ────────────────────────────────────────────────

    _showReconnectOverlay(msg) {
        let overlay = document.getElementById('reconnect-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'reconnect-overlay';
            overlay.innerHTML = `
                <div id="reconnect-box">
                    <div class="reconnect-spinner"></div>
                    <div id="reconnect-msg" class="reconnect-msg">${msg}</div>
                    <button id="reconnect-reload" class="reconnect-reload hidden" onclick="location.reload()">
                        🔄 Recarregar página
                    </button>
                </div>`;
            document.body.appendChild(overlay);
        } else {
            document.getElementById('reconnect-msg').textContent = msg;
            document.getElementById('reconnect-reload').classList.add('hidden');
        }
        overlay.classList.remove('hidden');
    },

    _updateReconnectOverlay(msg, showReload = false) {
        const msgEl    = document.getElementById('reconnect-msg');
        const reloadEl = document.getElementById('reconnect-reload');
        if (msgEl)    msgEl.textContent = msg;
        if (reloadEl) reloadEl.classList.toggle('hidden', !showReload);
    },

    _hideReconnectOverlay() {
        const overlay = document.getElementById('reconnect-overlay');
        if (overlay) overlay.classList.add('hidden');
    },

    _showOpponentDisconnectBanner() {
        // Banner temporário — diferente do overlay de reconexão própria
        let banner = document.getElementById('opp-disconnect-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'opp-disconnect-banner';
            banner.style.cssText = `
                position:fixed; top:70px; left:50%; transform:translateX(-50%);
                background:rgba(239,68,68,0.92); color:#fff; border-radius:10px;
                padding:10px 24px; font-size:14px; font-weight:700; z-index:9999;
                box-shadow:0 4px 20px rgba(0,0,0,0.5); cursor:pointer;
            `;
            banner.textContent = '❌ Oponente desconectou. Aguardando reconexão...';
            banner.title = 'Clique para fechar';
            banner.onclick = () => banner.remove();
            document.body.appendChild(banner);
        }
        // Auto-remove após 8s se o oponente reconectar
        setTimeout(() => banner && banner.parentNode && banner.remove(), 8000);
    },

    // ─── Re-sync de estado ───────────────────────────────────────────────────

    _applyResyncState(data) {
        if (!data) return;

        // ── Estado de batalha ─────────────────────────────────────────────────
        if (data.boardP1)            this.boardP1        = data.boardP1;
        if (data.boardP2)            this.boardP2        = data.boardP2;
        if (data.turn !== undefined) this.turn           = data.turn;
        if (data.activeLocation)     this.activeLocation = data.activeLocation;
        if (data.locationDeck)       this.locationDeck   = data.locationDeck;
        if (data.p1AttackHand)       this.p1AttackHand   = data.p1AttackHand;
        if (data.p2AttackHand)       this.p2AttackHand   = data.p2AttackHand;
        if (data.p1AttackDeck)       this.p1AttackDeck    = data.p1AttackDeck;
        if (data.p2AttackDeck)       this.p2AttackDeck    = data.p2AttackDeck;
        if (data.p1AttackDiscard)    this.p1AttackDiscard = data.p1AttackDiscard;
        if (data.p2AttackDiscard)    this.p2AttackDiscard = data.p2AttackDiscard;
        if (data.playerMugics)       this.playerMugics   = data.playerMugics;
        if (data.p2Mugics)           this.p2Mugics       = data.p2Mugics;
        if (data.appState)           this.appState       = data.appState;
        if (data.gameState)          this.gameState      = data.gameState;

        // ── Draft (reconexão durante fase de draft) ───────────────────────────
        if (data.draftedCards)       this.draftedCards       = data.draftedCards;
        if (data.draftedBattlegears) this.draftedBattlegears = data.draftedBattlegears;
        if (data.draftedMugics)      this.draftedMugics      = data.draftedMugics;
        if (data.draftedAttacks)     this.draftedAttacks     = data.draftedAttacks;
        if (data.draftState)         this.draftState         = data.draftState;

        // ── Voto de modo (restaura UI de votação se ainda no lobby) ──────────
        if (data.oppVote && !this._oppVote) {
            this._oppVote = data.oppVote;
            this._updateVoteStatus && this._updateVoteStatus();
        }

        // ── Re-renderiza a tela correta conforme estado restaurado ────────────
        if (this.appState === 'BATTLE') {
            this.renderBoard();
            this.renderMugics();
            this.renderLocation && this.renderLocation();
        } else if (this.appState === 'DRAFT') {
            this.renderDraft && this.renderDraft();
        }
    },

    // ─── Actions ─────────────────────────────────────────────────────────────

    sendAction(type, data = {}) {
        if (!this.socket || !this.multiplayerMode) return;
        if (this.isSpectator) return; // espectadores nunca enviam ações

        // Se desconectado, enfileira a action para reenviar após reconexão
        if (!this.socket.connected) {
            this._pendingActions = this._pendingActions || [];
            this._pendingActions.push({ type, data });
            this.log(`📤 Ação "${type}" enfileirada (sem conexão).`);
            return;
        }

        // Reenviar ações pendentes antes da nova
        if (this._pendingActions && this._pendingActions.length > 0) {
            const pending = this._pendingActions.splice(0);
            pending.forEach(a => this.socket.emit('action', { type: a.type, ...a.data }));
        }

        this.socket.emit('action', { type, ...data });
    },

    isMyTurn() {
        if (!this.multiplayerMode) return this.turn === 1;
        return this.turn === this.myPlayerNumber;
    },

    executeRemoteAction(data) {
        switch (data.type) {
            case 'sync_board_state':
                // Corrige desync: aceita o tabuleiro autoritativo do oponente após morte de criatura
                if (data.boardP1) this.boardP1 = data.boardP1;
                if (data.boardP2) this.boardP2 = data.boardP2;
                if (data.activeLocation !== undefined) this.activeLocation = data.activeLocation;
                // Fecha burst modal e limpa estado de combate para sincronizar com o resultado
                this.closeBurstModal && this.closeBurstModal();
                // Fecha modal de ataque se estiver aberto
                const atkModal = document.getElementById('attack-modal');
                if (atkModal) { atkModal.classList.add('hidden'); atkModal.classList.remove('flex-modal','modal-minimized'); }
                this.activeCombat     = null;
                this.selectedAttacker = null;
                this.gameState        = 'IDLE';
                this.burstStack       = [];
                this.burstPasses      = 0;
                this.pendingCombat    = null;
                this.renderBoard();
                this.renderLocation && this.renderLocation();
                this.log('🔄 Combate resolvido — tabuleiro sincronizado.');
                break;

            case 'player_name': {
                const oppName = data.name || (this.myPlayerNumber === 1 ? 'Jogador 2' : 'Jogador 1');
                // Salva nome do oponente
                if (this.myPlayerNumber === 1) {
                    this.p2Name = oppName;
                    const el = document.getElementById('lobby-slot-2-name');
                    if (el) el.textContent = oppName;
                } else {
                    this.p1Name = oppName;
                    const el = document.getElementById('lobby-slot-1-name');
                    if (el) el.textContent = oppName;
                }
                break;
            }

            case 'vote_mode':
                // Ignora durante batalha — setGameMode reseta os tabuleiros!
                if (this.appState === 'BATTLE') break;
                this._oppVote = data.mode;
                if (this._myVote && this._oppVote === this._myVote) {
                    this.setGameMode(data.mode);
                }
                this._updateVoteStatus();
                break;

            case 'opponent_draft':
                // NÃO ignorar durante BATTLE — pode chegar depois de startBattle() que
                // já seta appState='BATTLE' antes de receber o draft do oponente
                this.remoteDraft = data.draft;
                this.log('📦 Draft do oponente recebido!');
                if (this.myDraftReady) this._startBattleMultiplayer();
                break;
            case 'move':
                this.resolveMove(data.player, data.fromR, data.fromC, data.toR, data.toC, true);
                break;
            case 'startCombat': {
                const attacker = data.initiatingPlayer === 1
                    ? this.boardP1[data.atkR][data.atkC]
                    : this.boardP2[data.atkR][data.atkC];
                const defender = data.initiatingPlayer === 1
                    ? this.boardP2[data.defR][data.defC]
                    : this.boardP1[data.defR][data.defC];
                if (attacker && defender) {
                    this.startCombat(attacker, defender, data.atkR, data.atkC, data.defR, data.defC, data.initiatingPlayer, true);
                }
                break;
            }
            case 'confirmAttack':
                if (this.activeCombat) this.confirmAttack(data.cardIndex, true);
                break;
            case 'passBurst':
                if (this.activeCombat) this.passBurst(true);
                break;
            case 'selectMugic':
                // Guarda os dados da mugic para usar quando resolveMugicCaster chegar
                if (data.mugicData) this._pendingRemoteMugicData = data.mugicData;
                this.selectMugicToPlay(data.index, true);
                break;
            case 'resolveMugicCaster':
                // Guarda qual jogador era o caster para usar o board correto
                this._pendingRemoteCasterPlayerNum = data.casterPlayerNum || 2;
                this.resolveMugicCaster(data.r, data.c, true);
                break;
            case 'cancelMugicCaster':
                this.cancelMugicCaster(true);
                break;
            case 'nextTurn':
                this.nextTurn(true);
                break;
            case 'gameOver': {
                const winner = data.winner;
                const isWin  = winner === this.myPlayerNumber || winner === 0;
                this._showWinScreen(isWin, winner === 0, winner);
                break;
            }
            case 'sync_initial_state':
                this.p1AttackDeck  = data.p1AttackDeck;
                this.p2AttackDeck  = data.p2AttackDeck;
                this.p1AttackHand  = data.p1AttackHand;
                this.p2AttackHand  = data.p2AttackHand;
                this.locationDeck  = data.locationDeck;
                this.p2Mugics      = data.p2Mugics;
                this.activeLocation = data.activeLocation;
                this.renderLocation();
                this.log(`📍 Local Inicial: ${this.activeLocation ? this.activeLocation.name : '—'}!`);
                if (this.activeLocation) this.showLocationToast(this.activeLocation, false);
                break;

            case 'rematch_request':
                this._handleRematchRequest && this._handleRematchRequest();
                break;

            case 'rematch_accept':
                // Oponente aceitou — executa rematch do meu lado
                this._executeMultiplayerRematch && this._executeMultiplayerRematch();
                break;

            case 'chat_msg': {
                const senderName = this.myPlayerNumber === 1
                    ? (this.p2Name || 'Oponente')
                    : (this.p1Name || 'Oponente');
                // Remove indicador de digitando ao receber mensagem
                document.getElementById('chat-typing-indicator')?.remove();
                clearTimeout(this._typingHideTimeout);
                this._receiveChatMessage(senderName, data.msg, Date.now(), false);
                break;
            }

            case 'tournament_start':
                // Oponente iniciou torneio — sincroniza estado e aceita rematch
                this._tournament = data.t ? { ...data.t } : { p1Wins:0, p2Wins:0, game:1, maxWins:2 };
                this.log(`🏆 Torneio iniciado — Melhor de ${this._tournament.maxWins * 2 - 1}!`);
                this._handleRematchRequest && this._handleRematchRequest();
                break;

            case 'tournament_score':
                // Sincroniza placar intermediário
                if (data.t && this._tournament) {
                    this._tournament.p1Wins = data.t.p1Wins;
                    this._tournament.p2Wins = data.t.p2Wins;
                    this._tournament.game   = data.t.game;
                }
                break;

            case 'chat_typing': {
                const typingName = this.myPlayerNumber === 1
                    ? (this.p2Name || 'Oponente')
                    : (this.p1Name || 'Oponente');
                this._showTypingIndicator(typingName);
                break;
            }
        }
    },

    _startBattleMultiplayer() {
        if (!this.remoteDraft) return;

        const rd = this.remoteDraft;

        if (this.myPlayerNumber === 1) {
            const p2Cards = rd.cards.map(c => this._initCard(c, 2));
            const p2Bg = rd.battlegears;
            this.playerMugics = JSON.parse(JSON.stringify(this.draftedMugics));
            this.p2Mugics     = JSON.parse(JSON.stringify(rd.mugics));
            // P1 chama setupBoard normalmente para posicionar as próprias cartas (P1)
            // usando _customFormation; as cartas de P2 são posicionadas com a formação enviada por P2
            this.setupBoard(p2Cards, p2Bg, rd.formationOrder);

            this._generateSharedState();
            this.sendAction('sync_initial_state', {
                p1AttackDeck:  this.p1AttackDeck,
                p2AttackDeck:  this.p2AttackDeck,
                p1AttackHand:  this.p1AttackHand,
                p2AttackHand:  this.p2AttackHand,
                locationDeck:  this.locationDeck,
                p2Mugics:      this.p2Mugics,
                activeLocation: this.activeLocation
            });

            this._finishStartBattle();
        } else {
            const p1Cards = rd.cards.map(c => this._initCard(c, 1));
            const p1Bg = rd.battlegears;

            // Posiciona cartas de P1 no boardP1 usando a formação enviada por P1
            this._placeCardsOnBoard(p1Cards, p1Bg, this.boardP1, 1, rd.formationOrder);
            this.playerMugics = JSON.parse(JSON.stringify(this.draftedMugics));

            // Posiciona as próprias cartas (P2) no boardP2 usando _customFormation
            this._placeCardsOnBoard(
                this.draftedCards, this.draftedBattlegears,
                this.boardP2, 2,
                this._customFormation ? this._customFormation.map(c => c ? c.name : null) : null
            );
            this.p2Mugics = JSON.parse(JSON.stringify(this.draftedMugics));

            this._finishStartBattle();
        }
    },

    _generateSharedState() {
        this.p1AttackDeck = [];
        this.p2AttackDeck = [];
        this.p1AttackHand = [];
        this.p2AttackHand = [];
        this.locationDeck = [];

        if (this.attacksData && this.attacksData.length > 0) {
            const deckSize = this._getAttackDeckSize();

            // P1 usa deck escolhido (já enviado via opponent_draft e guardado em remoteDraft.attacks)
            // P1 é quem chama _generateSharedState, então usa draftedAttacks
            const p1Attacks = (this.draftedAttacks && this.draftedAttacks.length === deckSize)
                ? [...this.draftedAttacks].sort(() => Math.random() - 0.5)
                : Array.from({ length: deckSize }, () =>
                    this.attacksData[Math.floor(Math.random() * this.attacksData.length)]);

            // P2 attacks vêm do remoteDraft
            const rd = this.remoteDraft;
            const p2Attacks = (rd && rd.attacks && rd.attacks.length === deckSize)
                ? [...rd.attacks].sort(() => Math.random() - 0.5)
                : Array.from({ length: deckSize }, () =>
                    this.attacksData[Math.floor(Math.random() * this.attacksData.length)]);

            this.p1AttackDeck = p1Attacks;
            this.p2AttackDeck = p2Attacks;
            this.p1AttackHand.push(this.p1AttackDeck.pop());
            this.p1AttackHand.push(this.p1AttackDeck.pop());
            this.p2AttackHand.push(this.p2AttackDeck.pop());
            this.p2AttackHand.push(this.p2AttackDeck.pop());
        }

        if (this.locationsData && this.locationsData.length > 0) {
            let available = [...this.locationsData, ...this.locationsData];
            for (let i = 0; i < 10; i++) {
                if (available.length === 0) break;
                const idx = Math.floor(Math.random() * available.length);
                this.locationDeck.push(available[idx]);
                available.splice(idx, 1);
            }
        }

        if (this.locationDeck.length > 0) {
            this.activeLocation = this.locationDeck.pop();
        }
    },

    _finishStartBattle() {
        this._boardEntryPending = true;
        this.renderBoard();
        this.renderMugics();
        this.renderLocation();
        const myRole = this.myPlayerNumber === 1 ? 'Jogador 1 (você ataca primeiro)' : 'Jogador 2 (aguarde o Jogador 1)';
        this.log(`⚔️ Batalha Multiplayer iniciada! ${myRole}`);

        // Mostra botão de chat (só em partidas multiplayer reais)
        const chatBtn = document.getElementById('chat-toggle-btn');
        if (chatBtn) chatBtn.style.display = 'flex';
    },

});
