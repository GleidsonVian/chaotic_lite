// engine-board.js
Object.assign(GameEngine.prototype, {

    renderMugics() {
        const container = document.getElementById("player-hand");
        if (!container) return;

        let html = '';
        this.playerMugics.forEach((mugic, index) => {
            const isSelected = this.selectedMugic === index;
            const selClass = isSelected ? ' selected' : '';
            const tribeColor = (mugic.tribe === 'OverWorld') ? 'var(--overworld)'
                              : (mugic.tribe === 'UnderWorld') ? 'var(--underworld)'
                              : (mugic.tribe === 'Mipedian') ? 'var(--mipedian)'
                              : (mugic.tribe === 'Danian') ? 'var(--danian)'
                              : (mugic.tribe === "M'arrillian") ? 'var(--marrillian)'
                              : 'var(--accent)';

            // montar estilo da arte: usa imagem se disponível, senão fallback para cor da tribo
            const artStyle = mugic.image
                ? `background-image: linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.5)), url('${mugic.image}'); background-size: cover; background-position: center;`
                : `background: linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.45)), ${tribeColor};`;

            html += `
                <div class="mugic-card${selClass}"
                     onclick="game.handleMugicClick(${index})"
                     data-mugic-index="${index}"
                     onmouseenter="game._showMugicTooltip(event, ${index})"
                     onmouseleave="game._hideMugicTooltip()"
                     onmousemove="game._moveMugicTooltip(event)">
                    <div class="mugic-header">
                        <div class="mugic-name">${mugic.name}</div>
                        <div class="mugic-cost">${mugic.cost} ♪</div>
                    </div>
                    <div class="mugic-art" style="${artStyle}">
                        ${!mugic.image ? `<div style="text-align:center; padding:8px;"><div style="font-weight:800; font-size:18px; color: rgba(255,255,255,0.95);">♪</div></div>` : ''}
                    </div>
                    <div class="mugic-desc">${mugic.description}</div>
                    <div class="mugic-footer">${mugic.type}</div>
                </div>
            `;
        });

        if (this.playerMugics.length === 0) {
            html = '<div class="hand-empty">Sem Mugics na mão.</div>';
        }

        container.innerHTML = html;

        // Renderiza painel de status do deck de ataques abaixo das Mugics
        this._renderAttackDeckPanel();
    },

    _renderAttackDeckPanel() {
        // Cria ou reutiliza o painel
        let panel = document.getElementById('attack-deck-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'attack-deck-panel';
            const hand = document.getElementById('player-hand');
            if (!hand || !hand.parentNode) return;
            hand.parentNode.insertBefore(panel, hand.nextSibling);
        }

        const myP     = this.multiplayerMode ? this.myPlayerNumber : 1;
        const myHand  = myP === 1 ? this.p1AttackHand  : this.p2AttackHand;
        const myDeck  = myP === 1 ? this.p1AttackDeck  : this.p2AttackDeck;
        const myDisc  = myP === 1 ? this.p1AttackDiscard : this.p2AttackDiscard;

        const handCount = (myHand  || []).length;
        const deckCount = (myDeck  || []).length;
        const discCount = (myDisc  || []).length;
        const total     = handCount + deckCount + discCount;

        if (total === 0) { panel.innerHTML = ''; return; }

        // Probabilidade de comprar cada carta da mão ou deck
        const allAvail = [...(myDeck || [])];
        const cardCounts = {};
        allAvail.forEach(c => { cardCounts[c.name] = (cardCounts[c.name] || 0) + 1; });
        const uniqueNames = Object.keys(cardCounts);

        // Top-3 mais prováveis
        const topCards = uniqueNames
            .sort((a, b) => cardCounts[b] - cardCounts[a])
            .slice(0, 3)
            .map(name => {
                const pct = Math.round((cardCounts[name] / Math.max(deckCount, 1)) * 100);
                return `<span style="background:rgba(255,255,255,0.07);border-radius:4px;padding:1px 5px;font-size:9px;color:#94a3b8;">${name} <span style="color:#60a5fa">${pct}%</span></span>`;
            }).join('');

        // Barra de progresso do deck
        const deckPct = Math.round((deckCount / Math.max(total, 1)) * 100);
        const barColor = deckPct > 50 ? '#22c55e' : deckPct > 20 ? '#f59e0b' : '#ef4444';

        panel.innerHTML = `
            <div style="margin-top:8px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.07);
                border-radius:8px;padding:7px 10px;font-family:inherit;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
                    <span style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">🃏 Deck de Ataques</span>
                    <div style="display:flex;gap:10px;">
                        <span style="font-size:11px;color:#f1f5f9;font-weight:700;" title="Cartas na mão">Mão: <b style="color:#60a5fa">${handCount}</b></span>
                        <span style="font-size:11px;color:#f1f5f9;font-weight:700;" title="Cartas no deck">Deck: <b style="color:#22c55e">${deckCount}</b></span>
                        <span style="font-size:11px;color:#f1f5f9;font-weight:700;" title="Cartas no descarte">Desc: <b style="color:#94a3b8">${discCount}</b></span>
                    </div>
                </div>
                <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-bottom:5px;">
                    <div style="height:100%;width:${deckPct}%;background:${barColor};border-radius:2px;transition:width 0.4s ease;"></div>
                </div>
                ${topCards ? `<div style="display:flex;gap:4px;flex-wrap:wrap;">${topCards}</div>` : ''}
            </div>`;
    },

    // ── Indicador de borda da tela por estado de turno ───────────────────────
    _updateScreenBorder(isMyTurn, isSelectTarget, isMugicCaster) {
        // Só mostra em batalha multiplayer (ou batalha solo para consistência)
        if (this.appState !== 'BATTLE') {
            this._setScreenBorder('none');
            return;
        }

        if (isSelectTarget) {
            this._setScreenBorder('target');   // vermelho — escolha o alvo
        } else if (isMugicCaster) {
            this._setScreenBorder('mugic');    // roxo — escolha o conjurador
        } else if (isMyTurn) {
            this._setScreenBorder('mine');     // verde — seu turno
        } else {
            this._setScreenBorder('wait');     // cinza — oponente agindo
        }
    },

    _setScreenBorder(state) {
        let el = document.getElementById('screen-turn-border');
        if (!el) {
            el = document.createElement('div');
            el.id = 'screen-turn-border';
            el.style.cssText = `
                position:fixed;inset:0;pointer-events:none;z-index:7000;
                border-radius:0;transition:opacity 0.5s ease, box-shadow 0.5s ease;
            `;
            document.body.appendChild(el);
        }

        // Limpa classes anteriores
        el.className = '';

        if (state === 'none') {
            el.style.opacity = '0';
            el.style.boxShadow = 'none';
            return;
        }

        const configs = {
            mine:   { shadow: 'inset 0 0 0 3px rgba(34,197,94,0.6),  inset 0 0 40px rgba(34,197,94,0.12)',  cls: 'screen-border-mine'   },
            target: { shadow: 'inset 0 0 0 3px rgba(239,68,68,0.7),  inset 0 0 40px rgba(239,68,68,0.15)',  cls: 'screen-border-target' },
            mugic:  { shadow: 'inset 0 0 0 3px rgba(139,92,246,0.65),inset 0 0 40px rgba(139,92,246,0.12)', cls: 'screen-border-mugic'  },
            wait:   { shadow: 'none', cls: '' },
        };

        const cfg = configs[state] || configs.wait;
        el.style.opacity = state === 'wait' ? '0' : '1';
        el.style.boxShadow = cfg.shadow;
        if (cfg.cls) el.classList.add(cfg.cls);
    },

    handleMugicClick(index) {
        if (this.isSpectator) return; // espectadores não interagem
        if (this.turn !== 1) return;

        if (this.selectedMugic === index) {
            // Deselecionar
            this.selectedMugic = null;
            this.gameState = 'IDLE';
            this.log("Lançamento de Mugic cancelado.");
        } else {
            this.selectedMugic = index;
            this.selectedAttacker = null; // Cancela seleção de ataque normal
            this.gameState = 'SELECT_MUGIC_TARGET';
            this.log(`🎶 Preparando Mugic: ${this.playerMugics[index].name}! Selecione uma criatura alvo no tabuleiro.`);
        }
        this.renderMugics();
        this.renderBoard();
    },

    openLoreTab(tabId) {
        const tabs = document.querySelectorAll('.lore-tab');
        const contents = document.querySelectorAll('.lore-content');

        tabs.forEach(t => {
            t.classList.remove('active');
            t.style.borderLeft = '4px solid transparent';
            t.style.color = '#bdc3c7';
            t.style.background = 'transparent';
        });
        contents.forEach(c => c.style.display = 'none');

        const activeContent = document.getElementById('lore-content-' + tabId);
        if (activeContent) activeContent.style.display = 'block';

        const activeTab = Array.from(tabs).find(t => t.innerText.toLowerCase() === tabId.replace('marrillian', "m'arrillian"));
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.style.borderLeft = '4px solid #2980b9';
            activeTab.style.color = 'white';
            activeTab.style.background = '#34495e';
        }
    },

    renderLocation() {
        const container = document.getElementById("location-container");
        if (!container) return;

        if (!this.activeLocation) {
            container.innerHTML = '';
            document.body.style.background = '';
            return;
        }

        const locImgName = this.activeLocation.image || `src/assets/locations/${this.activeLocation.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.jpg`;
        document.body.style.backgroundImage = `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.85)), url('${locImgName}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';

        container.innerHTML = `
            <div style="display: inline-block; background: #34495e; padding: 10px 20px; border-radius: 8px; border: 2px solid #3498db; box-shadow: 0 4px 6px rgba(0,0,0,0.3); margin-top: 10px; min-width: 300px;">
                <h4 style="color: #3498db; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase;">Local Ativo</h4>
                <div style="font-size: 18px; font-weight: bold; color: white;">${this.activeLocation.name}</div>
                <div style="font-size: 12px; color: #bdc3c7; margin-top: 5px;">Iniciativa: <span style="color: #f1c40f;">${this.activeLocation.initiative.toUpperCase()}</span></div>
                <div style="font-size: 11px; color: #2ecc71; margin-top: 5px;">Efeito: ${this.activeLocation.description}</div>
            </div>
        `;
    },

    handleCardClick(player, r, c) {
        if (this.isSpectator) return; // espectadores não interagem
        const myPlayer = this.multiplayerMode ? this.myPlayerNumber : 1;

        // SELECT_MUGIC_CASTER precisa ser tratado ANTES da guarda de turno:
        // o jogador pode selecionar o caster durante o burst no turno do oponente.
        if (this.gameState === 'SELECT_MUGIC_CASTER') {
            if (player === myPlayer && (myPlayer === 1 ? this.boardP1[r][c] : this.boardP2[r][c])) {
                this.resolveMugicCaster(r, c);
            } else {
                this.log("⚠️ Selecione uma de SUAS criaturas para pagar o custo do Mugic.");
            }
            return;
        }

        // Para qualquer outra ação, verifica se é o turno deste jogador
        if (!this.isMyTurn()) return;

        if (this.gameState === 'SELECT_MUGIC_TARGET') {
            this.resolveMugic(player, r, c);
            return;
        }

        const clickedBoard = player === 1 ? this.boardP1 : this.boardP2;
        const clickedCard = clickedBoard[r][c];

        // --- Clique em slot vazio (Movimento) ---
        if (!clickedCard) {
            if (this.gameState === 'SELECT_TARGET' && player === myPlayer && this.selectedAttacker) {
                if (this.isValidMove(this.selectedAttacker.r, this.selectedAttacker.c, r, c)) {
                    this.resolveMove(myPlayer, this.selectedAttacker.r, this.selectedAttacker.c, r, c);
                } else {
                    this.log("⚠️ Movimento inválido! Só é possível andar para espaços vazios adjacentes.");
                }
            }
            return;
        }

        const exposed = this.isExposed(player, r, c);

        if (this.gameState === 'IDLE' && player === myPlayer) {
            if (!exposed) {
                this.log(`⚠️ ${clickedCard.name} está bloqueado por aliados e não pode atacar!`);
                return;
            }
            // Selecionar criatura atacante
            this.selectedAttacker = { player, r, c };
            this.gameState = 'SELECT_TARGET';
            this.log(`🎯 Você escolheu atacar com ${clickedCard.name}. Selecione o alvo!`);
            this.renderBoard();
        }
        else if (this.gameState === 'SELECT_TARGET') {
            if (player === myPlayer) {
                if (!exposed && !(this.selectedAttacker.r === r && this.selectedAttacker.c === c)) {
                    this.log(`⚠️ ${clickedCard.name} está bloqueado e não pode ser o novo atacante!`);
                    return;
                }
                // Clicar novamente nas próprias criaturas troca o atacante ou cancela
                if (this.selectedAttacker.r === r && this.selectedAttacker.c === c) {
                    this.selectedAttacker = null;
                    this.gameState = 'IDLE';
                    this.log("Ataque cancelado.");
                } else {
                    this.selectedAttacker = { player, r, c };
                    this.log(`🎯 Você mudou o atacante para ${clickedCard.name}. Selecione o alvo!`);
                }
                this.renderBoard();
            }
            else if (player !== myPlayer) {
                const myBoard  = myPlayer === 1 ? this.boardP1 : this.boardP2;
                const attacker = myBoard[this.selectedAttacker.r][this.selectedAttacker.c];
                const hasRange = !!(attacker && attacker._hasRange);

                // ── Regra de Range ─────────────────────────────────────────
                if (!exposed && !hasRange) {
                    this.log(`🛡️ ${clickedCard.name} está protegida! Use uma criatura com Range para atacar posições protegidas.`);
                    return;
                }
                if (!exposed && hasRange) {
                    this.log(`🏹 ${attacker.name} usa Range para atacar ${clickedCard.name} mesmo protegida!`);
                }

                // ── Regra de Invisibility ──────────────────────────────────
                // Criaturas invisíveis não podem ser escolhidas como alvo
                if (clickedCard._invisibility) {
                    this.log(`👻 ${clickedCard.name} está invisível e não pode ser alvo de ataques!`);
                    return;
                }

                this.sendAction('startCombat', {
                    atkR: this.selectedAttacker.r, atkC: this.selectedAttacker.c,
                    defR: r, defC: c,
                    initiatingPlayer: myPlayer
                });
                this.startCombat(attacker, clickedCard, this.selectedAttacker.r, this.selectedAttacker.c, r, c, myPlayer, true);
            }
        }
    },

    resolveMove(player, fromR, fromC, toR, toC, fromRemote = false) {
        const board = player === 1 ? this.boardP1 : this.boardP2;
        const card = board[fromR][fromC];

        // Realiza o movimento na matriz
        board[toR][toC] = card;
        board[fromR][fromC] = null;

        this.log(`🚶‍♂️ ${card.name} se moveu para uma nova posição estratégica!`);

        if (!fromRemote) {
            this.sendAction('move', { player, fromR, fromC, toR, toC });
        }

        if (!fromRemote) {
            this.selectedAttacker = null;
            this.gameState = 'IDLE';
            this.renderBoard();
            setTimeout(() => this.nextTurn(), 1000);
        } else {
            this.selectedAttacker = null;
            this.gameState = 'IDLE';
            this.renderBoard();
            // nextTurn virá via socket do outro jogador
        }
    },

    renderBoard() {
        // Cabeçalho adaptativo baseado no estado
        let msgEstado = this.turn === 1 ? 'Sua vez de jogar. Clique em uma carta.' : 'Aguarde o movimento do Oponente...';
        if (this.gameState === 'SELECT_TARGET') msgEstado = 'ESCOLHA O ALVO INIMIGO!';
        if (this.gameState === 'SELECT_MUGIC_CASTER') msgEstado = 'QUEM VAI PAGAR O CUSTO DA MÁGICA? CLIQUE EM UMA DE SUAS CRIATURAS. <button onclick="game.cancelMugicCaster()" style="margin-left: 10px; padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8em; font-family: Inter, sans-serif;">Cancelar Escolha</button>';

        const getMajorityTribe = (board) => {
            const counts = {};
            for (let r=0; r<board.length; r++) {
                for (let c=0; c<board[r].length; c++) {
                    const card = board[r][c];
                    if (card && card.tribe) {
                        counts[card.tribe] = (counts[card.tribe] || 0) + 1;
                    }
                }
            }
            let maxCount = 0;
            let majorityTribe = 'Generic';
            for (const t in counts) {
                if (counts[t] > maxCount) { maxCount = counts[t]; majorityTribe = t; }
            }
            return majorityTribe;
        };

        const getTribeTexture = (tribe) => {
            const formatName = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const imgPath = `src/assets/tribes/${formatName(tribe)}.jpg`;
            
            const textures = {
                'OverWorld': {
                    bg: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4)), url('${imgPath}') center/cover no-repeat, radial-gradient(circle at 50% 50%, rgba(52, 152, 219, 0.25) 0%, transparent 60%), repeating-radial-gradient(circle, rgba(52,152,219,0.1) 0px, rgba(52,152,219,0.1) 20px, transparent 20px, transparent 40px), rgba(15, 23, 42, 0.6)`,
                    size: 'auto', border: '1px solid rgba(52, 152, 219, 0.4)'
                },
                'UnderWorld': {
                    bg: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4)), url('${imgPath}') center/cover no-repeat, linear-gradient(to top, rgba(231, 76, 60, 0.3) 0%, transparent 80%), repeating-linear-gradient(45deg, rgba(231,76,60,0.15) 0, rgba(231,76,60,0.15) 15px, transparent 15px, transparent 30px), rgba(15, 23, 42, 0.6)`,
                    size: 'auto', border: '1px solid rgba(231, 76, 60, 0.4)'
                },
                'Mipedian': {
                    bg: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4)), url('${imgPath}') center/cover no-repeat, radial-gradient(circle, rgba(243, 156, 18, 0.3) 2px, transparent 3px), rgba(15, 23, 42, 0.6)`,
                    size: 'auto, auto, 20px 20px, auto', border: '1px solid rgba(243, 156, 18, 0.4)'
                },
                'Danian': {
                    bg: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4)), url('${imgPath}') center/cover no-repeat, repeating-linear-gradient(60deg, rgba(39,174,96,0.15) 0, rgba(39,174,96,0.15) 2px, transparent 2px, transparent 30px), repeating-linear-gradient(-60deg, rgba(39,174,96,0.15) 0, rgba(39,174,96,0.15) 2px, transparent 2px, transparent 30px), rgba(15, 23, 42, 0.6)`,
                    size: 'auto', border: '1px solid rgba(39, 174, 96, 0.4)'
                },
                "M'arrillian": {
                    bg: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4)), url('${imgPath}') center/cover no-repeat, repeating-radial-gradient(circle at 50% 100%, rgba(142, 68, 173, 0.25) 0, transparent 20px, rgba(142, 68, 173, 0.15) 40px), rgba(15, 23, 42, 0.6)`,
                    size: 'auto', border: '1px solid rgba(142, 68, 173, 0.4)'
                },
                'Generic': {
                    bg: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4)), url('${imgPath}') center/cover no-repeat, repeating-linear-gradient(0deg, rgba(189,195,199,0.08) 0px, rgba(189,195,199,0.08) 2px, transparent 2px, transparent 30px), repeating-linear-gradient(90deg, rgba(189,195,199,0.08) 0px, rgba(189,195,199,0.08) 2px, transparent 2px, transparent 30px), rgba(15, 23, 42, 0.6)`,
                    size: 'auto', border: '1px solid rgba(189, 195, 199, 0.3)'
                }
            };
            return textures[tribe] || textures['Generic'];
        };

        // ── Banner de turno animado ──────────────────────────────────────────
        const myP        = this.multiplayerMode ? this.myPlayerNumber : 1;
        const isMyTurnNow = this.isMyTurn();
        const isSpecial   = this.gameState === 'SELECT_TARGET';
        const isMugic     = this.gameState === 'SELECT_MUGIC_CASTER';

        // Atualiza indicador de borda da tela
        this._updateScreenBorder(isMyTurnNow, isSpecial, isMugic);

        let bannerIcon, bannerText, bannerSub, bannerClass;
        if (isSpecial) {
            bannerIcon  = '🎯';
            bannerText  = 'ESCOLHA O ALVO!';
            bannerSub   = 'Clique em uma criatura inimiga para atacar';
            bannerClass = 'turn-banner-target';
        } else if (isMugic) {
            bannerIcon  = '🎵';
            bannerText  = 'ESCOLHA O CONJURADOR';
            bannerSub   = 'Clique em uma de suas criaturas para pagar o custo';
            bannerClass = 'turn-banner-mugic';
        } else if (isMyTurnNow) {
            bannerIcon  = '⚔️';
            bannerText  = 'SEU TURNO';
            bannerSub   = 'Clique em uma criatura para agir';
            bannerClass = 'turn-banner-mine';
        } else {
            bannerIcon  = '⏳';
            bannerText  = 'TURNO DO OPONENTE';
            bannerSub   = 'Aguarde o movimento inimigo…';
            bannerClass = 'turn-banner-wait';
        }

        // Botão cancelar conjurador (só no estado MUGIC_CASTER)
        const cancelBtn = isMugic
            ? `<button onclick="game.cancelMugicCaster()" style="margin-top:6px;padding:4px 14px;background:#e74c3c;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;">✕ Cancelar</button>`
            : '';

        this.boardElement.innerHTML = `
        <div class="turn-banner ${bannerClass}">
            <div class="turn-banner-icon">${bannerIcon}</div>
            <div class="turn-banner-body">
                <div class="turn-banner-title">${bannerText}</div>
                <div class="turn-banner-sub">${bannerSub}</div>
                ${cancelBtn}
            </div>
            <div class="turn-banner-dots">
                <span></span><span></span><span></span>
            </div>
        </div>`;

        const renderPlayerBoard = (board, player) => {
            const tribe = getMajorityTribe(board);
            const tex = getTribeTexture(tribe);
            
            let html = `<div class="board-columns" style="background: ${tex.bg}; background-size: ${tex.size}; border: ${tex.border}; border-radius: 12px; padding: 15px; box-shadow: inset 0 0 30px rgba(0,0,0,0.7); flex: 1;">`;
            // Para P1 (Esquerda), as linhas (agora colunas verticais) da esq para dir são: Trás(2), Meio(1), Frente(0)
            // Para P2 (Direita), as linhas da esq para dir são: Frente(0), Meio(1), Trás(2)
            // Rows dinâmico — funciona para qualquer tamanho de tabuleiro (3v3 ou 6v6)
            const numRows = board.length;
            const rows = player === 1
                ? Array.from({length: numRows}, (_, i) => numRows - 1 - i)
                : Array.from({length: numRows}, (_, i) => i);

            rows.forEach(r => {
                html += `<div class="board-col">`;
                for(let c = 0; c < board[r].length; c++) {
                    const card = board[r][c];
                    const isSelected = this.selectedAttacker && this.selectedAttacker.player === player && this.selectedAttacker.r === r && this.selectedAttacker.c === c;
                    const exposed = this.isExposed(player, r, c);

                    // ── Verifica se o atacante selecionado tem Range ──────────
                    const myP  = this.multiplayerMode ? this.myPlayerNumber : 1;
                    const enemyP = myP === 1 ? 2 : 1;
                    const myBoard = myP === 1 ? this.boardP1 : this.boardP2;
                    const selCard = this.selectedAttacker ? myBoard[this.selectedAttacker.r]?.[this.selectedAttacker.c] : null;
                    const attackerHasRange = !!(selCard && selCard._hasRange);

                    // Range + SELECT_TARGET → inimigo protegido vira alvo válido
                    const isRangeTarget = !exposed && attackerHasRange
                        && this.gameState === 'SELECT_TARGET' && player === enemyP && card;

                    const borderStyle = isSelected ? '3px solid #f1c40f' : `2px solid ${player === 2 ? '#c0392b' : '#2980b9'}`;
                    const shadowStyle = isSelected ? 'box-shadow: 0 0 15px #f1c40f; transform: scale(1.05);' : '';

                    let cursorStyle = '';
                    let opacityStyle = '';

                    if (card) {
                        if (!exposed && !isRangeTarget) {
                            // Protegido e não alcançável por Range
                            cursorStyle = 'cursor: not-allowed;';
                            opacityStyle = 'opacity: 0.6; filter: grayscale(30%);';
                        } else if (isRangeTarget) {
                            // Protegido mas alcançável — visual distinto
                            cursorStyle = 'cursor: crosshair;';
                            opacityStyle = 'opacity: 0.9;';
                        } else {
                            cursorStyle = (this.isMyTurn() && player === myP) || (this.isMyTurn() && this.gameState === 'SELECT_TARGET' && player === enemyP) ? 'cursor: pointer;' : '';
                        }
                    }

                    if (card) {
                        const animState = this.combatAnimationState || {};
                        const isAttackerAnim = animState.attacker && animState.attacker.player === player && animState.attacker.r === r && animState.attacker.c === c;
                        const isDefenderAnim = animState.defender && animState.defender.player === player && animState.defender.r === r && animState.defender.c === c;
                        const animClass = isDefenderAnim && animState.destroyed ? 'defeat-anim' : isAttackerAnim ? 'attack-anim' : isDefenderAnim ? 'hit-anim' : '';

                        // Preview de combate: cartas inimigas expostas OU alcançáveis por Range
                        let previewHtml = '';
                        if (this.gameState === 'SELECT_TARGET' && this.selectedAttacker && player === enemyP
                            && !card._invisibility && (exposed || isRangeTarget)) {
                            const myBoard  = myP === 1 ? this.boardP1 : this.boardP2;
                            const attCard  = myBoard[this.selectedAttacker.r][this.selectedAttacker.c];
                            if (attCard) {
                                const prev = this._getCombatPreview(
                                    attCard, this.selectedAttacker.r, this.selectedAttacker.c, myP,
                                    card, r, c
                                );
                                // Intimidate: linhas de redução de stat
                                const intimidateHtml = prev.intimidateLines && prev.intimidateLines.length > 0
                                    ? `<div style="margin-top:3px;padding:2px 5px;border-radius:5px;background:rgba(251,146,60,0.2);border:1px solid rgba(251,146,60,0.4);font-size:8px;color:#fb923c;font-weight:700;">
                                        😨 Intimidate: ${prev.intimidateLines.join(' · ')}
                                       </div>`
                                    : '';

                                previewHtml = `
                                    <div class="board-preview-overlay">
                                        <div class="board-preview-text">
                                            <div style="font-size:15px;">${prev.emoji}</div>
                                            <div style="font-size:10px;font-weight:800;color:${prev.color};letter-spacing:0.5px;">${prev.verdict}</div>

                                            <!-- Indicador de iniciativa -->
                                            <div style="
                                                margin-top:4px;padding:2px 6px;border-radius:6px;
                                                background:${prev.initGoFirst ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'};
                                                border:1px solid ${prev.initGoFirst ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'};
                                                font-size:9px;font-weight:700;
                                                color:${prev.initGoFirst ? '#4ade80' : '#f87171'};
                                                line-height:1.4;
                                            ">
                                                ${prev.initGoFirst ? '⚡' : '⚠️'}
                                                ${prev.initGoFirst ? 'Você inicia' : 'Inimigo inicia'}
                                                <span style="opacity:0.75;font-weight:400;">
                                                    · ${prev.initStatName} ${prev.initAtkVal}vs${prev.initDefVal}
                                                </span>
                                            </div>

                                            <!-- Intimidate -->
                                            ${intimidateHtml}

                                            <!-- Dano estimado -->
                                            <div style="display:flex;justify-content:center;gap:5px;margin-top:4px;font-size:9px;">
                                                <span style="color:#4ade80;">💥 ${prev.myDmg}</span>
                                                <span style="color:#475569;">vs</span>
                                                <span style="color:#f87171;">💥 ${prev.theirDmg}</span>
                                            </div>
                                        </div>
                                    </div>`;
                            }
                        }
                        const syn = this.getSynergyBonus(player, r, c);
                        let displayMaxEnergy = card.maxEnergy;
                        let displayEnergy = card.energy;
                        let displayCourage = card.courage;
                        let displayPower = card.power;
                        let displayWisdom = card.wisdom;
                        let displaySpeed = card.speed;

                        if (syn) {
                            // Energia NÃO é somada no display: sinergia de energia não afeta o combate real
                            // (card.energy é o valor real usado em executeAttack)
                            displayCourage += syn.courage;
                            displayPower += syn.power;
                            displayWisdom += syn.wisdom;
                            displaySpeed += syn.speed;
                        }

                        let bgDisplayHtml = '';
                        if (card.bgRevealed && card.battlegear) {
                            const mod = card.battlegear.modifiers || {};
                            // Energia NÃO é adicionada aqui — já foi aplicada permanentemente em _revealBattlegear
                            // (evita double-count: Stone Mail +50 seria somado duas vezes)
                            displayCourage += mod.courage || 0;
                            displayPower += mod.power || 0;
                            displayWisdom += mod.wisdom || 0;
                            displaySpeed += mod.speed || 0;
                            bgDisplayHtml = `<div class="board-bg-revealed" style="cursor:help;"
                                onmouseenter="game._showBattlegearTooltip(event,${player},${r},${c})"
                                onmouseleave="game._hideAttackTooltip()"
                                onmousemove="game._positionTooltip(event,document.getElementById('mugic-tooltip'))">
                                🗡️ ${card.battlegear.name}
                            </div>`;
                        } else if (card.battlegear && !card.bgRevealed) {
                            // Minha carta face-down: mostro o nome (só eu vejo)
                            // Carta do oponente face-down: mostro apenas "Face Down"
                            const myP = this.multiplayerMode ? this.myPlayerNumber : 1;
                            if (player === myP) {
                                bgDisplayHtml = `<div class="board-bg-hidden" style="cursor:help;"
                                    onmouseenter="game._showBattlegearTooltip(event,${player},${r},${c})"
                                    onmouseleave="game._hideAttackTooltip()"
                                    onmousemove="game._positionTooltip(event,document.getElementById('mugic-tooltip'))">
                                    [Escondido] ${card.battlegear.name}
                                </div>`;
                            } else {
                                bgDisplayHtml = `<div class="board-bg-facedown">Item: Face Down</div>`;
                            }
                        }

                        // Borda colorida pelo veredito quando é alvo potencial
                        let finalBorder = borderStyle;
                        let finalShadow = shadowStyle;
                        if (previewHtml) {
                            const prev = this._getCombatPreview(
                                (myP===1?this.boardP1:this.boardP2)[this.selectedAttacker.r][this.selectedAttacker.c],
                                this.selectedAttacker.r, this.selectedAttacker.c, myP, card, r, c
                            );
                            finalBorder = `3px solid ${prev.border}`;
                            finalShadow = `box-shadow: 0 0 14px ${prev.border}88;`;
                        } else if (isRangeTarget) {
                            // Alvo protegido alcançável por Range — borda laranja pulsante
                            finalBorder = '3px solid #e67e22';
                            finalShadow = 'box-shadow: 0 0 12px rgba(230,126,34,0.6); animation: range-pulse 1.2s ease-in-out infinite;';
                        }

                        // Badge Range: aparece sobre a carta quando ela é alvo protegido alcançável
                        const rangeBadgeHtml = isRangeTarget
                            ? `<div style="position:absolute;top:4px;right:4px;background:rgba(230,126,34,0.9);
                                color:#fff;font-size:10px;font-weight:700;padding:2px 5px;border-radius:4px;
                                z-index:10;pointer-events:none;">🏹 Range</div>`
                            : '';

                        // Pulso crítico: HP < 20%
                        const hpPct = displayEnergy / (displayMaxEnergy || 1);
                        const critClass = hpPct < 0.2 && displayEnergy > 0 ? 'card-critical' : '';

                        // Tribe highlight: local ativo favorece a tribo desta criatura
                        const locEf = this.activeLocation && this.activeLocation.effect;
                        const benefitedTribe = locEf && locEf.tribe;
                        const tribeBoost = benefitedTribe && card.tribe === benefitedTribe
                            && ['tribe_energy_bonus','first_attack_tribe_bonus','combat_start_mugic_counter_tribe','mugic_discount_tribe_first'].includes(locEf.type);
                        if (tribeBoost && !previewHtml) {
                            finalBorder = '2px solid rgba(251,191,36,0.85)';
                            finalShadow = 'box-shadow: 0 0 12px rgba(251,191,36,0.45), 0 0 4px rgba(251,191,36,0.3);';
                        }
                        const tribeBoostBadge = tribeBoost
                            ? `<div style="position:absolute;top:3px;right:3px;background:rgba(251,191,36,0.9);color:#000;font-size:8px;font-weight:900;padding:1px 5px;border-radius:4px;z-index:10;pointer-events:none;">⭐ Local</div>`
                            : '';

                        // Drag só para o próprio jogador no seu turno
                        const myPd = this.multiplayerMode ? this.myPlayerNumber : 1;
                        const draggable = this.isMyTurn() && player === myPd && exposed;

                        html += `
                            <div class="card ${animClass} ${critClass}${tribeBoost ? ' card-tribe-boost' : ''}"
                                onclick="game.handleCardClick(${player}, ${r}, ${c})"
                                data-pos="p${player}-${r}-${c}"
                                ${draggable ? `
                                    draggable="true"
                                    ondragstart="game._onCardDragStart(event,${player},${r},${c})"
                                    ondragend="game._onCardDragEnd(event)"
                                ` : ''}
                                title=""
                                style="border: ${finalBorder}; ${finalShadow} ${cursorStyle} ${opacityStyle} transition: border 0.2s, box-shadow 0.2s; position:relative; overflow:hidden;">
                            ${tribeBoostBadge}
                            ${rangeBadgeHtml}
                                ${previewHtml}
                                <div class="card-header"
                                     onmouseenter="game._showCreatureTooltip(event,${player},${r},${c})"
                                     onmouseleave="game._hideCreatureTooltip()"
                                     onmousemove="game._moveCreatureTooltip(event)">
                                    <div class="card-rarity-icon rarity-${(card.rarity || 'Common').toLowerCase().replace(/\s+/g, '-')}" title="${card.rarity || 'Common'}">${card.rarity === 'Ultra Rare' ? '💎' : card.rarity === 'Super Rare' ? '🔷' : card.rarity === 'Rare' ? '🔶' : card.rarity === 'Legendary' ? '🌟' : '⚪'}</div>
                                    <div class="card-tribe">${card.tribe}</div>
                                    <div class="card-name">${card.name}</div>
                                </div>
                                <div class="card-image-container"
                                     onmouseenter="game._showCreatureTooltip(event,${player},${r},${c})"
                                     onmouseleave="game._hideCreatureTooltip()"
                                     onmousemove="game._moveCreatureTooltip(event)">
                                    ${card.image ? `<img src="${card.image}" class="card-image" alt="${card.name}">` : `<div class="card-image-placeholder">Sem Imagem</div>`}
                                </div>
                                ${bgDisplayHtml}
                                ${(() => {
                                    let eHtml = '';
                                    if (card.elements && card.elements.length > 0) {
                                        const iconMap = { "Fire": "🔥", "Water": "💧", "Earth": "🪨", "Air": "🌪️" };
                                        eHtml = `<div class="card-elements-row">`;
                                        card.elements.forEach(el => {
                                            eHtml += `<div title="${el}" style="background: rgba(0,0,0,0.8); border: 1px solid #7f8c8d; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px;">${iconMap[el] || '✨'}</div>`;
                                        });
                                        eHtml += `</div>`;
                                    }
                                    return eHtml;
                                })()}
                                ${this._getPassiveBadgesHtml(card)}
                                ${(() => {
                                    let badges = '';
                                    if (card._hasRange)      badges += `<span title="Range: pode atacar criaturas protegidas" style="background:#e67e22;color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;margin:0 2px;">🏹 Range</span>`;
                                    if (card._invisibility)  badges += `<span title="Invisível: não pode ser alvo de ataques" style="background:#8e44ad;color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;margin:0 2px;">👻 Invisível</span>`;
                                    if (card._cannotMove)    badges += `<span title="Não pode se mover este turno" style="background:#7f8c8d;color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;margin:0 2px;">🔒 Imóvel</span>`;
                                    return badges ? `<div class="card-status-badges">${badges}</div>` : '';
                                })()}
                                ${syn ? `<div class="board-synergy-banner">${syn.description}</div>` : ''}
                                <div class="card-stats" onmouseenter="game._hideCreatureTooltip()">
                                    <div class="stat-box" data-tip="Coragem — define quem ataca primeiro na iniciativa. Usada em ataques de Courage e pela passiva Intimidate."><span class="stat-icon">⚔️</span><span class="stat-label">COR</span><span class="stat-value" style="${syn && syn.courage ? 'color:#3498db;font-weight:bold;' : ''}">${displayCourage}</span></div>
                                    <div class="stat-box" data-tip="Poder — usado em ataques físicos de Poder. Quanto maior, mais dano em ataques de Power."><span class="stat-icon">💪</span><span class="stat-label">POD</span><span class="stat-value" style="${syn && syn.power ? 'color:#3498db;font-weight:bold;' : ''}">${displayPower}</span></div>
                                    <div class="stat-box" data-tip="Sabedoria — usado em ataques mágicos de Sabedoria. Também define quem pode conjurar Mugics mais caras."><span class="stat-icon">🧠</span><span class="stat-label">SAB</span><span class="stat-value" style="${syn && syn.wisdom ? 'color:#3498db;font-weight:bold;' : ''}">${displayWisdom}</span></div>
                                    <div class="stat-box" data-tip="Velocidade — usado em ataques de Speed e na disputa de iniciativa. Swift aumenta este valor."><span class="stat-icon">⚡</span><span class="stat-label">VEL</span><span class="stat-value" style="${syn && syn.speed ? 'color:#3498db;font-weight:bold;' : ''}">${displaySpeed}</span></div>
                                </div>
                                <div class="card-energy-container" onmouseenter="game._hideCreatureTooltip()">
                                    <!-- Barra de vida principal -->
                                    <div class="hp-bar-track">
                                        <div style="width:${Math.max(0,(displayEnergy/displayMaxEnergy)*100)}%;height:100%;border-radius:6px;
                                            background:${hpPct>0.5?'linear-gradient(90deg,#16a34a,#22c55e)':hpPct>0.2?'linear-gradient(90deg,#ca8a04,#fbbf24)':'linear-gradient(90deg,#b91c1c,#ef4444)'};
                                            transition:width 0.5s ease-out,background 0.5s ease-out;
                                            box-shadow:${hpPct<=0.2?'0 0 6px #ef444488':'none'};"></div>
                                    </div>
                                    <!-- Texto de vida -->
                                    <div class="hp-bar-text">
                                        ❤️ ${Math.max(0,displayEnergy)} / ${displayMaxEnergy}
                                    </div>
                                    ${(() => {
                                        // Counter pendente: local dá counter ao entrar em combate
                                        const locEff = this.activeLocation && this.activeLocation.effect;
                                        const pending = locEff
                                            && locEff.type === 'combat_start_mugic_counter_tribe'
                                            && card.tribe === locEff.tribe
                                            && (card.mugicCounters || 0) === 0;
                                        return this._mugicCountersHtml(card, pending);
                                    })()}
                                </div>
                            </div>
                        `;
                    } else {
                        // Slot vazio
                        let emptyCursor = '';
                        let emptyBorder = 'border: 2px dashed rgba(255, 255, 255, 0.3);';
                        let emptyBg = 'background-color: rgba(0, 0, 0, 0.4);';

                        // Destacar slot vazio se puder mover para ele
                        const myPl = this.multiplayerMode ? this.myPlayerNumber : 1;
                        if (this.gameState === 'SELECT_TARGET' && player === myPl && this.selectedAttacker) {
                            if (this.isValidMove(this.selectedAttacker.r, this.selectedAttacker.c, r, c)) {
                                emptyCursor = 'cursor: pointer;';
                                emptyBorder = 'border: 2px dashed #2ecc71;'; // Verde para movimento
                                emptyBg = 'background-color: rgba(46, 204, 113, 0.25);';
                            }
                        }

                        const myPe = this.multiplayerMode ? this.myPlayerNumber : 1;
                        const dropTarget = this.isMyTurn() && player === myPe;
                        html += `<div class="board-slot-empty"
                            style="${emptyBorder}${emptyBg}${emptyCursor}"
                            onclick="game.handleCardClick(${player}, ${r}, ${c})"
                            ${dropTarget ? `
                                ondragover="game._onSlotDragOver(event,${player},${r},${c})"
                                ondragleave="game._onSlotDragLeave(event)"
                                ondrop="game._onSlotDrop(event,${player},${r},${c})"
                            ` : ''}
                        ></div>`;
                    }
                }
                html += `</div>`;
            });
            html += `</div>`;
            return html;
        };

        // ── Overlay ambiental do local ───────────────────────────────────────
        const _locationOverlay = (() => {
            const loc = this.activeLocation;
            if (!loc) return '';

            // Mapeamento: nome / tipo de efeito → tema visual
            const name = (loc.name || '').toLowerCase();
            const ef   = (loc.effect && loc.effect.type) || '';
            const elem = (loc.effect && (loc.effect.element || (loc.effect.bonuses && Object.keys(loc.effect.bonuses)[0]))) || '';

            let theme = null;

            // Por elemento explícito no efeito
            if (elem === 'Fire'  || name.includes('lava') || name.includes('fire'))
                theme = 'fire';
            else if (elem === 'Water' || name.includes('lake') || name.includes('falls') || name.includes('river') || name.includes('rain') || name.includes('plunge') || name.includes('maelstrom'))
                theme = 'water';
            else if (elem === 'Earth' || name.includes('cave') || name.includes('stone') || name.includes('pillar') || name.includes('mountain') || name.includes('grove') || name.includes('swamp') || name.includes('deep'))
                theme = 'earth';
            else if (elem === 'Air'   || name.includes('crystal') || name.includes('plains') || name.includes('ridge') || name.includes('valley') || name.includes('tower'))
                theme = 'air';
            // Por efeito especial
            else if (ef.includes('tribe') && loc.effect.tribe === 'UnderWorld') theme = 'underworld';
            else if (ef.includes('tribe') && loc.effect.tribe === 'OverWorld')  theme = 'overworld';
            else if (ef === 'no_mugic' || ef === 'no_tribal_mugic')             theme = 'silence';
            else if (name.includes('oasis') || name.includes('forest'))         theme = 'nature';

            if (!theme) return '';

            const themes = {
                fire:       { cls: 'loc-overlay-fire',       label: '🔥' },
                water:      { cls: 'loc-overlay-water',      label: '💧' },
                earth:      { cls: 'loc-overlay-earth',      label: '🪨' },
                air:        { cls: 'loc-overlay-air',        label: '🌪️' },
                underworld: { cls: 'loc-overlay-underworld', label: '💀' },
                overworld:  { cls: 'loc-overlay-overworld',  label: '✨' },
                silence:    { cls: 'loc-overlay-silence',    label: '🔇' },
                nature:     { cls: 'loc-overlay-nature',     label: '🌿' },
            };
            const t = themes[theme];
            return `<div class="loc-ambient-overlay ${t.cls}" aria-hidden="true"></div>`;
        })();

        let boardsHtml = `<div class="boards-wrapper loc-boards-host" style="background: transparent; align-items: stretch; gap: 20px; position:relative;">`;
        boardsHtml += _locationOverlay;
        boardsHtml += renderPlayerBoard(this.boardP1, 1);
        boardsHtml += '<div class="board-divider"></div>'; // Divisória vertical
        boardsHtml += renderPlayerBoard(this.boardP2, 2);
        boardsHtml += '</div>';
        this.boardElement.innerHTML += boardsHtml;

        // Dispara gotículas de sangue se houver uma criatura marcada como destruída
        const animState = this.combatAnimationState;
        if (animState && animState.destroyed) {
            requestAnimationFrame(() => {
                const defeatEl = this.boardElement.querySelector('.card.defeat-anim');
                if (defeatEl) this._spawnBloodDrops(defeatEl);
            });
        }

        // Animação de entrada: cartas caem em posição quando o tabuleiro é criado pela 1ª vez
        if (this._boardEntryPending) {
            this._boardEntryPending = false;
            this._playBoardEntryAnimation();
        }
    },

});
