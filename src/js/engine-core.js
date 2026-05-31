// engine-core.js
class GameEngine {
    constructor(cards, mugics, attacks, locations, battlegears) {
        this.cards = JSON.parse(JSON.stringify(cards)); // Cópia profunda
        this.mugics = JSON.parse(JSON.stringify(mugics));
        this.attacksData = attacks ? JSON.parse(JSON.stringify(attacks)) : [];
        this.locationsData = locations ? JSON.parse(JSON.stringify(locations)) : [];
        this.battlegearsData = battlegears ? JSON.parse(JSON.stringify(battlegears)) : [];

        this.p1AttackDeck = [];
        this.p2AttackDeck = [];
        this.p1AttackHand = [];
        this.p2AttackHand = [];
        this.p1AttackDiscard = [];
        this.p2AttackDiscard = [];
        this.locationDeck = [];
        this.activeLocation = null;

        this.appState = 'DRAFT'; // 'DRAFT', 'BATTLE', 'LORE'
        this.draftState = 'CREATURES'; // 'CREATURES', 'BATTLEGEARS', 'MUGICS'
        this.currentTribeFilter = 'All';
        this.currentMugicTribeFilter = 'All';
        this.currentMugicTypeFilter = 'All';
        this.draftedCards = []; // Cartas escolhidas pelo jogador
        this.draftedMugics = []; // Cartas escolhidas pelo jogador
        this.draftedBattlegears = []; // Array mapeando battlegear pra cada index da criatura
        this.selectedBgToEquip = null;
        this.turn = 1; // 1 para Jogador, 2 para Oponente
        this.gameState = 'IDLE'; // Estados: IDLE, SELECT_TARGET, SELECT_MUGIC_TARGET, ENGAGED_COMBAT
        this.selectedAttacker = null; // Guardará o monstro atacante { player, r, c }
        this.activeCombat = null; // { p1Card, p2Card, p1R, p1C, p2R, p2C, currentStriker }
        this.pendingCombat = null;
        this.playerMugics = []; // Mão de feitiços do jogador (P1)
        this.p1MugicDiscard = []; // Descarte de Mugics do P1
        this.p2MugicDiscard = []; // Descarte de Mugics do P2
        this.p1CreatureDiscard = []; // Criaturas destruídas do P1
        this.p2CreatureDiscard = []; // Criaturas destruídas do P2
        this.selectedMugic = null; // Mugic sendo mirado

        this.boardElement = document.getElementById("board");
        this.logElement = document.getElementById("combat-log");
        this.nextTurnBtn = document.getElementById("btn-next-turn");

        // Modo de jogo
        this.gameMode = '6v6'; // '6v6' | '3v3'

        // Tabuleiro — shape depende do modo, inicializado em _initBoards()
        this.boardP1 = [];
        this.boardP2 = [];
        this._initBoards();

        // IA
        this.aiDifficulty  = 'easy'; // 'easy' | 'medium' | 'hard'
        this.aiTribeChoice = 'auto'; // 'auto' | 'OverWorld' | 'UnderWorld' | 'Mipedian' | 'Danian'

        // Histórico de partida completo
        this.matchHistory = []; // array de combates encerrados

        // Multiplayer
        this._myVote  = null; // voto de modo no lobby ('6v6','3v3','1v1')
        this._oppVote = null;
        this.multiplayerMode = false;
        this.myPlayerNumber = 1;
        this.socket = null;
        this.remoteDraft = null;      // draft recebido do outro jogador
        this.myDraftReady = false;    // se eu já cliquei em Start Battle
    }

    // ─── Helpers de modo de jogo ─────────────────────────────────────────────

    /** Inicializa os tabuleiros com o shape correto para o modo atual */
    _initBoards() {
        if (this.gameMode === '1v1') {
            // 1v1: 1 linha, 1 slot por lado
            this.boardP1 = [[null]];
            this.boardP2 = [[null]];
        } else if (this.gameMode === '3v3') {
            // 3v3: 2 linhas (Frente:2, Trás:1) = 3 total por lado
            this.boardP1 = [[null, null], [null]];
            this.boardP2 = [[null, null], [null]];
        } else {
            // 6v6: 3 linhas (Frente:3, Meio:2, Trás:1) = 6 total por lado
            this.boardP1 = [[null, null, null], [null, null], [null]];
            this.boardP2 = [[null, null, null], [null, null], [null]];
        }
    }

    /** Limite máximo de criaturas/mugics/battlegears no draft */
    _getDraftLimit() {
        if (this.gameMode === '1v1') return 1;
        if (this.gameMode === '3v3') return 3;
        return 6;
    }

    /** Formação de posicionamento no tabuleiro */
    _getFormation() {
        if (this.gameMode === '1v1') return [{r:0,c:0}];
        if (this.gameMode === '3v3') return [{r:1,c:0}, {r:0,c:0}, {r:0,c:1}];
        return [
            {r:2,c:0},
            {r:1,c:0}, {r:1,c:1},
            {r:0,c:0}, {r:0,c:1}, {r:0,c:2}
        ];
    }

    setGameMode(mode) {
        this.gameMode = mode;
        this._initBoards();

        ['6v6','3v3','1v1'].forEach(m => {
            const btn = document.getElementById(`mode-${m}`);
            if (!btn) return;
            const active = m === mode;
            btn.style.borderColor = active ? '#f59e0b' : '#334155';
            btn.style.color       = active ? '#f59e0b' : '#64748b';
            btn.style.background  = active ? 'rgba(245,158,11,0.18)' : 'transparent';
        });

        const teamsBtn = document.querySelector('button[onclick="game.openTeamSuggestions()"]');
        if (teamsBtn) teamsBtn.textContent = `✨ Ver Duelos Sugeridos (${mode})`;
    }

    init() {
        this.log("Chaotic Lite Engine Iniciada!");
        if (this.cards.length < 6) {
            document.getElementById("game-container").innerHTML = "<p>Cartas insuficientes no banco de dados. Mínimo 6 necessárias!</p>";
            return;
        }

        if (this.nextTurnBtn) {
            this.nextTurnBtn.addEventListener("click", () => this.nextTurn());
        }

        // Mostra a tela de setup (dificuldade) antes do draft
        // O draft só é renderizado quando o jogador clica em "Iniciar Draft"
        this.setDifficulty('easy');
        this.setAiTribe('auto');
        this._showSetupScreen();
        this.initMultiplayer();
    }

    _showSetupScreen() {
        const setup = document.getElementById('setup-screen');
        const game  = document.getElementById('game-container');
        if (setup) setup.style.display = 'flex';
        if (game)  game.style.display  = 'none';
    }

    startDraft() {
        // Esconde setup, mostra o draft
        const setup = document.getElementById('setup-screen');
        const game  = document.getElementById('game-container');
        if (setup) setup.style.display = 'none';
        if (game)  game.style.display  = '';

        this.renderDraft();

        // Mostra dificuldade escolhida no header do draft
        const diff = this.aiDifficulty;
        const labels = { easy: '😴 Fácil', medium: '🧠 Médio', hard: '💀 Difícil' };
        this.log(`⚙️ Dificuldade: ${labels[diff] || diff}`);
    }
}
