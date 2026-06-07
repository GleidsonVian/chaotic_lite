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
        this.sfxMove && this.sfxMove();

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
            // Layout top-bottom: P1 (baixo) — frente(0) no TOPO, trás(n-1) embaixo.
            //                   P2 (cima)  — trás(n-1) no TOPO, frente(0) embaixo.
            // Assim as frentes de ambos ficam voltadas uma para a outra (centro do campo).
            const numRows = board.length;
            // Layout lado-a-lado: frente (row 0) fica mais perto do centro (divisória)
            // P1 (esquerda): trás→frente, ou seja [2,1,0] → frente na direita
            // P2 (direita):  frente→trás, ou seja [0,1,2] → frente na esquerda
            const rows = player === 1
                ? Array.from({length: numRows}, (_, i) => numRows - 1 - i) // [2,1,0]
                : Array.from({length: numRows}, (_, i) => i);               // [0,1,2]

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

        // ── Nomes e info dos jogadores ──────────────────────────────────────
        const _p1Name  = this.multiplayerMode ? (this.p1Name || 'Jogador 1') : 'Você';
        const _p2Name  = this.multiplayerMode ? (this.p2Name || 'Jogador 2') : 'IA';
        const _p1Mugics = (this.playerMugics || []).length;
        const _p2Mugics = (this.aiMugics     || []).length;
        const _p1Tribe  = (() => { const t = {}; (this.boardP1 || []).flat().filter(Boolean).forEach(c => { if(c.tribe) t[c.tribe]=(t[c.tribe]||0)+1; }); return Object.entries(t).sort((a,b)=>b[1]-a[1])[0]?.[0] || ''; })();
        const _p2Tribe  = (() => { const t = {}; (this.boardP2 || []).flat().filter(Boolean).forEach(c => { if(c.tribe) t[c.tribe]=(t[c.tribe]||0)+1; }); return Object.entries(t).sort((a,b)=>b[1]-a[1])[0]?.[0] || ''; })();
        const _tribeIcon = { 'OverWorld':'🔵', 'UnderWorld':'🔴', 'Mipedian':'🟠', 'Danian':'🟣' };

        const _p1InfoBar = `<div class="player-info-bar player-info-p1">
            <span class="pinfo-name">⚔️ ${_p1Name}</span>
            <span class="pinfo-details">
                ${_p1Tribe ? `<span>${_tribeIcon[_p1Tribe]||'⚪'} ${_p1Tribe}</span>` : ''}
                <span>🎵 ×${_p1Mugics}</span>
            </span>
        </div>`;

        const _p2InfoBar = `<div class="player-info-bar player-info-p2">
            <span class="pinfo-name">🎯 ${_p2Name}</span>
            <span class="pinfo-details">
                ${_p2Tribe ? `<span>${_tribeIcon[_p2Tribe]||'⚪'} ${_p2Tribe}</span>` : ''}
                <span>🎵 ×${_p2Mugics}</span>
            </span>
        </div>`;

        let boardsHtml = `<div class="boards-wrapper loc-boards-host" id="arena-boards-wrapper" style="background:transparent;position:relative;">`;
        boardsHtml += _locationOverlay;
        // ── P1 (jogador) à esquerda
        boardsHtml += renderPlayerBoard(this.boardP1, 1);
        // ── Divisória vertical central
        boardsHtml += `<div class="board-divider"></div>`;
        // ── P2 (oponente) à direita
        boardsHtml += renderPlayerBoard(this.boardP2, 2);
        boardsHtml += '</div>';
        this.boardElement.innerHTML += boardsHtml;

        requestAnimationFrame(() => {
            this._positionPanels();
        });

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

        // Destaque das criaturas em combate + atualiza HUD se ativo
        requestAnimationFrame(() => {
            this._renderCombatHighlight();
            if (document.body.classList.contains('chud-active')) {
                this._updateCombatHudFighters();
            }
        });
    },

    // ════════════════════════════════════════════════════════════════════
    // COMBAT HUD
    // ════════════════════════════════════════════════════════════════════

    _showCombatHud() {
        const hud = document.getElementById('combat-hud');
        if (!hud) return;

        // Salva posição do scroll e trava o body com position:fixed
        // (evita que scroll anterior apareça no HUD que é position:fixed)
        this._hudScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        document.body.style.top    = `-${this._hudScrollY}px`;
        document.body.style.position = 'fixed';
        document.body.style.width  = '100%';
        document.body.style.overflow = 'hidden';

        // Força esconder tooltips que possam ter ficado abertos
        const _ct = document.getElementById('creature-tooltip');
        if (_ct) { _ct.style.visibility = 'hidden'; _ct.style.opacity = '0'; }
        this._chudHideAtkTooltip && this._chudHideAtkTooltip();
        hud.classList.remove('hidden');
        document.body.classList.add('chud-active');

        // Estado inicial: decisões ocultas, log inicial, fighters
        const btnsEl = document.getElementById('chud-decision-btns');
        const waitEl = document.getElementById('chud-waiting-msg');
        if (btnsEl) btnsEl.style.display = 'none';
        if (waitEl) { waitEl.style.display = 'block'; waitEl.textContent = '⚔️ Combate em andamento...'; }

        const sumEl = document.getElementById('chud-burst-summary');
        if (sumEl) sumEl.innerHTML = '<div class="chud-waiting">Aguardando burst...</div>';

        const listEl = document.getElementById('chud-attack-list');
        if (listEl) listEl.innerHTML = '<div class="chud-waiting">Aguardando...</div>';

        const logEl = document.getElementById('chud-log-entries');
        if (logEl) logEl.innerHTML = '';

        const titleEl = document.getElementById('chud-decisions-title');
        if (titleEl) titleEl.textContent = '🔔 Burst';

        // Popula fighters imediatamente (activeCombat já está definido antes do HUD abrir)
        this._updateCombatHudFighters();
        this._updateCombatHudLog();
    },

    _hideCombatHud() {
        const hud = document.getElementById('combat-hud');
        if (hud) hud.classList.add('hidden');
        document.body.classList.remove('chud-active');
        this._chudLogEl = null;

        // Restaura o body ao estado normal e volta para a posição de scroll anterior
        document.body.style.position = '';
        document.body.style.top      = '';
        document.body.style.width    = '';
        document.body.style.overflow = '';
        window.scrollTo(0, this._hudScrollY || 0);
        this._hudScrollY = 0;

        // Esconde tooltips que possam ter ficado abertos
        this._chudHideAtkTooltip && this._chudHideAtkTooltip();
        this._chudHideFighterTooltip && this._chudHideFighterTooltip();
        const _ct = document.getElementById('creature-tooltip');
        if (_ct) { _ct.style.visibility = 'hidden'; _ct.style.opacity = '0'; }

        // Fecha os painéis laterais antigos que eram suprimidos pelo chud-active
        ['attack-hand-panel', 'burst-side-panel', 'burst-log-panel'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('visible', 'open');
        });
    },

    // Constrói o card de um combatente
    _chudFighterHtml(card, isEnemy, effStats) {
        if (!card) return '<div class="chud-waiting">Sem criatura</div>';
        const img = card.image
            ? `<img class="chud-fighter-img" src="${card.image}" alt="${card.name||''}" onerror="this.style.display='none';this.nextElementSibling&&(this.nextElementSibling.style.display='flex')">`
              + `<div class="chud-fighter-img-placeholder" style="display:none">⚔️</div>`
            : `<div class="chud-fighter-img-placeholder">⚔️</div>`;

        const hp    = card.energy    ?? 0;
        const maxHp = card.maxEnergy ?? hp;
        const pct   = maxHp > 0 ? (hp / maxHp) * 100 : 0;
        const hpCls = pct > 50 ? '' : pct > 25 ? ' low' : ' crit';
        const hpCol = pct > 50 ? '#4ade80' : pct > 25 ? '#fbbf24' : '#ef4444';

        const eff = effStats || {};

        // Stats com cor por categoria
        const statDefs = [
            { key:'courage', icon:'💪', label:'COR', color:'#f97316' },
            { key:'power',   icon:'⚡', label:'POD', color:'#a78bfa' },
            { key:'wisdom',  icon:'🧠', label:'SAB', color:'#38bdf8' },
            { key:'speed',   icon:'💨', label:'VEL', color:'#4ade80' },
        ];
        const statsHtml = `<div class="chud-stats-row">${statDefs.map(s => {
            const val = eff[s.key] ?? card[s.key] ?? 0;
            return `<div class="chud-stat-pill" style="--sc:${s.color}">
                <span class="chud-stat-pill-icon">${s.icon}</span>
                <div>
                    <div class="chud-stat-pill-lbl">${s.label}</div>
                    <div class="chud-stat-pill-val" style="color:${s.color}">${val}</div>
                </div>
            </div>`;
        }).join('')}</div>`;

        const eIcons = { Fire:'🔥', Water:'💧', Earth:'🪨', Air:'🌪️' };
        const elemsHtml = (card.elements||[]).length > 0
            ? `<div class="chud-fighter-elements">${card.elements.map(e =>
                `<span class="chud-elem-badge">${eIcons[e]||''} ${e}</span>`).join('')}</div>`
            : '';

        // Battlegear — mostra nome + efeito/descrição se revelado
        let bgHtml = '';
        if (card.battlegear && card.bgRevealed) {
            const bg = card.battlegear;
            const bgEffect = bg.effect || bg.description || bg.text || '';
            bgHtml = `<div class="chud-fighter-bg-block">
                <div class="chud-fighter-bg-name">🛡️ ${bg.name}</div>
                ${bgEffect ? `<div class="chud-fighter-bg-effect">${bgEffect}</div>` : ''}
            </div>`;
        } else if (card.battlegear && !card.bgRevealed) {
            bgHtml = `<div class="chud-fighter-bg-block chud-fighter-bg-hidden">
                <div class="chud-fighter-bg-name">🛡️ <em>Battlegear oculto</em></div>
            </div>`;
        }

        // Passivas — lista compacta com ícone, nome e descrição
        const allPassives = [...(card.passives || [])];
        // Inclui passivas concedidas pelo battlegear revelado
        if (card.battlegear && card.bgRevealed && card.battlegear.passivesGranted) {
            allPassives.push(...card.battlegear.passivesGranted);
        }
        let passivesHtml = '';
        if (allPassives.length > 0 && window.passivesDatabase) {
            const pills = allPassives.map(p => {
                const def = window.passivesDatabase[p.id];
                if (!def) return '';
                const desc = def.description ? def.description(p) : '';
                return `<div class="chud-passive-pill" title="${desc}">
                    <span class="chud-passive-icon">${def.icon || '⚡'}</span>
                    <span class="chud-passive-name">${def.name}</span>
                    ${desc ? `<span class="chud-passive-desc">${desc}</span>` : ''}
                </div>`;
            }).filter(Boolean).join('');
            if (pills) passivesHtml = `<div class="chud-passives-row">${pills}</div>`;
        }

        return `
            <div class="chud-fighter-top">
                ${img}
                <div class="chud-fighter-info">
                    <div class="chud-fighter-name">${card.name}</div>
                    <div class="chud-fighter-tribe">${card.tribe || ''}</div>
                    ${elemsHtml}
                    <div class="chud-hp-row" style="margin-top:6px;">
                        <span class="chud-hp-label">❤️</span>
                        <div class="chud-hp-track"><div class="chud-hp-fill${hpCls}" style="width:${pct.toFixed(1)}%;"></div></div>
                        <span class="chud-hp-val" style="color:${hpCol};">${hp}/${maxHp}</span>
                    </div>
                </div>
            </div>
            ${statsHtml}
            ${passivesHtml}
            ${bgHtml}`;
    },

    _updateCombatHudFighters() {
        const ac = this.activeCombat;
        if (!ac) return;

        // P1 = minha criatura no solo; em multiplayer, "mine" = myPlayerNumber
        const myPN    = this.multiplayerMode ? this.myPlayerNumber : 1;
        const mineCard  = myPN === 1 ? ac.p1Card : ac.p2Card;
        const enemyCard = myPN === 1 ? ac.p2Card : ac.p1Card;

        // Calcula stats efetivos (com bônus do local)
        const _effStats = (card) => {
            const loc = this.activeLocation?.effect || {};
            const bonus = loc.type === 'stat_bonus' ? loc : {};
            return {
                courage: (card.courage||0) + (bonus.stat === 'courage' ? (bonus.amount||0) : 0),
                power:   (card.power||0)   + (bonus.stat === 'power'   ? (bonus.amount||0) : 0),
                wisdom:  (card.wisdom||0)  + (bonus.stat === 'wisdom'  ? (bonus.amount||0) : 0),
                speed:   (card.speed||0)   + (bonus.stat === 'speed'   ? (bonus.amount||0) : 0),
            };
        };

        const mineEl  = document.getElementById('chud-mine');
        const enemyEl = document.getElementById('chud-enemy');
        try {
            if (mineEl)  mineEl.innerHTML  = this._chudFighterHtml(mineCard,  false, mineCard  ? _effStats(mineCard)  : {});
            if (enemyEl) enemyEl.innerHTML = this._chudFighterHtml(enemyCard, true,  enemyCard ? _effStats(enemyCard) : {});
        } catch(err) {
            console.error('[HUD fighters] Erro ao renderizar fighters:', err);
            if (mineEl)  mineEl.innerHTML  = `<div style="color:#94a3b8;padding:10px">⚔️ ${mineCard?.name  || '?'}</div>`;
            if (enemyEl) enemyEl.innerHTML = `<div style="color:#94a3b8;padding:10px">⚔️ ${enemyCard?.name || '?'}</div>`;
        }

        // Hover nos cards dos fighters para ver stats detalhados
        if (mineEl) {
            mineEl.onmouseenter = (e) => this._chudShowFighterTooltip(e, false);
            mineEl.onmousemove  = (e) => this._chudMoveFighterTooltip(e);
            mineEl.onmouseleave = ()  => this._chudHideFighterTooltip();
        }
        if (enemyEl) {
            enemyEl.onmouseenter = (e) => this._chudShowFighterTooltip(e, true);
            enemyEl.onmousemove  = (e) => this._chudMoveFighterTooltip(e);
            enemyEl.onmouseleave = ()  => this._chudHideFighterTooltip();
        }

        // Barra de energia comparativa
        const enBars = document.getElementById('chud-energy-bars');
        if (enBars && mineCard && enemyCard) {
            const mineMax  = mineCard.maxEnergy  || 1;
            const enemyMax = enemyCard.maxEnergy || 1;
            const mineP    = Math.round((mineCard.energy  / mineMax)  * 100);
            const enemyP   = Math.round((enemyCard.energy / enemyMax) * 100);
            enBars.innerHTML = `
                <div style="font-size:9px;color:#475569;text-align:center;letter-spacing:.05em;">ENERGIA</div>
                <div class="chud-en-row">
                    <span class="chud-en-val" style="color:#3b82f6;text-align:left;">${mineP}%</span>
                    <div class="chud-en-track"><div class="chud-en-fill-blue" style="width:${mineP}%"></div></div>
                </div>
                <div class="chud-en-row">
                    <span class="chud-en-val" style="color:#ef4444;text-align:left;">${enemyP}%</span>
                    <div class="chud-en-track"><div class="chud-en-fill-red" style="width:${enemyP}%"></div></div>
                </div>`;
        }

        // Round label
        const rl = document.getElementById('chud-round-label');
        if (rl) rl.textContent = ac.rounds > 0 ? `Rodada ${ac.rounds}` : 'Início';
    },

    // Atualiza painel de decisões no HUD
    _updateCombatHudDecisions(isMyTurn, hasSacrifice) {
        const btnsEl   = document.getElementById('chud-decision-btns');
        const waitEl   = document.getElementById('chud-waiting-msg');
        const titleEl  = document.getElementById('chud-decisions-title');
        const sacBtn   = document.getElementById('chud-btn-sacrifice');
        if (!btnsEl || !waitEl) return;

        if (titleEl) titleEl.textContent = '🔔 Decisão';

        if (isMyTurn) {
            btnsEl.style.display  = 'flex';
            waitEl.style.display  = 'none';
            if (sacBtn) sacBtn.style.display = hasSacrifice ? 'block' : 'none';
        } else {
            btnsEl.style.display  = 'none';
            waitEl.style.display  = 'block';
            waitEl.textContent    = '⏳ Aguardando oponente...';
        }
    },

    // Atualiza o resumo da pilha de burst no HUD
    _updateCombatHudBurstSummary() {
        const el = document.getElementById('chud-burst-summary');
        if (!el) return;
        if (!this.burstStack || this.burstStack.length === 0) {
            el.innerHTML = '<div style="color:#475569;font-style:italic;font-size:10px;">Pilha vazia</div>';
            return;
        }
        // Armazena stack para o tooltip poder acessar
        this._chudBurstRef = this.burstStack;

        el.innerHTML = [...this.burstStack].reverse().map((item, i) => {
            const realIdx = this.burstStack.length - 1 - i;
            const icon  = item.type === 'attack' ? '⚔️' : '🎶';
            const label = item.type === 'attack'
                ? (item.atkCard?.name || 'Ataque')
                : (item.mugic?.name  || 'Mugic');
            const src = item.source || '?';
            const neg = item.negated ? ' <span style="color:#ef4444">🚫</span>' : '';
            return `<div class="chud-burst-item" data-bidx="${realIdx}"
                        onmouseenter="game._chudShowBurstTooltip(event, ${realIdx})"
                        onmousemove="game._chudMoveAtkTooltip(event)"
                        onmouseleave="game._chudHideAtkTooltip()">
                <span class="chud-burst-item-num">${this.burstStack.length - i}.</span>
                <span class="chud-burst-item-icon">${icon}</span>
                <span class="chud-burst-item-label">${label}</span>
                <span class="chud-burst-item-src">${src}${neg}</span>
            </div>`;
        }).join('');
    },

    // Tooltip para item do burst
    _chudShowBurstTooltip(event, idx) {
        const tt = document.getElementById('chud-atk-tooltip');
        if (!tt || !this._chudBurstRef) return;
        const item = this._chudBurstRef[idx];
        if (!item) return;

        const nameEl = document.getElementById('chud-tt-name');
        const metaEl = document.getElementById('chud-tt-meta');
        const linesEl = document.getElementById('chud-tt-lines');
        const descEl  = document.getElementById('chud-tt-desc');

        if (item.type === 'attack') {
            const atk = item.atkCard;
            if (!atk) return;
            nameEl.textContent = atk.name;
            metaEl.textContent = `⚔️ Ataque · ⚡${atk.bp||0}BP · Por: ${item.source||'?'}`;

            // Calcula dano real usando stats efetivos guardados no item do burst
            const attacker = item.attacker;
            const defender = item.defender;
            const eIcons   = { Fire:'🔥', Water:'💧', Earth:'🪨', Air:'🌪️' };
            const statLbls = { courage:'Coragem', power:'Poder', wisdom:'Sabedoria', speed:'Velocidade' };
            let dmg = atk.baseDamage || 0;
            const lines = [`<div class="chud-tt-line"><span class="chud-tt-line-label">Dano base</span><span class="chud-tt-line-val">${atk.baseDamage||0}</span></div>`];

            // Stats efetivos do atacante/defensor (calculados no momento do push)
            const effAtk = item.effAtk || {};
            const effDef = item.effDef || {};

            if (atk.elementRequirement) {
                const has   = attacker?.elements?.includes(atk.elementRequirement);
                const bonus = atk.elementDamage || 0;
                if (has) dmg += bonus;
                lines.push(`<div class="chud-tt-line"><span class="chud-tt-line-label">${eIcons[atk.elementRequirement]||''} ${atk.elementRequirement}</span><span class="chud-tt-line-val" style="color:${has?'#4ade80':'#475569'}">+${bonus}</span><span class="${has?'chud-tt-line-met':'chud-tt-line-fail'}">${has?'✅':'❌'}</span></div>`);
            }
            if (atk.elementBonuses) atk.elementBonuses.forEach(eb => {
                const has = attacker?.elements?.includes(eb.element);
                if (has) dmg += eb.damage || 0;
                lines.push(`<div class="chud-tt-line"><span class="chud-tt-line-label">${eIcons[eb.element]||''} ${eb.element}</span><span class="chud-tt-line-val" style="color:${has?'#4ade80':'#475569'}">+${eb.damage||0}</span><span class="${has?'chud-tt-line-met':'chud-tt-line-fail'}">${has?'✅':'❌'}</span></div>`);
            });
            if (atk.statRequirement) {
                const sk  = atk.statRequirement.toLowerCase();
                const av  = effAtk[sk] || attacker?.[sk] || 0;
                const dv  = effDef[sk] || defender?.[sk] || 0;
                const met = atk.statMode === 'challenge' ? (av-dv) >= (atk.statThreshold||0) : av >= (atk.statThreshold||0);
                if (met) dmg += atk.statDamage || 0;
                const lbl = statLbls[sk] || atk.statRequirement;
                const cond = atk.statMode === 'challenge' ? `${lbl} (${av})−def(${dv})≥${atk.statThreshold||0}` : `${lbl} (${av})≥${atk.statThreshold||0}`;
                lines.push(`<div class="chud-tt-line"><span class="chud-tt-line-label">${cond}</span><span class="chud-tt-line-val" style="color:${met?'#4ade80':'#475569'}">+${atk.statDamage||0}</span><span class="${met?'chud-tt-line-met':'chud-tt-line-fail'}">${met?'✅':'❌'}</span></div>`);
            }
            if (item.negated) lines.push(`<div class="chud-tt-line" style="color:#ef4444">🚫 Negado</div>`);
            linesEl.innerHTML = lines.join('');

            const totalEl = tt.querySelector('.chud-tt-total');
            if (totalEl) { totalEl.textContent = `💥 Dano estimado: ${dmg}`; totalEl.style.color = dmg >= 20 ? '#4ade80' : dmg >= 10 ? '#fbbf24' : '#f87171'; }
            descEl.style.display = 'none';
        } else {
            const mugic = item.mugic;
            nameEl.textContent = mugic?.name || 'Mugic';
            metaEl.textContent = `🎶 Mugic · Por: ${item.source||'?'}`;
            linesEl.innerHTML = '';
            const totalEl = tt.querySelector('.chud-tt-total');
            if (totalEl) { totalEl.textContent = ''; }
            const eff = mugic?.effect || mugic?.description || mugic?.text || '';
            descEl.textContent = eff;
            descEl.style.display = eff ? 'block' : 'none';
        }

        tt.classList.remove('hidden');
        this._chudMoveAtkTooltip(event);
    },

    // Popula as cartas de ataque no HUD
    _updateCombatHudAttacks(hand, attacker, defender, effAtk, effDef) {
        const listEl = document.getElementById('chud-attack-list');
        if (!listEl) return;
        if (!hand || hand.length === 0) {
            listEl.innerHTML = '<div class="chud-waiting">Sem ataques disponíveis</div>';
            return;
        }

        // Guarda referências para o tooltip poder acessar os dados completos
        this._chudAtkHand    = hand;
        this._chudAtkAtk     = attacker;
        this._chudAtkDef     = defender;
        this._chudAtkEffAtk  = effAtk;
        this._chudAtkEffDef  = effDef;

        const eIcons    = { Fire:'🔥', Water:'💧', Earth:'🪨', Air:'🌪️' };
        const statLabels = { courage:'Coragem', power:'Poder', wisdom:'Sabedoria', speed:'Velocidade' };

        // Calcula dano e cria resumo para cada carta
        const cards = hand.map((atk, i) => {
            let dmg = atk.baseDamage || 0;
            if (atk.elementRequirement && attacker.elements?.includes(atk.elementRequirement)) dmg += atk.elementDamage || 0;
            if (atk.elementBonuses) atk.elementBonuses.forEach(eb => {
                if (attacker.elements?.includes(eb.element)) dmg += eb.damage || 0;
            });
            if (atk.statRequirement) {
                const sk  = atk.statRequirement.toLowerCase();
                const av  = effAtk[sk]||0, dv = effDef[sk]||0;
                const met = atk.statMode === 'challenge' ? (av-dv) >= (atk.statThreshold||0) : av >= (atk.statThreshold||0);
                if (met) dmg += atk.statDamage || 0;
            }
            return { atk, i, dmg };
        });

        listEl.innerHTML = cards.map(({ atk, i, dmg }) => {
            const dc = dmg >= 20 ? '#4ade80' : dmg >= 10 ? '#fbbf24' : '#f87171';
            const elemTag = atk.elementRequirement
                ? `<span style="font-size:11px">${eIcons[atk.elementRequirement]||''}</span>`
                : (atk.elementBonuses ? atk.elementBonuses.map(e=>`<span style="font-size:11px">${eIcons[e.element]||''}</span>`).join('') : '');
            return `<div class="chud-atk-row"
                        onclick="game.confirmAttack(${i})"
                        onmouseenter="game._chudShowAtkTooltip(event, ${i})"
                        onmousemove="game._chudMoveAtkTooltip(event)"
                        onmouseleave="game._chudHideAtkTooltip()">
                <span class="chud-atk-num">${i+1}</span>
                <div class="chud-atk-info">
                    <div class="chud-atk-name">${elemTag} ${atk.name}</div>
                    <div class="chud-atk-sub">⚡${atk.bp}BP · base ${atk.baseDamage||0}</div>
                </div>
                <span class="chud-atk-dmg" style="color:${dc};">💥${dmg}</span>
            </div>`;
        }).join('');
    },

    // Exibe ataque do inimigo no painel
    _chudShowEnemyAttack(atkCard, attacker, defender, effAtk, effDef) {
        const listEl = document.getElementById('chud-attack-list');
        if (!listEl || !atkCard) return;

        // Calcula dano real usando os stats efetivos do inimigo (igual ao engine)
        let dmg = atkCard.baseDamage || 0;
        const eIcons = { Fire:'🔥', Water:'💧', Earth:'🪨', Air:'🌪️' };
        const statLabels = { courage:'Coragem', power:'Poder', wisdom:'Sabedoria', speed:'Velocidade' };
        const bonusLines = [];

        if (atkCard.elementRequirement && attacker) {
            const hasElem = attacker.elements?.includes(atkCard.elementRequirement);
            const bonus   = atkCard.elementDamage || 0;
            if (hasElem) dmg += bonus;
            bonusLines.push(`${eIcons[atkCard.elementRequirement]||''}${atkCard.elementRequirement}: +${bonus} ${hasElem ? '✅' : '❌'}`);
        }
        if (atkCard.elementBonuses && attacker) {
            atkCard.elementBonuses.forEach(eb => {
                const hasElem = attacker.elements?.includes(eb.element);
                if (hasElem) dmg += eb.damage || 0;
                bonusLines.push(`${eIcons[eb.element]||''}${eb.element}: +${eb.damage||0} ${hasElem ? '✅' : '❌'}`);
            });
        }
        if (atkCard.statRequirement && effAtk && effDef) {
            const sk  = atkCard.statRequirement.toLowerCase();
            const av  = effAtk[sk] || 0, dv = effDef[sk] || 0;
            const met = atkCard.statMode === 'challenge'
                ? (av - dv) >= (atkCard.statThreshold || 0)
                : av >= (atkCard.statThreshold || 0);
            if (met) dmg += atkCard.statDamage || 0;
            const lbl = statLabels[sk] || atkCard.statRequirement;
            const cond = atkCard.statMode === 'challenge'
                ? `${lbl} ${av}−${dv}≥${atkCard.statThreshold||0}`
                : `${lbl} ${av}≥${atkCard.statThreshold||0}`;
            bonusLines.push(`${cond}: +${atkCard.statDamage||0} ${met ? '✅' : '❌'}`);
        }

        const dc = dmg >= 20 ? '#4ade80' : dmg >= 10 ? '#fbbf24' : '#f87171';
        const bonusHtml = bonusLines.length
            ? `<div style="font-size:9px;color:#64748b;margin-top:3px;">${bonusLines.join(' · ')}</div>`
            : '';

        listEl.innerHTML = `
            <div class="chud-waiting" style="color:#94a3b8;font-style:normal;margin-bottom:6px;">Inimigo jogou:</div>
            <div class="chud-enemy-atk">
                <span class="chud-enemy-atk-icon">⚔️</span>
                <div style="flex:1;min-width:0;">
                    <div class="chud-enemy-atk-name">${atkCard.name}</div>
                    <div class="chud-enemy-atk-sub">⚡${atkCard.bp||0}BP · base ${atkCard.baseDamage||0} → <span style="color:${dc};font-weight:700;">💥${dmg}</span></div>
                    ${bonusHtml}
                </div>
            </div>`;
    },

    // Tooltip: mostra ao hover
    _chudShowAtkTooltip(event, idx) {
        const tt = document.getElementById('chud-atk-tooltip');
        if (!tt || !this._chudAtkHand) return;
        const atk     = this._chudAtkHand[idx];
        const attacker = this._chudAtkAtk;
        const defender = this._chudAtkDef;
        const effAtk  = this._chudAtkEffAtk || {};
        const effDef  = this._chudAtkEffDef || {};
        if (!atk) return;

        const eIcons    = { Fire:'🔥', Water:'💧', Earth:'🪨', Air:'🌪️' };
        const statLabels = { courage:'Coragem', power:'Poder', wisdom:'Sabedoria', speed:'Velocidade' };

        // Cabeçalho
        document.getElementById('chud-tt-name').textContent = atk.name;
        document.getElementById('chud-tt-meta').textContent = `⚡ ${atk.bp||0} BP`;

        // Linhas de detalhes
        let lines = [];
        let dmg = atk.baseDamage || 0;
        lines.push({ label: 'Dano base', val: dmg, met: null });

        if (atk.elementRequirement) {
            const hasElem = attacker?.elements?.includes(atk.elementRequirement);
            const bonus   = atk.elementDamage || 0;
            if (hasElem) dmg += bonus;
            lines.push({ label: `Req. ${eIcons[atk.elementRequirement]||''} ${atk.elementRequirement}`, val: `+${bonus}`, met: hasElem });
        }
        if (atk.elementBonuses) atk.elementBonuses.forEach(eb => {
            const hasElem = attacker?.elements?.includes(eb.element);
            if (hasElem) dmg += eb.damage || 0;
            lines.push({ label: `Bônus ${eIcons[eb.element]||''} ${eb.element}`, val: `+${eb.damage||0}`, met: hasElem });
        });
        if (atk.statRequirement) {
            const sk   = atk.statRequirement.toLowerCase();
            const av   = effAtk[sk]||0, dv = effDef[sk]||0;
            const thr  = atk.statThreshold || 0;
            const met  = atk.statMode === 'challenge' ? (av-dv) >= thr : av >= thr;
            if (met) dmg += atk.statDamage || 0;
            const lbl  = statLabels[sk] || atk.statRequirement;
            // Label legível: "Você tem 95 Poder, precisa de ≥ 50" / "Diferença 30, precisa de ≥ 15"
            const cond = atk.statMode === 'challenge'
                ? `${lbl}: você ${av} − inimigo ${dv} = ${av-dv} (precisa ≥ ${thr})`
                : `${lbl}: você tem ${av} (precisa ≥ ${thr})`;
            lines.push({ label: cond, val: `+${atk.statDamage||0}`, met });
        }

        const linesEl = document.getElementById('chud-tt-lines');
        linesEl.innerHTML = lines.map(l => {
            const metIcon = l.met === null ? '' : l.met
                ? '<span class="chud-tt-line-met">✅</span>'
                : '<span class="chud-tt-line-fail">❌</span>';
            const valColor = l.met === false ? '#475569' : l.met === true ? '#4ade80' : '#f1f5f9';
            return `<div class="chud-tt-line">
                <span class="chud-tt-line-label">${l.label}</span>
                <span class="chud-tt-line-val" style="color:${valColor};">${l.val}</span>
                ${metIcon}
            </div>`;
        }).join('');

        // Total
        const dc = dmg >= 20 ? '#4ade80' : dmg >= 10 ? '#fbbf24' : '#f87171';
        const totalEl = tt.querySelector('.chud-tt-total') || (() => {
            const d = document.createElement('div');
            d.className = 'chud-tt-total';
            tt.insertBefore(d, document.getElementById('chud-tt-desc'));
            return d;
        })();
        totalEl.textContent = `💥 Dano total: ${dmg}`;
        totalEl.style.color = dc;

        // Descrição
        const descEl = document.getElementById('chud-tt-desc');
        descEl.textContent = atk.description || '';
        descEl.style.display = atk.description ? 'block' : 'none';

        tt.classList.remove('hidden');
        this._chudMoveAtkTooltip(event);
    },

    _chudMoveAtkTooltip(event) {
        const tt = document.getElementById('chud-atk-tooltip');
        if (!tt || tt.classList.contains('hidden')) return;
        const x = event.clientX, y = event.clientY;
        const tw = tt.offsetWidth  || 280;
        const th = tt.offsetHeight || 200;
        const left = (x + 16 + tw > window.innerWidth)  ? x - tw - 12 : x + 16;
        const top  = (y + th + 12 > window.innerHeight)  ? y - th - 8  : y + 12;
        tt.style.left = left + 'px';
        tt.style.top  = top  + 'px';
    },

    _chudHideAtkTooltip() {
        const tt = document.getElementById('chud-atk-tooltip');
        if (tt) tt.classList.add('hidden');
    },

    // ── Tooltip do fighter inimigo ────────────────────────────────────────
    _chudShowFighterTooltip(event, isEnemy) {
        const tt = document.getElementById('chud-fighter-tooltip');
        if (!tt || !this.activeCombat) return;

        const myPN = this.multiplayerMode ? this.myPlayerNumber : 1;
        const card = isEnemy
            ? (myPN === 1 ? this.activeCombat.p2Card : this.activeCombat.p1Card)
            : (myPN === 1 ? this.activeCombat.p1Card : this.activeCombat.p2Card);
        if (!card) return;

        // Calcula stats efetivos
        const atkPN = isEnemy ? (myPN === 1 ? 2 : 1) : myPN;
        const ac    = this.activeCombat;
        const r     = isEnemy ? (myPN === 1 ? ac.p2R : ac.p1R) : (myPN === 1 ? ac.p1R : ac.p2R);
        const c     = isEnemy ? (myPN === 1 ? ac.p2C : ac.p1C) : (myPN === 1 ? ac.p1C : ac.p2C);
        const eff   = (typeof this._effectiveStats === 'function')
            ? this._effectiveStats(card, atkPN, r, c)
            : {};

        // Preenche header
        const imgEl = document.getElementById('chud-ftt-img');
        if (imgEl) { imgEl.src = card.image || ''; imgEl.style.display = card.image ? 'block' : 'none'; }
        const nameEl = document.getElementById('chud-ftt-name');
        if (nameEl) nameEl.textContent = card.name;
        const tribeEl = document.getElementById('chud-ftt-tribe');
        if (tribeEl) tribeEl.textContent = card.tribe || '';

        // Stats — mostra efetivo vs base se diferente
        const statDefs = [
            { key:'courage', icon:'💪', label:'Coragem', color:'#f97316' },
            { key:'power',   icon:'⚡', label:'Poder',   color:'#a78bfa' },
            { key:'wisdom',  icon:'🧠', label:'Sabedoria',color:'#38bdf8' },
            { key:'speed',   icon:'💨', label:'Velocidade',color:'#4ade80'},
        ];
        const statsEl = document.getElementById('chud-ftt-stats');
        if (statsEl) statsEl.innerHTML = statDefs.map(s => {
            const base = card[s.key] ?? 0;
            const effV = eff[s.key] ?? base;
            const diff = effV - base;
            const diffStr = diff > 0 ? ` <span style="color:#4ade80;font-size:9px;">(+${diff})</span>`
                          : diff < 0 ? ` <span style="color:#f87171;font-size:9px;">(${diff})</span>` : '';
            return `<div class="chud-ftt-stat">
                <span class="chud-ftt-stat-icon">${s.icon}</span>
                <div>
                    <div class="chud-ftt-stat-lbl">${s.label}</div>
                    <div class="chud-ftt-stat-val" style="color:${s.color}">${effV}${diffStr}</div>
                </div>
            </div>`;
        }).join('');

        // Extra: energia, mugic counters, battlegear
        const extraEl = document.getElementById('chud-ftt-extra');
        if (extraEl) {
            const hp     = card.energy ?? 0;
            const maxHp  = card.maxEnergy ?? hp;
            const mc     = card.mugicCounters ?? 0;
            const eIcons = { Fire:'🔥', Water:'💧', Earth:'🪨', Air:'🌪️' };
            const elems  = (card.elements||[]).map(e => `${eIcons[e]||''}${e}`).join(', ');
            const bgLine = (card.battlegear && card.bgRevealed)
                ? `🛡️ <b>${card.battlegear.name}</b>${card.battlegear.effect ? ` — ${card.battlegear.effect}` : ''}`
                : card.battlegear ? '🛡️ <em>Battlegear oculto</em>' : '';
            extraEl.innerHTML = [
                `❤️ ${hp}/${maxHp} energia`,
                mc > 0 ? `♪ ${mc} mugic counter${mc>1?'s':''}` : null,
                elems ? `${elems}` : null,
                bgLine || null,
            ].filter(Boolean).map(l => `<div>${l}</div>`).join('');
        }

        tt.classList.remove('hidden');
        this._chudMoveFighterTooltip(event);
    },

    _chudMoveFighterTooltip(event) {
        const tt = document.getElementById('chud-fighter-tooltip');
        if (!tt || tt.classList.contains('hidden')) return;
        const x  = event.clientX, y = event.clientY;
        const tw = tt.offsetWidth  || 260;
        const th = tt.offsetHeight || 220;
        const left = (x + 16 + tw > window.innerWidth)  ? x - tw - 12 : x + 16;
        const top  = (y + th + 12 > window.innerHeight)  ? y - th - 8  : y + 12;
        tt.style.left = left + 'px';
        tt.style.top  = top  + 'px';
    },

    _chudHideFighterTooltip() {
        const tt = document.getElementById('chud-fighter-tooltip');
        if (tt) tt.classList.add('hidden');
    },

    // Limpa o painel de ataques (após seleção)
    _clearCombatHudAttacks() {
        // Esconde tooltip antes de limpar (evita ficar preso na tela)
        this._chudHideAtkTooltip();
        const listEl = document.getElementById('chud-attack-list');
        if (listEl) listEl.innerHTML = '<div class="chud-waiting">Aguardando...</div>';
    },

    // Abre seletor de mugic direto no painel de Decisão do HUD
    _hudOpenMugicSelector() {
        const decPanel = document.getElementById('chud-decision-btns');
        const waitEl   = document.getElementById('chud-waiting-msg');
        const titleEl  = document.getElementById('chud-decisions-title');

        const myPN       = this.multiplayerMode ? this.myPlayerNumber : 1;
        const mugics     = myPN === 1 ? this.playerMugics : this.p2Mugics;
        const ac         = this.activeCombat;
        const myCard     = ac ? (myPN === 1 ? ac.p1Card : ac.p2Card) : null;
        const enemyCard  = ac ? (myPN === 1 ? ac.p2Card : ac.p1Card) : null;

        if (!mugics || mugics.length === 0) {
            if (waitEl) { waitEl.style.display = 'block'; waitEl.textContent = '❌ Sem Mugics na mão!'; }
            if (decPanel) decPanel.style.display = 'none';
            return;
        }

        if (titleEl) titleEl.textContent = '🎶 Escolha um Mugic';
        if (decPanel) decPanel.style.display = 'none';
        if (waitEl)   waitEl.style.display = 'none';

        // Monta lista de mugics no painel de decisão
        const container = document.getElementById('chud-burst-summary');
        if (!container) { this.showBurstMugicSelection(); return; }

        const tribeColors = { OverWorld:'#0ea5e9', UnderWorld:'#dc2626', Mipedian:'#d97706', Danian:'#16a34a', Generic:'#64748b' };

        container.innerHTML = `
            <div style="font-size:10px;color:#64748b;margin-bottom:6px;">Cartas disponíveis:</div>
            ${mugics.map((mg, i) => {
                const tc = tribeColors[mg.tribe] || '#64748b';
                const eff = mg.effect || mg.description || mg.text || '';
                return `<div class="chud-mugic-row" onclick="game._hudPlayMugic(${i})">
                    <div class="chud-mugic-name" style="color:${tc};">🎶 ${mg.name}</div>
                    ${eff ? `<div class="chud-mugic-eff">${eff}</div>` : ''}
                </div>`;
            }).join('')}
            <button class="chud-btn" style="background:rgba(100,116,139,0.4);margin-top:8px;" onclick="game._hudCancelMugicSelect()">✖ Cancelar</button>
        `;
    },

    // Joga um mugic escolhido no HUD — depois mostra picker de criatura pagadora
    _hudPlayMugic(idx) {
        const myPN    = this.multiplayerMode ? this.myPlayerNumber : 1;
        const mugics  = myPN === 1 ? this.playerMugics : this.p2Mugics;
        const mg      = mugics ? mugics[idx] : null;
        if (!mg) return;

        // Salva o índice e muda estado do jogo (sem fechar nada)
        this.pendingMugicIndex = idx;
        this.gameState = 'SELECT_MUGIC_CASTER';
        this.sendAction && this.sendAction('selectMugic', { index: idx, mugicData: mg, casterPlayerNum: myPN });
        this.log(`🪄 Você escolheu [${mg.name}] (custo base: ${mg.cost}♪). Escolha a criatura que vai pagar o custo.`);

        // Mostra picker de criaturas no painel de Decisão
        this._hudShowCasterPicker(mg);
    },

    // Mostra picker inline de criaturas para pagar o custo da mugic
    _hudShowCasterPicker(mg) {
        const container = document.getElementById('chud-burst-summary');
        const titleEl   = document.getElementById('chud-decisions-title');
        const decPanel  = document.getElementById('chud-decision-btns');
        const waitEl    = document.getElementById('chud-waiting-msg');
        if (!container) return;

        if (titleEl) titleEl.textContent = '🎶 Quem vai pagar?';
        if (decPanel) decPanel.style.display = 'none';
        if (waitEl)   waitEl.style.display = 'none';

        const myPN    = this.multiplayerMode ? this.myPlayerNumber : 1;
        const myBoard = myPN === 1 ? this.boardP1 : this.boardP2;
        const mugTribe = mg.tribe || 'Generic';

        let creaturesHtml = '';
        for (let r = 0; r < myBoard.length; r++) {
            for (let c = 0; c < myBoard[r].length; c++) {
                const card = myBoard[r][c];
                if (!card) continue;
                const sameTribe = card.tribe === mugTribe || mugTribe === 'Generic';
                const cost = sameTribe ? (mg.cost || 1) : (mg.cost || 1) + 1;
                const canPay = (card.mugicCounters || 0) >= cost;
                const counters = card.mugicCounters || 0;
                const tribeColors = { OverWorld:'#0ea5e9', UnderWorld:'#dc2626', Mipedian:'#d97706', Danian:'#16a34a', Generic:'#64748b' };
                const tc = tribeColors[card.tribe] || '#64748b';
                creaturesHtml += `<div class="chud-caster-row ${canPay ? '' : 'chud-caster-disabled'}"
                    onclick="${canPay ? `game._hudSelectCaster(${r},${c})` : ''}">
                    <div class="chud-caster-name" style="color:${tc}">${card.name}</div>
                    <div class="chud-caster-sub">♪ ${counters}/${cost} ${!sameTribe ? '(+1 tribo diferente)' : ''} ${canPay ? '' : '❌ sem counters'}</div>
                </div>`;
            }
        }

        container.innerHTML = `
            <div style="font-size:10px;color:#64748b;margin-bottom:6px;">Criatura pagadora (custo: ♪${mg.cost || 1}):</div>
            ${creaturesHtml || '<div style="color:#f87171;font-size:10px;">Nenhuma criatura pode pagar!</div>'}
            <button class="chud-btn" style="background:rgba(100,116,139,0.4);margin-top:8px;" onclick="game._hudCancelMugicCaster()">✖ Cancelar</button>
        `;
    },

    _hudSelectCaster(r, c) {
        // resolveMugicCaster vai chamar openBurstModal() ao final,
        // que por sua vez chama _updateCombatHudDecisions — restaura HUD automaticamente
        if (typeof this.resolveMugicCaster === 'function') {
            this.resolveMugicCaster(r, c);
        }
    },

    _hudCancelMugicCaster() {
        if (typeof this.cancelMugicCaster === 'function') {
            this.cancelMugicCaster(); // engine restaura o estado e abre burst modal
        } else {
            this.gameState = 'ENGAGED_COMBAT';
            this.pendingMugicIndex = null;
            this._hudCancelMugicSelect();
        }
    },

    _hudCancelMugicSelect() {
        const titleEl = document.getElementById('chud-decisions-title');
        if (titleEl) titleEl.textContent = '🔔 Decisão';
        this._updateCombatHudDecisions(true, false);
        this._updateCombatHudBurstSummary();
    },

    // Adiciona entrada ao log do HUD
    _addCombatHudLog(text, type) {
        const el = document.getElementById('chud-log-entries');
        if (!el) return;
        const entry = document.createElement('div');
        entry.className = `chud-log-entry ${type || 'info'}`;
        entry.textContent = text;
        el.appendChild(entry);
        el.scrollTop = el.scrollHeight;
        // Limita a 30 entradas
        while (el.children.length > 30) el.removeChild(el.firstChild);
    },

    // Atualiza log do HUD a partir do log principal
    _updateCombatHudLog() {
        const el = document.getElementById('chud-log-entries');
        if (!el || !this.logElement) return;
        const entries = Array.from(this.logElement.querySelectorAll(
            '.log-entry, .log-combat-header, .log-round-header'
        )).slice(-20);
        el.innerHTML = '';
        entries.forEach(src => {
            const typeMatch = [...src.classList].find(c => c.startsWith('log-entry-'));
            const type = typeMatch ? typeMatch.replace('log-entry-', '') : 'info';
            const d = document.createElement('div');
            d.className = `chud-log-entry ${type}`;
            d.textContent = src.textContent;
            el.appendChild(d);
        });
        el.scrollTop = el.scrollHeight;
    },

    // ── Destaque no tabuleiro: glow pulsante nas criaturas em combate ──────
    _renderCombatHighlight() {
        // Remove highlights antigos
        document.querySelectorAll('.card-in-combat-attacker, .card-in-combat-defender').forEach(el => {
            el.classList.remove('card-in-combat-attacker', 'card-in-combat-defender');
        });

        const ac = this.activeCombat;
        if (!ac) return;

        // Identificar posições: p1Card=atacante iniciador (ou P1), p2Card=defensor/P2
        const atkPosEl = document.querySelector(`[data-pos="p1-${ac.p1R}-${ac.p1C}"]`);
        const defPosEl = document.querySelector(`[data-pos="p2-${ac.p2R}-${ac.p2C}"]`);

        if (atkPosEl) atkPosEl.classList.add('card-in-combat-attacker');
        if (defPosEl) defPosEl.classList.add('card-in-combat-defender');
    },

    // ── Banner de spotlight: mostra os combatentes no topo da tela ─────────
    _updateCombatSpotlight() {
        const spotEl = document.getElementById('combat-spotlight');
        if (!spotEl) return;

        const ac = this.activeCombat;
        if (!ac) {
            spotEl.classList.remove('visible');
            return;
        }

        const atkCard = ac.p1Card;
        const defCard = ac.p2Card;
        const round   = ac.rounds || 0;

        const _fighterHtml = (card, side) => {
            if (!card) return '';
            const isAtk  = side === 'atk';
            const imgEl  = card.image
                ? `<img src="${card.image}" class="cspot-img ${isAtk ? 'atk-img' : 'def-img'}" alt="${card.name}">`
                : `<div class="cspot-img-placeholder">${isAtk ? '⚔️' : '🛡️'}</div>`;
            const energyPct = card.maxEnergy > 0 ? Math.round((card.energy / card.maxEnergy) * 100) : 0;
            const eColor = energyPct > 60 ? '#4ade80' : energyPct > 30 ? '#fbbf24' : '#ef4444';
            return `
                ${imgEl}
                <div class="cspot-info ${isAtk ? '' : 'right'}">
                    <div class="cspot-name">${card.name}</div>
                    <div class="cspot-tribe">${card.tribe || ''}</div>
                    <div class="cspot-energy ${isAtk ? 'atk' : 'def'}" style="color:${eColor};">❤️ ${card.energy}/${card.maxEnergy}</div>
                </div>`;
        };

        document.getElementById('cspot-atk').innerHTML = _fighterHtml(atkCard, 'atk');
        document.getElementById('cspot-def').innerHTML = _fighterHtml(defCard, 'def');
        document.getElementById('cspot-round').textContent = round > 0 ? `rodada ${round}` : 'combate';
        spotEl.classList.add('visible');
    },

    // ── Posiciona os painéis flutuantes dentro do #board (game container) ──
    _positionPanels() {
        const board = document.getElementById('board');
        if (!board) return;
        const rect = board.getBoundingClientRect();
        const pad  = 14; // margem interna dos painéis

        // Ataque: bottom-left do board
        const ahp = document.getElementById('attack-hand-panel');
        if (ahp) ahp.style.left = (rect.left + pad) + 'px';

        // Burst stack: bottom-right do board (deslocado para dar espaço ao log)
        const bsp = document.getElementById('burst-side-panel');
        if (bsp) bsp.style.right = (window.innerWidth - rect.right + pad + 262) + 'px';

        // Log: extremo direito dentro do board
        const blp = document.getElementById('burst-log-panel');
        if (blp) blp.style.right = (window.innerWidth - rect.right + pad) + 'px';

        // Spotlight: centralizado e abaixo do topo do board
        const spot = document.getElementById('combat-spotlight');
        if (spot) {
            // já tem left:50% + translateX(-50%), só precisa garantir top correto
            const topVal = Math.max(rect.top + 8, 8);
            spot.style.top = topVal + 'px';
        }
    },

    // ── Esconde spotlight quando combate termina ───────────────────────────
    _hideCombatSpotlight() {
        const spotEl = document.getElementById('combat-spotlight');
        if (spotEl) spotEl.classList.remove('visible');
        document.querySelectorAll('.card-in-combat-attacker, .card-in-combat-defender').forEach(el => {
            el.classList.remove('card-in-combat-attacker', 'card-in-combat-defender');
        });
    },

});

