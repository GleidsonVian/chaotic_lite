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

        // Tabuleiro 6v6: Pirâmide Invertida com 3 Linhas (Frente=3, Meio=2, Trás=1)
        this.boardP1 = [
            [null, null, null], // Linha 0 (Frente)
            [null, null],       // Linha 1 (Meio)
            [null]              // Linha 2 (Trás)
        ];
        this.boardP2 = [
            [null, null, null], // Linha 0 (Frente)
            [null, null],       // Linha 1 (Meio)
            [null]              // Linha 2 (Trás)
        ];

        // IA
        this.aiDifficulty = 'easy'; // 'easy' | 'medium' | 'hard'

        // Histórico de partida completo
        this.matchHistory = []; // array de combates encerrados

        // Multiplayer
        this.multiplayerMode = false;
        this.myPlayerNumber = 1;
        this.socket = null;
        this.remoteDraft = null;      // draft recebido do outro jogador
        this.myDraftReady = false;    // se eu já cliquei em Start Battle
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

        this.renderDraft();
        this.setDifficulty('easy'); // marca botão Fácil como ativo por padrão
        this.initMultiplayer();
    }
}
