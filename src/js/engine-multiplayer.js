// engine-multiplayer.js
Object.assign(GameEngine.prototype, {

    initMultiplayer() {
        if (typeof io === 'undefined') return;

        this._connectSocket();
    },

    _connectSocket() {
        if (typeof io === 'undefined') return;

        this.socket = io({
            reconnection:        true,
            reconnectionAttempts: 10,        // até 10 tentativas
            reconnectionDelay:    1000,       // espera 1s antes da 1ª tentativa
            reconnectionDelayMax: 5000,       // no máximo 5s entre tentativas
            timeout:              10000,
        });
        this.multiplayerMode = true;
        this._reconnecting   = false;

        // ── Conexão bem-sucedida ───────────────────────────────────────────────
        this.socket.on('assigned', ({ playerNumber }) => {
            this.myPlayerNumber = playerNumber;
            this.log(`🌐 Modo Multiplayer ativo — Você é o Jogador ${playerNumber}`);
            this._hideReconnectOverlay();

            // Se estava reconectando e a batalha já havia começado, pede re-sync
            if (this._reconnecting && this.appState === 'BATTLE') {
                this._reconnecting = false;
                this.log('🔄 Reconectado! Solicitando sincronização de estado...');
                this.sendAction('request_resync');
            }
            this._reconnecting = false;
        });

        this.socket.on('waiting', () => {
            this.log('⏳ Aguardando segundo jogador conectar...');
        });

        this.socket.on('room_ready', () => {
            this.log('🟢 Oponente conectado! Façam o Draft e cliquem em Iniciar Batalha.');
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

            const p1Formation = [{r:2,c:0},{r:1,c:0},{r:1,c:1},{r:0,c:0},{r:0,c:1},{r:0,c:2}];
            p1Cards.forEach((card, i) => {
                if (i < p1Formation.length) {
                    const pos = p1Formation[i];
                    if (p1Bg && p1Bg[i]) { card.battlegear = JSON.parse(JSON.stringify(p1Bg[i])); card.bgRevealed = false; }
                    this.boardP1[pos.r][pos.c] = card;
                }
            });
            this.playerMugics = JSON.parse(JSON.stringify(this.draftedMugics));

            const p2Formation = [{r:2,c:0},{r:1,c:0},{r:1,c:1},{r:0,c:0},{r:0,c:1},{r:0,c:2}];
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
        this.renderBoard();
        this.renderMugics();
        this.renderLocation();
        const myRole = this.myPlayerNumber === 1 ? 'Jogador 1 (você ataca primeiro)' : 'Jogador 2 (aguarde o Jogador 1)';
        this.log(`⚔️ Batalha Multiplayer iniciada! ${myRole}`);
    },

});
