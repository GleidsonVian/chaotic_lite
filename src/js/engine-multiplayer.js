// engine-multiplayer.js
Object.assign(GameEngine.prototype, {

    initMultiplayer() {
        if (typeof io === 'undefined') return;
        // Modo multiplayer: pula a tela de setup e vai direto pro lobby
        const setup = document.getElementById('setup-screen');
        const game  = document.getElementById('game-container');
        if (setup) setup.style.display = 'none';
        if (game)  game.style.display  = '';
        this._showLobby('connecting');
        this._connectSocket();
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

    // ─── Sistema de votação de modo ──────────────────────────────────────────

    _voteMode(mode) {
        this._myVote = mode;
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

    _exitLobbyToSolo() {
        // Desativa multiplayer e vai direto ao draft solo
        this.multiplayerMode = false;
        if (this.socket) { this.socket.disconnect(); this.socket = null; }
        this._hideLobby();
        this.log('🎮 Modo solo ativado.');
        if (this.draftedCards.length === 0) this.renderDraft();
    },

    _connectSocket() {
        if (typeof io === 'undefined') return;

        this.socket = io({
            reconnection:        true,
            reconnectionAttempts: 10,
            reconnectionDelay:    1000,
            reconnectionDelayMax: 5000,
            timeout:              10000,
        });
        this.multiplayerMode = true;
        this._reconnecting   = false;

        // ── Conexão bem-sucedida ─────────────────────────────────────────────
        this.socket.on('assigned', ({ playerNumber, publicUrl }) => {
            this.myPlayerNumber = playerNumber;
            if (publicUrl) this._lobbyPublicUrl = publicUrl;
            this.log(`🌐 Modo Multiplayer ativo — Você é o Jogador ${playerNumber}`);
            this._hideReconnectOverlay();

            if (this._reconnecting && this.appState === 'BATTLE') {
                this._reconnecting = false;
                this.log('🔄 Reconectado! Solicitando sincronização de estado...');
                this.sendAction('request_resync');
            }
            this._reconnecting = false;
            this._showLobby('waiting', playerNumber);
        });

        this.socket.on('waiting', () => {
            this.log('⏳ Aguardando segundo jogador conectar...');
            this._showLobby('waiting', this.myPlayerNumber);
        });

        this.socket.on('room_ready', () => {
            this.log('🟢 Oponente conectado! Façam o Draft e cliquem em Iniciar Batalha.');
            this._showLobby('ready', this.myPlayerNumber);
        });

        this.socket.on('action', (data) => {
            this.executeRemoteAction(data);
        });

        this.socket.on('opponent_disconnected', () => {
            this.log('❌ Oponente desconectou.');
            this._showOpponentDisconnectBanner();
        });

        // ── Eventos de reconexão ──────────────────────────────────────────────

        this.socket.on('disconnect', (reason) => {
            this.log(`⚠️ Conexão perdida: ${reason}. Tentando reconectar...`);
            this._reconnecting = true;
            this._showReconnectOverlay('Conexão perdida. Reconectando...');
        });

        this.socket.on('reconnect_attempt', (attempt) => {
            this._updateReconnectOverlay(`Reconectando... (tentativa ${attempt}/10)`);
        });

        this.socket.on('reconnect', (attempt) => {
            this.log(`✅ Reconectado após ${attempt} tentativa(s)!`);
            // O evento 'assigned' vai chegar logo depois e tratar o resync
        });

        this.socket.on('reconnect_failed', () => {
            this._reconnecting = false;
            this._updateReconnectOverlay('Não foi possível reconectar.', true);
            this.log('❌ Falha ao reconectar após 10 tentativas.');
        });

        this.socket.on('reconnect_error', () => {
            // silencioso — o overlay já está visível
        });

        // ── Resposta ao pedido de resync (servidor envia estado atual) ─────────
        this.socket.on('resync_state', (data) => {
            this.log('📡 Estado de jogo restaurado!');
            this._applyResyncState(data);
            this._hideReconnectOverlay();
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
        // Restaura apenas os campos que podem ter mudado durante a desconexão
        if (data.boardP1)        this.boardP1        = data.boardP1;
        if (data.boardP2)        this.boardP2        = data.boardP2;
        if (data.turn !== undefined) this.turn       = data.turn;
        if (data.activeLocation) this.activeLocation = data.activeLocation;
        if (data.locationDeck)   this.locationDeck   = data.locationDeck;
        if (data.p1AttackHand)   this.p1AttackHand   = data.p1AttackHand;
        if (data.p2AttackHand)   this.p2AttackHand   = data.p2AttackHand;
        if (data.playerMugics)   this.playerMugics   = data.playerMugics;
        if (data.p2Mugics)       this.p2Mugics       = data.p2Mugics;

        this.renderBoard();
        this.renderMugics();
        this.renderLocation();
    },

    // ─── Actions ─────────────────────────────────────────────────────────────

    sendAction(type, data = {}) {
        if (!this.socket || !this.multiplayerMode) return;

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
            case 'vote_mode':
                this._oppVote = data.mode;
                // Se oponente votou no mesmo modo que eu, aplica
                if (this._myVote && this._oppVote === this._myVote) {
                    this.setGameMode(data.mode);
                }
                this._updateVoteStatus();
                break;

            case 'opponent_draft':
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
                this.selectMugicToPlay(data.index, true);
                break;
            case 'resolveMugicCaster':
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
        }
    },

    _startBattleMultiplayer() {
        if (!this.remoteDraft) return;

        const rd = this.remoteDraft;

        if (this.myPlayerNumber === 1) {
            const p2Cards = rd.cards.map(c => {
                const card = JSON.parse(JSON.stringify(c));
                card.player = 2; card.maxEnergy = card.energy;
                if (card.mugicCounters === undefined) card.mugicCounters = 0;
                return card;
            });
            const p2Bg = rd.battlegears;
            this.playerMugics = JSON.parse(JSON.stringify(this.draftedMugics));
            this.p2Mugics     = JSON.parse(JSON.stringify(rd.mugics));
            this.setupBoard(p2Cards, p2Bg);

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
            const p1Cards = rd.cards.map(c => {
                const card = JSON.parse(JSON.stringify(c));
                card.player = 1; card.maxEnergy = card.energy;
                if (card.mugicCounters === undefined) card.mugicCounters = 0;
                return card;
            });
            const p1Bg = rd.battlegears;

            const p1Formation = this._getFormation();
            p1Cards.forEach((card, i) => {
                if (i < p1Formation.length) {
                    const pos = p1Formation[i];
                    if (p1Bg && p1Bg[i]) { card.battlegear = JSON.parse(JSON.stringify(p1Bg[i])); card.bgRevealed = false; }
                    this.boardP1[pos.r][pos.c] = card;
                }
            });
            this.playerMugics = JSON.parse(JSON.stringify(this.draftedMugics));

            const p2Formation = this._getFormation();
            this.draftedCards.forEach((baseCard, i) => {
                if (i < p2Formation.length) {
                    const pos = p2Formation[i];
                    const card = JSON.parse(JSON.stringify(baseCard));
                    card.player = 2; card.maxEnergy = card.energy;
                    if (card.mugicCounters === undefined) card.mugicCounters = 0;
                    if (this.draftedBattlegears && this.draftedBattlegears[i]) {
                        card.battlegear = JSON.parse(JSON.stringify(this.draftedBattlegears[i]));
                        card.bgRevealed = false;
                    }
                    this.boardP2[pos.r][pos.c] = card;
                }
            });
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
            for (let i = 0; i < 20; i++) {
                this.p1AttackDeck.push(this.attacksData[Math.floor(Math.random() * this.attacksData.length)]);
                this.p2AttackDeck.push(this.attacksData[Math.floor(Math.random() * this.attacksData.length)]);
            }
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
    },

});
