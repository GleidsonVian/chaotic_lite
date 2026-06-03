// engine-decks.js — Sistema de decks salvos + histórico de torneios (localStorage)
Object.assign(GameEngine.prototype, {

    // ── Chaves no localStorage ────────────────────────────────────────────────
    _DECKS_KEY:       'chaotic_lite_decks',
    _TOURNAMENT_KEY:  'chaotic_lite_tournaments',

    // ── Histórico de torneios ─────────────────────────────────────────────────

    _saveTournamentToHistory(entry) {
        try {
            const history = JSON.parse(localStorage.getItem(this._TOURNAMENT_KEY) || '[]');
            history.unshift({ ...entry, id: Date.now() }); // mais recente primeiro
            // Mantém só os últimos 20
            if (history.length > 20) history.splice(20);
            localStorage.setItem(this._TOURNAMENT_KEY, JSON.stringify(history));
        } catch(_) {}
    },

    _loadTournamentHistory() {
        try {
            return JSON.parse(localStorage.getItem(this._TOURNAMENT_KEY) || '[]');
        } catch(_) { return []; }
    },

    renderTournamentHistory() {
        const panel = document.getElementById('tournament-history-panel');
        if (!panel) return;

        const history = this._loadTournamentHistory();
        if (history.length === 0) {
            panel.innerHTML = `<div style="color:#334155;font-size:12px;padding:8px 0;">Nenhuma série jogada ainda.</div>`;
            return;
        }

        const modeIcon = { '6v6':'⚔️', '3v3':'⚡', '1v1':'🥊' };
        panel.innerHTML = history.map(entry => {
            const won       = entry.won;
            const myName    = entry.myP === 1 ? entry.p1Name : entry.p2Name;
            const oppName   = entry.myP === 1 ? entry.p2Name : entry.p1Name;
            const myWins    = entry.myP === 1 ? entry.p1Wins : entry.p2Wins;
            const oppWins   = entry.myP === 1 ? entry.p2Wins : entry.p1Wins;
            const resultColor = won ? '#22c55e' : '#ef4444';
            const resultIcon  = won ? '🏆' : '💀';

            return `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;
                background:rgba(255,255,255,0.03);border:1px solid #1e293b;
                border-radius:8px;border-left:3px solid ${resultColor};">
                <span style="font-size:18px;">${resultIcon}</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:12px;font-weight:700;color:#e2e8f0;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        vs ${oppName}
                    </div>
                    <div style="font-size:10px;color:#475569;margin-top:1px;">
                        ${modeIcon[entry.mode]||'🎮'} ${entry.mode}
                        &nbsp;·&nbsp;
                        <span style="color:${resultColor};font-weight:700;">${myWins} - ${oppWins}</span>
                        &nbsp;·&nbsp;${entry.date}
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    clearTournamentHistory() {
        try { localStorage.removeItem(this._TOURNAMENT_KEY); } catch(_) {}
        this.renderTournamentHistory();
    },

    _toggleTournamentHistory() {
        const body  = document.getElementById('tournament-history-body');
        const arrow = document.getElementById('tournament-history-arrow');
        if (!body) return;
        const open = body.style.display === 'none';
        body.style.display  = open ? 'block' : 'none';
        if (arrow) arrow.style.transform = open ? 'rotate(180deg)' : '';
        if (open) this.renderTournamentHistory();
    },

    // ── Chave no localStorage ─────────────────────────────────────────────────
    _DECKS_KEY: 'chaotic_lite_decks',

    // ── Carregar todos os decks salvos ────────────────────────────────────────
    _loadSavedDecks() {
        try {
            return JSON.parse(localStorage.getItem(this._DECKS_KEY) || '[]');
        } catch(_) { return []; }
    },

    // ── Persistir array de decks ──────────────────────────────────────────────
    _persistDecks(decks) {
        try { localStorage.setItem(this._DECKS_KEY, JSON.stringify(decks)); } catch(_) {}
    },

    // ── Prompt para salvar deck com nome ─────────────────────────────────────
    saveDeckPrompt() {
        if (this.draftedCards.length === 0) {
            this.showAlert('⚠️ Deck vazio', 'Selecione pelo menos 1 criatura antes de salvar.');
            return;
        }

        // Cria modal inline de nome
        const old = document.getElementById('save-deck-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'save-deck-modal';
        modal.style.cssText = `
            position:fixed;inset:0;z-index:9990;display:flex;
            align-items:center;justify-content:center;
            background:rgba(0,0,0,0.75);`;
        modal.innerHTML = `
            <div style="background:#0f172a;border:1px solid #334155;border-radius:16px;
                padding:28px 32px;width:360px;max-width:92vw;font-family:inherit;">
                <h3 style="color:#f1f5f9;margin:0 0 6px;font-size:18px;">💾 Salvar Deck</h3>
                <p style="color:#64748b;font-size:12px;margin:0 0 18px;">
                    ${this.draftedCards.length} criaturas · ${this.gameMode} · ${this._getDeckTribeLabel()}
                </p>
                <input id="deck-name-input" type="text" maxlength="40"
                    placeholder="Nome do deck (ex: Fire UnderWorld 6v6)"
                    value="${this._suggestDeckName()}"
                    style="width:100%;background:#1e293b;border:1px solid #334155;
                        border-radius:8px;padding:10px 12px;color:#e2e8f0;
                        font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;"
                    onfocus="this.style.borderColor='#3b82f6'"
                    onblur="this.style.borderColor='#334155'">
                <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
                    <button onclick="document.getElementById('save-deck-modal').remove()"
                        style="background:transparent;border:1px solid #334155;border-radius:8px;
                            color:#64748b;padding:8px 18px;cursor:pointer;font-family:inherit;">
                        Cancelar
                    </button>
                    <button onclick="game._confirmSaveDeck()"
                        style="background:#22c55e;border:none;border-radius:8px;
                            color:#000;font-weight:700;padding:8px 20px;cursor:pointer;font-family:inherit;">
                        Salvar
                    </button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        setTimeout(() => {
            const inp = document.getElementById('deck-name-input');
            if (inp) { inp.focus(); inp.select(); }
        }, 50);

        // Enter confirma
        document.getElementById('deck-name-input').addEventListener('keydown', e => {
            if (e.key === 'Enter') this._confirmSaveDeck();
        });
    },

    _suggestDeckName() {
        const tribes = [...new Set(this.draftedCards.map(c => c.tribe))];
        const tribeStr = tribes.length === 1 ? tribes[0] : tribes.join('/');
        return `${tribeStr} ${this.gameMode}`;
    },

    _getDeckTribeLabel() {
        const tribes = [...new Set(this.draftedCards.map(c => c.tribe))];
        return tribes.join(', ') || '—';
    },

    _confirmSaveDeck() {
        const input = document.getElementById('deck-name-input');
        const name  = (input ? input.value.trim() : '') || this._suggestDeckName();

        const deck = {
            id:          Date.now(),
            name,
            gameMode:    this.gameMode,
            savedAt:     new Date().toLocaleDateString('pt-BR'),
            cards:       JSON.parse(JSON.stringify(this.draftedCards)),
            battlegears: JSON.parse(JSON.stringify(this.draftedBattlegears || [])),
            mugics:      JSON.parse(JSON.stringify(this.draftedMugics || [])),
            attacks:     JSON.parse(JSON.stringify(this.draftedAttacks || [])),
        };

        const decks = this._loadSavedDecks();
        decks.unshift(deck); // mais recente primeiro
        this._persistDecks(decks);

        document.getElementById('save-deck-modal')?.remove();
        this.renderSavedDecks();
        this.showAlert('✅ Deck Salvo!', `"${name}" foi salvo com sucesso.\nVocê pode carregá-lo no início do próximo draft.`);
    },

    // ── Carregar deck salvo no draft ──────────────────────────────────────────
    loadSavedDeck(deckId) {
        const decks = this._loadSavedDecks();
        const deck  = decks.find(d => d.id === deckId);
        if (!deck) return;

        this.showAlert(
            `📂 Carregar "${deck.name}"?`,
            `Modo: ${deck.gameMode} · Salvo em ${deck.savedAt}\n\nIsso substituirá a seleção atual.`
        ).then(() => {
            // Aplica o modo do deck
            this.setGameMode(deck.gameMode);

            // Reseta o draft
            this.draftedCards       = JSON.parse(JSON.stringify(deck.cards));
            this.draftedBattlegears = JSON.parse(JSON.stringify(deck.battlegears || []));
            this.draftedMugics      = JSON.parse(JSON.stringify(deck.mugics || []));
            this.draftedAttacks     = JSON.parse(JSON.stringify(deck.attacks || []));

            this._syncDraftControls();
            this.renderDraft();
            this.log(`📂 Deck "${deck.name}" carregado!`);
        });
    },

    // ── Renomear deck salvo ───────────────────────────────────────────────────
    renameDeck(deckId) {
        const decks = this._loadSavedDecks();
        const deck  = decks.find(d => d.id === deckId);
        if (!deck) return;

        const old = document.getElementById('rename-deck-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'rename-deck-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:9990;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);';
        modal.innerHTML = `
            <div style="background:#0f172a;border:1px solid #334155;border-radius:16px;
                padding:24px 28px;width:360px;max-width:92vw;font-family:inherit;">
                <h3 style="color:#f1f5f9;margin:0 0 14px;font-size:16px;">✏️ Renomear Deck</h3>
                <input id="rename-deck-input" type="text" maxlength="40"
                    value="${deck.name.replace(/"/g,'&quot;')}"
                    style="width:100%;background:#1e293b;border:1px solid #334155;border-radius:8px;
                        padding:10px 12px;color:#e2e8f0;font-size:14px;font-family:inherit;
                        outline:none;box-sizing:border-box;"
                    onfocus="this.style.borderColor='#3b82f6'"
                    onblur="this.style.borderColor='#334155'"
                    onkeydown="if(event.key==='Enter') game._confirmRenameDeck(${deckId})">
                <div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;">
                    <button onclick="document.getElementById('rename-deck-modal').remove()"
                        style="background:transparent;border:1px solid #334155;border-radius:8px;
                            color:#64748b;padding:8px 16px;cursor:pointer;font-family:inherit;">
                        Cancelar
                    </button>
                    <button onclick="game._confirmRenameDeck(${deckId})"
                        style="background:#3b82f6;border:none;border-radius:8px;
                            color:#fff;font-weight:700;padding:8px 20px;cursor:pointer;font-family:inherit;">
                        Salvar
                    </button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        setTimeout(() => {
            const inp = document.getElementById('rename-deck-input');
            if (inp) { inp.focus(); inp.select(); }
        }, 50);
    },

    _confirmRenameDeck(deckId) {
        const input   = document.getElementById('rename-deck-input');
        const newName = (input?.value || '').trim();
        if (!newName) return;

        const decks = this._loadSavedDecks();
        const deck  = decks.find(d => d.id === deckId);
        if (!deck) return;

        const oldName = deck.name;
        deck.name = newName;
        this._persistDecks(decks);

        document.getElementById('rename-deck-modal')?.remove();
        this.renderSavedDecks();
        this.log(`✏️ Deck renomeado: "${oldName}" → "${newName}"`);
    },

    // ── Deletar deck salvo ────────────────────────────────────────────────────
    deleteSavedDeck(deckId) {
        const decks    = this._loadSavedDecks();
        const deck     = decks.find(d => d.id === deckId);
        const filtered = decks.filter(d => d.id !== deckId);
        this._persistDecks(filtered);
        this.renderSavedDecks();
        if (deck) this.log(`🗑️ Deck "${deck.name}" removido.`);
    },

    // ── Renderizar lista de decks salvos ──────────────────────────────────────
    renderSavedDecks() {
        const content = document.getElementById('saved-decks-content');
        if (!content) return;

        const decks = this._loadSavedDecks();

        if (decks.length === 0) {
            content.innerHTML = `<div style="color:#334155;font-size:12px;padding:6px;">Nenhum deck salvo ainda.</div>`;
            return;
        }

        const modeIcon = { '6v6': '⚔️', '3v3': '⚡', '1v1': '🥊' };
        content.innerHTML = decks.map(deck => {
            const tribes = [...new Set((deck.cards || []).map(c => c.tribe))];
            const tribeColors = { OverWorld: '#3b82f6', UnderWorld: '#ef4444', Mipedian: '#f59e0b', Danian: '#8b5cf6' };
            const tribeDotsHtml = tribes.map(t =>
                `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;
                    background:${tribeColors[t] || '#64748b'};margin-right:2px;" title="${t}"></span>`
            ).join('');

            // Monta lista de criaturas para o tooltip de hover
            const creatureList = (deck.cards || [])
                .map(c => `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;">
                    <span style="width:7px;height:7px;border-radius:50%;background:${tribeColors[c.tribe]||'#64748b'};flex-shrink:0;"></span>
                    <span style="color:#e2e8f0;font-size:11px;">${c.name}</span>
                    <span style="color:#475569;font-size:10px;margin-left:auto;">${c.tribe}</span>
                </div>`).join('');

            const mugicList = (deck.mugics || [])
                .map(m => `<span style="color:#94a3b8;font-size:10px;">♪ ${m.name}</span>`).join('<br>');

            const tooltipContent = `
                <div style="font-weight:700;color:#f1f5f9;margin-bottom:6px;font-size:12px;">${deck.name}</div>
                <div style="color:#64748b;font-size:10px;margin-bottom:8px;">${modeIcon[deck.gameMode]||'🎮'} ${deck.gameMode} · ${deck.savedAt}</div>
                <div style="border-top:1px solid #1e293b;padding-top:6px;margin-bottom:6px;">${creatureList}</div>
                ${deck.mugics && deck.mugics.length ? `<div style="border-top:1px solid #1e293b;padding-top:6px;">${mugicList}</div>` : ''}
            `.replace(/`/g, '\\`');

            return `
            <div style="background:rgba(255,255,255,0.04);border:1px solid #1e293b;border-radius:10px;
                padding:10px 12px;min-width:180px;max-width:220px;flex:1;position:relative;"
                onmouseenter="game._showDeckPreview(event, ${deck.id})"
                onmouseleave="game._hideDeckPreview()">
                <div style="font-size:12px;font-weight:700;color:#e2e8f0;margin-bottom:4px;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${deck.name}">
                    ${deck.name}
                </div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                    <span style="font-size:11px;color:#64748b;">${modeIcon[deck.gameMode] || '🎮'} ${deck.gameMode}</span>
                    <span style="font-size:10px;color:#334155;">·</span>
                    <span style="font-size:10px;color:#64748b;">${deck.savedAt}</span>
                    <span style="margin-left:2px;">${tribeDotsHtml}</span>
                </div>
                <div style="display:flex;gap:6px;">
                    <button onclick="game.loadSavedDeck(${deck.id})" style="
                        flex:1;background:rgba(59,130,246,0.15);border:1px solid #3b82f6;
                        border-radius:6px;color:#93c5fd;font-size:11px;font-weight:700;
                        padding:5px 8px;cursor:pointer;font-family:inherit;">
                        📂 Carregar
                    </button>
                    <button onclick="game.renameDeck(${deck.id})" style="
                        background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);
                        border-radius:6px;color:#93c5fd;font-size:11px;padding:5px 8px;
                        cursor:pointer;font-family:inherit;" title="Renomear deck">
                        ✏️
                    </button>
                    <button onclick="game.exportDeckCode(${deck.id})" style="
                        background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);
                        border-radius:6px;color:#86efac;font-size:11px;padding:5px 8px;
                        cursor:pointer;font-family:inherit;" title="Exportar código compartilhável">
                        📤
                    </button>
                    <button onclick="game.deleteSavedDeck(${deck.id})" style="
                        background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);
                        border-radius:6px;color:#f87171;font-size:11px;padding:5px 8px;
                        cursor:pointer;font-family:inherit;" title="Remover">
                        🗑️
                    </button>
                </div>
            </div>`;
        }).join('');
    },

    // ── Tooltip de preview do deck no hover ───────────────────────────────────
    _showDeckPreview(event, deckId) {
        const decks = this._loadSavedDecks();
        const deck  = decks.find(d => d.id === deckId);
        if (!deck) return;

        const old = document.getElementById('deck-preview-tooltip');
        if (old) old.remove();

        const tribeColors = { OverWorld:'#3b82f6', UnderWorld:'#ef4444', Mipedian:'#f59e0b', Danian:'#8b5cf6' };
        const modeIcon    = { '6v6':'⚔️', '3v3':'⚡', '1v1':'🥊' };

        const creatureRows = (deck.cards || []).map(c => `
            <div style="display:flex;align-items:center;gap:6px;padding:2px 0;">
                <span style="width:7px;height:7px;border-radius:50%;flex-shrink:0;
                    background:${tribeColors[c.tribe]||'#64748b'};"></span>
                <span style="color:#e2e8f0;font-size:11px;flex:1;">${c.name}</span>
                <span style="color:#475569;font-size:10px;">${c.tribe}</span>
            </div>`).join('');

        const mugicRows = (deck.mugics || []).map(m =>
            `<div style="color:#94a3b8;font-size:10px;padding:1px 0;">♪ ${m.name}</div>`
        ).join('');

        const tip = document.createElement('div');
        tip.id = 'deck-preview-tooltip';
        tip.style.cssText = `
            position:fixed; z-index:9995; pointer-events:none;
            background:#0f172a; border:1px solid #334155; border-radius:12px;
            padding:12px 14px; min-width:200px; max-width:260px;
            box-shadow:0 8px 24px rgba(0,0,0,0.7);
            animation:peekIn 0.15s ease forwards;
        `;
        tip.innerHTML = `
            <div style="font-weight:700;color:#f1f5f9;font-size:12px;margin-bottom:4px;">${deck.name}</div>
            <div style="color:#64748b;font-size:10px;margin-bottom:8px;">
                ${modeIcon[deck.gameMode]||'🎮'} ${deck.gameMode} · ${deck.savedAt}
            </div>
            <div style="border-top:1px solid #1e293b;padding-top:6px;margin-bottom:${mugicRows?'6px':'0'};">
                ${creatureRows}
            </div>
            ${mugicRows ? `<div style="border-top:1px solid #1e293b;padding-top:6px;">${mugicRows}</div>` : ''}
        `;
        document.body.appendChild(tip);

        // Posiciona acima/abaixo do elemento
        const rect = event.currentTarget.getBoundingClientRect();
        const tipH = 300; // altura estimada
        const above = rect.top > tipH + 20;
        tip.style.left = `${Math.min(rect.left, window.innerWidth - 280)}px`;
        tip.style.top  = above
            ? `${rect.top - tipH - 8}px`
            : `${rect.bottom + 8}px`;
    },

    _hideDeckPreview() {
        document.getElementById('deck-preview-tooltip')?.remove();
    },

    // ── Abrir/fechar painel de decks ──────────────────────────────────────────
    toggleSavedDecksPanel() {
        const list  = document.getElementById('saved-decks-list');
        const arrow = document.getElementById('saved-decks-arrow');
        if (!list) return;
        const open = list.style.display === 'none';
        list.style.display  = open ? 'block' : 'none';
        if (arrow) arrow.style.transform = open ? 'rotate(180deg)' : '';
        if (open) this.renderSavedDecks();
    },

    // ── Exportar deck como código compartilhável ──────────────────────────────
    exportDeckCode(deckId) {
        const decks = this._loadSavedDecks();
        const deck  = deckId ? decks.find(d => d.id === deckId) : null;

        // Se não passou deckId, exporta o draft atual
        const cards      = deck ? deck.cards      : this.draftedCards;
        const battlegears= deck ? deck.battlegears : (this.draftedBattlegears || []);
        const mugics     = deck ? deck.mugics      : (this.draftedMugics || []);
        const attacks    = deck ? deck.attacks     : (this.draftedAttacks || []);
        const mode       = deck ? deck.gameMode    : this.gameMode;
        const name       = deck ? deck.name        : this._suggestDeckName();

        if (!cards || cards.length === 0) {
            this.showAlert('⚠️ Deck vazio', 'Selecione pelo menos 1 criatura antes de exportar.');
            return;
        }

        // Formato: C:id1,id2|B:bg1,bg2|M:m1,m2|A:a1,a2|MODE:6v6
        const parts = [
            'C:'  + cards.map(c => c.id).join(','),
            'B:'  + battlegears.filter(Boolean).map(b => b ? b.id : '0').join(','),
            'M:'  + mugics.map(m => m.id).join(','),
            'A:'  + attacks.map(a => a.id).join(','),
            'MODE:' + mode,
            'N:'  + encodeURIComponent(name),
        ].join('|');

        // Codifica em base64 para ficar compacto e fácil de copiar
        const code = btoa(parts);

        // Mostra modal com o código
        const old = document.getElementById('deck-export-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'deck-export-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:9990;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);';
        modal.innerHTML = `
            <div style="background:#0f172a;border:1px solid #334155;border-radius:16px;
                padding:28px 32px;width:420px;max-width:92vw;font-family:inherit;">
                <h3 style="color:#f1f5f9;margin:0 0 6px;font-size:18px;">📤 Exportar Deck</h3>
                <p style="color:#64748b;font-size:12px;margin:0 0 16px;">
                    Compartilhe este código com seu amigo. Ele pode importar no Chaotic Lite em qualquer navegador.
                </p>
                <textarea readonly id="deck-export-code" style="
                    width:100%;background:#1e293b;border:1px solid #334155;border-radius:8px;
                    padding:10px 12px;color:#86efac;font-size:11px;font-family:monospace;
                    resize:none;height:80px;outline:none;box-sizing:border-box;
                    word-break:break-all;">${code}</textarea>
                <div style="display:flex;gap:10px;margin-top:14px;">
                    <button onclick="
                        const ta = document.getElementById('deck-export-code');
                        ta.select(); navigator.clipboard.writeText(ta.value).then(() => {
                            this.textContent = '✅ Copiado!';
                            setTimeout(() => this.textContent = '📋 Copiar Código', 2000);
                        });" style="
                        flex:1;background:#22c55e;border:none;border-radius:8px;
                        color:#000;font-weight:700;padding:10px;cursor:pointer;font-family:inherit;">
                        📋 Copiar Código
                    </button>
                    <button onclick="document.getElementById('deck-export-modal').remove()" style="
                        background:transparent;border:1px solid #334155;border-radius:8px;
                        color:#64748b;padding:10px 18px;cursor:pointer;font-family:inherit;">
                        Fechar
                    </button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        setTimeout(() => {
            const ta = document.getElementById('deck-export-code');
            if (ta) { ta.focus(); ta.select(); }
        }, 50);
    },

    // ── Importar deck de um código ────────────────────────────────────────────
    importDeckPrompt() {
        const old = document.getElementById('deck-import-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'deck-import-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:9990;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);';
        modal.innerHTML = `
            <div style="background:#0f172a;border:1px solid #334155;border-radius:16px;
                padding:28px 32px;width:420px;max-width:92vw;font-family:inherit;">
                <h3 style="color:#f1f5f9;margin:0 0 6px;font-size:18px;">📥 Importar Deck</h3>
                <p style="color:#64748b;font-size:12px;margin:0 0 16px;">
                    Cole o código do deck que seu amigo compartilhou:
                </p>
                <textarea id="deck-import-input" placeholder="Cole o código aqui..." style="
                    width:100%;background:#1e293b;border:1px solid #334155;border-radius:8px;
                    padding:10px 12px;color:#e2e8f0;font-size:11px;font-family:monospace;
                    resize:none;height:80px;outline:none;box-sizing:border-box;
                    word-break:break-all;"></textarea>
                <div id="deck-import-error" style="display:none;color:#ef4444;font-size:11px;margin-top:6px;"></div>
                <div style="display:flex;gap:10px;margin-top:14px;">
                    <button onclick="game._confirmImportDeck()" style="
                        flex:1;background:#3b82f6;border:none;border-radius:8px;
                        color:#fff;font-weight:700;padding:10px;cursor:pointer;font-family:inherit;">
                        📥 Importar
                    </button>
                    <button onclick="document.getElementById('deck-import-modal').remove()" style="
                        background:transparent;border:1px solid #334155;border-radius:8px;
                        color:#64748b;padding:10px 18px;cursor:pointer;font-family:inherit;">
                        Cancelar
                    </button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('deck-import-input')?.focus(), 50);
    },

    _confirmImportDeck() {
        const input = document.getElementById('deck-import-input');
        const errEl = document.getElementById('deck-import-error');
        const code  = (input?.value || '').trim();

        const showErr = (msg) => {
            if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
        };

        if (!code) { showErr('Cole um código válido.'); return; }

        let raw;
        try { raw = atob(code); } catch(_) { showErr('Código inválido — não é um deck Chaotic Lite.'); return; }

        // Parseia: C:...|B:...|M:...|A:...|MODE:...|N:...
        const obj = {};
        raw.split('|').forEach(part => {
            const idx = part.indexOf(':');
            if (idx > 0) obj[part.slice(0, idx)] = part.slice(idx + 1);
        });

        if (!obj.C) { showErr('Código corrompido — campo de criaturas ausente.'); return; }

        // Resolve IDs para objetos reais do banco
        const findCard  = id => this.cards.find(c => String(c.id) === String(id));
        const findBg    = id => (this.battlegearsData || []).find(b => b.id === id);
        const findMugic = id => this.mugics.find(m => m.id === id);
        const findAtk   = id => (this.attacksData || []).find(a => a.id === id);

        const cards      = obj.C.split(',').map(findCard).filter(Boolean);
        const battlegears= (obj.B || '').split(',').map(id => id && id !== '0' ? findBg(id) : null);
        const mugics     = (obj.M || '').split(',').map(findMugic).filter(Boolean);
        const attacks    = (obj.A || '').split(',').map(findAtk).filter(Boolean);
        const mode       = obj.MODE || '6v6';
        const name       = obj.N ? decodeURIComponent(obj.N) : 'Deck Importado';

        if (cards.length === 0) { showErr('Nenhuma criatura válida encontrada no código.'); return; }

        // Fecha modal e aplica
        document.getElementById('deck-import-modal')?.remove();

        // Salva como deck novo
        const deck = {
            id: Date.now(), name: `${name} (importado)`,
            gameMode: mode, savedAt: new Date().toLocaleDateString('pt-BR'),
            cards, battlegears, mugics, attacks,
        };
        const decks = this._loadSavedDecks();
        decks.unshift(deck);
        this._persistDecks(decks);

        // Carrega imediatamente no draft
        this.setGameMode(mode);
        this.draftedCards       = JSON.parse(JSON.stringify(cards));
        this.draftedBattlegears = JSON.parse(JSON.stringify(battlegears));
        this.draftedMugics      = JSON.parse(JSON.stringify(mugics));
        this.draftedAttacks     = JSON.parse(JSON.stringify(attacks));
        this._syncDraftControls && this._syncDraftControls();
        this.renderDraft && this.renderDraft();
        this.renderSavedDecks();
        this.log(`📥 Deck "${name}" importado com sucesso!`);
        this.showAlert('✅ Deck Importado!', `"${name}" foi importado e carregado no draft.\nTambém foi salvo nos seus decks para uso futuro.`);
    },

    toggleSavedDecksPanel() {
        const list  = document.getElementById('saved-decks-list');
        const arrow = document.getElementById('saved-decks-arrow');
        if (!list) return;
        const open = list.style.display === 'none';
        list.style.display  = open ? 'block' : 'none';
        if (arrow) arrow.style.transform = open ? 'rotate(180deg)' : '';
        if (open) this.renderSavedDecks();
    },

});
