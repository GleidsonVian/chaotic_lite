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
                <div class="mugic-card${selClass}" onclick="game.handleMugicClick(${index})" title="${mugic.name}: ${mugic.description.replace(/"/g,'&quot;')}">
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
            html = '<div style="color: #7f8c8d; padding-top: 50px;">Sem Mugics na mão.</div>';
        }

        container.innerHTML = html;
    },

    handleMugicClick(index) {
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
            return;
        }

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
        // Em multiplayer, verifica se é o turno deste jogador
        if (!this.isMyTurn()) return;
        const myPlayer = this.multiplayerMode ? this.myPlayerNumber : 1;

        if (this.gameState === 'SELECT_MUGIC_CASTER') {
            if (player === myPlayer && (myPlayer === 1 ? this.boardP1[r][c] : this.boardP2[r][c])) {
                this.resolveMugicCaster(r, c);
            } else {
                this.log("⚠️ Selecione uma de SUAS criaturas para pagar o custo do Mugic.");
            }
            return;
        }

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
                // Sem Range: só pode atacar criaturas expostas
                if (!exposed && !hasRange) {
                    this.log(`🛡️ ${clickedCard.name} está protegida! ${hasRange ? '' : 'Use uma criatura com Range para atacar posições protegidas.'}`);
                    return;
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

        this.boardElement.innerHTML = `<div style="width: 100%; text-align: center; margin-bottom: 20px;">
            <h3 style="color: var(--accent); margin-bottom: 5px;">Turno Atual: Jogador ${this.turn}</h3>
            <p style="color: ${this.gameState === 'SELECT_TARGET' || this.gameState === 'SELECT_MUGIC_CASTER' ? 'var(--danger)' : 'var(--text-muted)'}; font-weight: bold; font-size: 1.1em;">${msgEstado}</p>
        </div>`;

        const renderPlayerBoard = (board, player) => {
            let html = `<div style="display: flex; flex-direction: row; gap: 10px; align-items: center; justify-content: center;">`;
            // Para P1 (Esquerda), as linhas (agora colunas verticais) da esq para dir são: Trás(2), Meio(1), Frente(0)
            // Para P2 (Direita), as linhas da esq para dir são: Frente(0), Meio(1), Trás(2)
            const rows = player === 1 ? [2, 1, 0] : [0, 1, 2];

            rows.forEach(r => {
                html += `<div style="display: flex; flex-direction: column; gap: 20px; justify-content: center; height: 100%;">`;
                for(let c = 0; c < board[r].length; c++) {
                    const card = board[r][c];
                    const isSelected = this.selectedAttacker && this.selectedAttacker.player === player && this.selectedAttacker.r === r && this.selectedAttacker.c === c;
                    const exposed = this.isExposed(player, r, c);

                    const borderStyle = isSelected ? '3px solid #f1c40f' : `2px solid ${player === 2 ? '#c0392b' : '#2980b9'}`;
                    const shadowStyle = isSelected ? 'box-shadow: 0 0 15px #f1c40f; transform: scale(1.05);' : '';

                    let cursorStyle = '';
                    let opacityStyle = '';

                    if (card) {
                        if (!exposed) {
                            cursorStyle = 'cursor: not-allowed;';
                            opacityStyle = 'opacity: 0.6; filter: grayscale(30%);';
                        } else {
                            const myP = this.multiplayerMode ? this.myPlayerNumber : 1;
                            const enemyP = myP === 1 ? 2 : 1;
                            cursorStyle = (this.isMyTurn() && player === myP) || (this.isMyTurn() && this.gameState === 'SELECT_TARGET' && player === enemyP) ? 'cursor: pointer;' : '';
                        }
                    }

                    if (card) {
                        const animState = this.combatAnimationState || {};
                        const isAttackerAnim = animState.attacker && animState.attacker.player === player && animState.attacker.r === r && animState.attacker.c === c;
                        const isDefenderAnim = animState.defender && animState.defender.player === player && animState.defender.r === r && animState.defender.c === c;
                        const animClass = isDefenderAnim && animState.destroyed ? 'defeat-anim' : isAttackerAnim ? 'attack-anim' : isDefenderAnim ? 'hit-anim' : '';

                        // Preview de combate: só em cartas inimigas quando atacante selecionado
                        const myP    = this.multiplayerMode ? this.myPlayerNumber : 1;
                        const enemyP = myP === 1 ? 2 : 1;
                        let previewHtml = '';
                        if (this.gameState === 'SELECT_TARGET' && this.selectedAttacker && player === enemyP && !card._invisibility) {
                            const myBoard  = myP === 1 ? this.boardP1 : this.boardP2;
                            const attCard  = myBoard[this.selectedAttacker.r][this.selectedAttacker.c];
                            if (attCard) {
                                const prev = this._getCombatPreview(
                                    attCard, this.selectedAttacker.r, this.selectedAttacker.c, myP,
                                    card, r, c
                                );
                                previewHtml = `
                                    <div style="
                                        position:absolute; inset:0; border-radius:8px; z-index:5;
                                        background: linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.88) 70%);
                                        display:flex; flex-direction:column; justify-content:flex-end;
                                        padding:6px; pointer-events:none;
                                    ">
                                        <div style="text-align:center; line-height:1.3;">
                                            <div style="font-size:16px;">${prev.emoji}</div>
                                            <div style="font-size:10px; font-weight:800; color:${prev.color}; letter-spacing:0.5px;">${prev.verdict}</div>
                                            <div style="font-size:9px; color:#cbd5e1; margin-top:2px;">${prev.initLabel}</div>
                                            <div style="display:flex; justify-content:center; gap:6px; margin-top:3px; font-size:9px;">
                                                <span style="color:#22c55e;">💥 ${prev.myDmg}</span>
                                                <span style="color:#94a3b8;">vs</span>
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
                            displayMaxEnergy += syn.energy;
                            displayEnergy += syn.energy;
                            displayCourage += syn.courage;
                            displayPower += syn.power;
                            displayWisdom += syn.wisdom;
                            displaySpeed += syn.speed;
                        }

                        let bgDisplayHtml = '';
                        if (card.bgRevealed && card.battlegear) {
                            const mod = card.battlegear.modifiers || {};
                            displayMaxEnergy += mod.energy || 0;
                            displayEnergy += mod.energy || 0;
                            displayCourage += mod.courage || 0;
                            displayPower += mod.power || 0;
                            displayWisdom += mod.wisdom || 0;
                            displaySpeed += mod.speed || 0;
                            bgDisplayHtml = `<div style="text-align: center; font-size: 10px; color: #f1c40f; background: rgba(0,0,0,0.8); margin: 2px 0; padding: 2px; border-radius: 3px;">Equipado: ${card.battlegear.name}</div>`;
                        } else if (card.battlegear && !card.bgRevealed) {
                            if (player === 1) {
                                bgDisplayHtml = `<div style="text-align: center; font-size: 10px; color: #bdc3c7; background: rgba(0,0,0,0.8); margin: 2px 0; padding: 2px; border-radius: 3px; border: 1px dashed #7f8c8d;" title="Oculto para o oponente">[Escondido] ${card.battlegear.name}</div>`;
                            } else {
                                bgDisplayHtml = `<div style="text-align: center; font-size: 10px; color: #7f8c8d; background: rgba(0,0,0,0.8); margin: 2px 0; padding: 2px; border-radius: 3px;">Item: Face Down</div>`;
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
                        }

                        html += `
                            <div class="card ${animClass}" onclick="game.handleCardClick(${player}, ${r}, ${c})" title="${this.getPassiveDescription(card).replace(/"/g, '&quot;')}" style="border: ${finalBorder}; ${finalShadow} ${cursorStyle} ${opacityStyle} transition: all 0.2s; position:relative; overflow:hidden;">
                                ${previewHtml}
                                <div class="card-header">
                                    <div class="card-rarity-icon rarity-${(card.rarity || 'Common').toLowerCase().replace(/\s+/g, '-')}" title="${card.rarity || 'Common'}">${card.rarity === 'Ultra Rare' ? '💎' : card.rarity === 'Super Rare' ? '🔷' : card.rarity === 'Rare' ? '🔶' : card.rarity === 'Legendary' ? '🌟' : '⚪'}</div>
                                    <div class="card-tribe">${card.tribe}</div>
                                    <div class="card-name">${card.name}</div>
                                </div>
                                <div class="card-image-container">
                                    ${card.image ? `<img src="${card.image}" class="card-image" alt="${card.name}">` : `<div class="card-image-placeholder">Sem Imagem</div>`}
                                </div>
                                ${bgDisplayHtml}
                                ${(() => {
                                    let eHtml = '';
                                    if (card.elements && card.elements.length > 0) {
                                        const iconMap = { "Fire": "🔥", "Water": "💧", "Earth": "🪨", "Air": "🌪️" };
                                        eHtml = `<div style="display: flex; gap: 5px; justify-content: center; margin-top: -10px; z-index: 2; position: relative;">`;
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
                                    return badges ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px;padding:2px 0;">${badges}</div>` : '';
                                })()}
                                ${syn ? `<div style="text-align: center; font-size: 10px; background: rgba(52, 152, 219, 0.2); color: #3498db; padding: 2px; border-bottom: 1px solid #3498db; font-weight: bold;">${syn.description}</div>` : ''}
                                <div class="card-stats">
                                    <div class="stat-box" data-tip="Coragem — define quem ataca primeiro na iniciativa. Usada em ataques de Courage e pela passiva Intimidate."><span class="stat-icon">⚔️</span><span class="stat-label">COR</span><span class="stat-value" style="${syn && syn.courage ? 'color:#3498db;font-weight:bold;' : ''}">${displayCourage}</span></div>
                                    <div class="stat-box" data-tip="Poder — usado em ataques físicos de Poder. Quanto maior, mais dano em ataques de Power."><span class="stat-icon">💪</span><span class="stat-label">POD</span><span class="stat-value" style="${syn && syn.power ? 'color:#3498db;font-weight:bold;' : ''}">${displayPower}</span></div>
                                    <div class="stat-box" data-tip="Sabedoria — usado em ataques mágicos de Sabedoria. Também define quem pode conjurar Mugics mais caras."><span class="stat-icon">🧠</span><span class="stat-label">SAB</span><span class="stat-value" style="${syn && syn.wisdom ? 'color:#3498db;font-weight:bold;' : ''}">${displayWisdom}</span></div>
                                    <div class="stat-box" data-tip="Velocidade — usado em ataques de Speed e na disputa de iniciativa. Swift aumenta este valor."><span class="stat-icon">⚡</span><span class="stat-label">VEL</span><span class="stat-value" style="${syn && syn.speed ? 'color:#3498db;font-weight:bold;' : ''}">${displaySpeed}</span></div>
                                </div>
                                <div class="card-energy-container">
                                    <div style="background-color:#2c3e50;border-radius:4px;overflow:hidden;width:100%;position:relative;height:22px;border:1px solid #000;">
                                        <div style="width:${Math.max(0,(displayEnergy/displayMaxEnergy)*100)}%;height:100%;background-color:${(displayEnergy/displayMaxEnergy)>0.5?'#2ecc71':(displayEnergy/displayMaxEnergy)>0.2?'#f1c40f':'#e74c3c'};transition:width 0.4s ease-out,background-color 0.4s ease-out;"></div>
                                        <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;justify-content:center;align-items:center;font-size:0.9em;font-weight:bold;color:white;text-shadow:1px 1px 3px rgba(0,0,0,0.8);">
                                            ❤️ ${Math.max(0,displayEnergy)} / ${displayMaxEnergy}
                                        </div>
                                    </div>
                                    ${this._mugicCountersHtml(card)}
                                </div>
                            </div>
                        `;
                    } else {
                        // Slot vazio
                        let emptyCursor = '';
                        let emptyBorder = 'border: 2px dashed #bdc3c7;';
                        let emptyBg = '';

                        // Destacar slot vazio se puder mover para ele
                        const myPl = this.multiplayerMode ? this.myPlayerNumber : 1;
                        if (this.gameState === 'SELECT_TARGET' && player === myPl && this.selectedAttacker) {
                            if (this.isValidMove(this.selectedAttacker.r, this.selectedAttacker.c, r, c)) {
                                emptyCursor = 'cursor: pointer;';
                                emptyBorder = 'border: 2px dashed #2ecc71;'; // Verde para movimento
                                emptyBg = 'background-color: rgba(46, 204, 113, 0.15);';
                            }
                        }

                        html += `<div style="width: 110px; height: 150px; ${emptyBorder} ${emptyBg} border-radius: 8px; opacity: 0.6; ${emptyCursor} transition: all 0.2s;" onclick="game.handleCardClick(${player}, ${r}, ${c})"></div>`;
                    }
                }
                html += `</div>`;
            });
            html += `</div>`;
            return html;
        };

        let boardsHtml = '<div style="display: flex; flex-direction: row; width: 100%; justify-content: center; gap: 40px; align-items: center; margin-top: 20px;">';
        boardsHtml += renderPlayerBoard(this.boardP1, 1);
        boardsHtml += '<div style="width: 4px; height: 80%; min-height: 400px; background-color: #bdc3c7; border-radius: 2px;"></div>'; // Divisória vertical
        boardsHtml += renderPlayerBoard(this.boardP2, 2);
        boardsHtml += '</div>';

        this.boardElement.innerHTML += boardsHtml;

        // Dispara gotículas de sangue se houver uma criatura marcada como destruída
        const animState = this.combatAnimationState;
        if (animState && animState.destroyed) {
            // Encontra o elemento com defeat-anim recém criado e injeta as gotículas
            requestAnimationFrame(() => {
                const defeatEl = this.boardElement.querySelector('.card.defeat-anim');
                if (defeatEl) this._spawnBloodDrops(defeatEl);
            });
        }
    },

});
