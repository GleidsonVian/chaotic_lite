# Chaotic Lite

Simulador tático multiplayer de batalha em turnos rodando no navegador, inspirado no card game **Chaotic**. Servidor Node.js + Socket.IO para partidas em tempo real entre dois jogadores.

---

## Como rodar

### Jeito rápido (recomendado)

Dê dois cliques em **`iniciar.bat`** — o script faz tudo automaticamente:

1. Verifica se Node.js e ngrok estão instalados
2. Roda `npm install` se for a primeira vez
3. Sobe o servidor Node.js na porta 3000
4. Abre o ngrok e exibe o link público no terminal
5. O link aparece automaticamente no lobby do jogo

Para encerrar tudo, clique em **`encerrar.bat`**.

**Pré-requisitos:**
- [Node.js](https://nodejs.org) — para rodar o servidor
- [ngrok](https://ngrok.com/download) — para gerar o link público (opcional; sem ele só funciona na rede local)

---

### Manual

```bash
npm install
node server.js
ngrok http 3000   # em outro terminal
```

O link do ngrok aparece automaticamente no lobby do jogo ~2s após iniciar.

---

## O que o jogo tem

### Modos de jogo

| Modo | Formato | Descrição |
|---|---|---|
| **6v6 — Padrão** | 6 criaturas por lado | Partida completa com tabuleiro em pirâmide invertida |
| **3v3 — Rapido** | 3 criaturas por lado | Partida mais curta; 8 times sugeridos exclusivos |
| **1v1 — Duelo** | 1 criatura por lado | Confronto direto; sem posicionamento |

No multiplayer os dois jogadores votam no modo antes da partida começar — a partida só avanca quando ambos concordam.

### Fluxo de entrada

| Etapa | Descricao |
|---|---|
| **Tela de Setup** | Escolha dificuldade da IA (Facil/Medio/Dificil) e tribo antes de qualquer coisa |
| **Lobby Multiplayer** | Tela de espera com link copiavel, slots dos jogadores, campo de nome customizavel e votacao de modo |
| **Selecao de formacao** | Antes da batalha o jogador posiciona suas criaturas no tabuleiro manualmente |
| **Reconexao automatica** | Socket.IO reconecta automaticamente; overlay com progresso |

### Sistemas de jogo

| Sistema | Descricao |
|---|---|
| **Draft de criaturas** | 92 criaturas com filtros (tribo, stat minimo, passiva, ordenacao) |
| **Times Sugeridos** | 18 times para 6v6 + 8 times para 3v3 pre-montados; clique para pre-selecionar |
| **Barra de afinidade** | Cada carta mostra % de sinergia com o time atual em tempo real |
| **Deck stats em tempo real** | Media de stats, distribuicao de tribos e passivas do deck |
| **Battlegear** | 29 equipamentos; recomendacao automatica + randomizacao por afinidade |
| **Mugics** | Pre-selecao automatica das 6 mais sinergicas + botoes Recomendar e Randomizar |
| **Tabuleiro adaptativo** | Piramide invertida (6v6/3v3) ou duelo direto (1v1) com protecao posicional |
| **Locais** | Deck de 10 locais; define iniciativa e aplica efeitos passivos de combate; sync no multiplayer |
| **Iniciativa** | Determinada pelo atributo do Local (Coragem, Poder, Sabedoria ou Velocidade) |
| **Draft de ataques** | Jogador monta seu deck de ataques antes da batalha (20/12/6 cartas por modo, max 2 copias da mesma) |
| **Recomendacao de ataques** | Sistema sugere os melhores ataques considerando elementos das criaturas E elementos concedidos por battlegear |
| **Deck de ataques** | Deck embaralhado; compra ocorre ANTES do modal (sempre escolhe entre 3 cartas como no TCG original) |
| **Challenge de atributo** | Threshold verificado no preview E na execucao — valores sempre consistentes |
| **Bonus elemental** | Fire / Water / Earth / Air amplificam dano de ataques compativeis |
| **Burst Stack (LIFO)** | Janela de resposta apos cada ataque; preview de dano inimigo visivel no burst |
| **Painel de burst** | Lista o que cada mugic fara e quem sera afetado antes de confirmar |
| **Morte simultanea** | Se ambas as criaturas morrem no mesmo ataque o resultado e empate no duelo |
| **Sinergia tribal** | OverWorld +COR/SAB · UnderWorld +POD · Mipedian +VEL · Danian +Hive |
| **IA com 3 niveis** | Facil (aleatorio) · Medio (alvo mais fraco, usa mugics) · Dificil (counter-pick, look-ahead) |
| **IA usa battlegear** | Sacrifica equipamentos estrategicamente no burst (Medio e Dificil) |

### Passivas de criaturas

| Passiva | Efeito |
|---|---|
| **Intimidate** | Reduz stat especifico do oponente antes de checar iniciativa |
| **Swift** | Adiciona velocidade efetiva para fins de iniciativa |
| **Strike** | Causa dano extra no primeiro ataque do combate |
| **Tough** | Reduz todo dano recebido por valor fixo |
| **Berserk** | Ganha bonus de stat a cada ponto de dano recebido |
| **Reckless** | Causa dano extra mas o atacante tambem se fere |
| **Fireproof** | Imune a dano de elemento Fire |
| **Range** | Pode atacar criaturas nao-adjacentes |

### Multiplayer

| Recurso | Descricao |
|---|---|
| **Nome customizavel** | Cada jogador define seu nome no lobby antes de entrar |
| **Votacao de modo** | Ambos os jogadores votam em 1v1 / 3v3 / 6v6; partida so comeca com consenso |
| **Mugics P1 e P2** | Ambos os jogadores podem lancar mugics corretamente durante o burst |
| **Sync de estado do tabuleiro** | Apos cada morte de criatura o estado e sincronizado entre os clientes |
| **Sync de local** | Locais de batalha sao sincronizados entre os jogadores em tempo real |
| **Reconexao** | Reconexao automatica com overlay de progresso; estado da partida preservado |

### Interface e UX

| Recurso | Descricao |
|---|---|
| **Preview de combate** | Overlay nas cartas inimigas: veredito, dano estimado dos dois lados, quem tem iniciativa |
| **Banner de iniciativa** | No modal de ataque: "Voce ataca primeiro!" ou "Inimigo ataca primeiro!" com stats comparados |
| **Stats com battlegear no modal** | Preview de dano no showAttackModal inclui modificadores de battlegear — sem surpresas |
| **Preview de dano no burst** | Quando inimigo ataca, o burst mostra quanto dano voce vai tomar antes de decidir resposta |
| **Tooltips de mugic** | Tooltip rico mostrando alvos exatos de cada mugic durante o burst |
| **Painel de burst detalhado** | Lista o efeito e o alvo de cada mugic na fila antes de confirmar |
| **Reveal de battlegear** | Battlegear revelado apenas no confirmAttack, nao na selecao de alvo |
| **Ataque sem cancelamento** | Apos escolher atacante e alvo o ataque e comprometido — botao Cancelar removido |
| **Feed de batalha** | Mensagens animadas classificadas por tipo (dano, cura, mugic, morte, local) |
| **Resumo pos-combate** | Timeline de ataques, total de dano, mugics e curas por duelo |
| **Historico da partida** | Painel lateral colapsavel com todos os combates da partida |
| **Floating damage numbers** | `-35` vermelho / `+20` verde flutuando sobre a carta ao receber dano/cura |
| **Barra de vida** | Barra colorida (verde -> amarelo -> vermelho) com pulso critico em HP < 20% |
| **Animacao de ataque** | Carta do atacante salta na direcao do defensor + flash dourado |
| **Animacao de entrada** | Cartas "caem" em posicao com stagger ao inicio da batalha |
| **Animacao de morte** | Gotas de sangue animadas ao morrer |
| **Minimizar modais** | Botao em qualquer modal; fica como pilula flutuante para restaurar depois |
| **Filtros no draft** | Tribo / stat minimo / passiva / ordenacao com contador de resultados |
| **Botoes de voltar** | Em todas as fases do draft: criaturas <-> battlegears <-> mugics |

### Correcoes de dados

- Stats de **92 criaturas** corrigidos com os valores oficiais do Chaotic TCG (Dawn of Perim)
- Elementos, raridades, subtypes e habilidades atualizados
- Preview de ataques (`showAttackModal`) usa **mesmos stats efetivos** que a execucao — sem surpresas

---

## Estrutura do projeto

```
chaotic_lite/
├── index.html              <- interface completa (single-page)
├── server.js               <- servidor Node.js + Socket.IO
├── iniciar.bat             <- inicia servidor + ngrok com 1 clique
├── encerrar.bat            <- encerra tudo
├── README.md
└── src/
    ├── css/
    │   └── style.css       <- todos os estilos e animacoes
    ├── assets/             <- imagens das cartas e localizacoes
    └── js/
        ├── engine-core.js          <- GameEngine: constructor, init, modos de jogo
        ├── engine-helpers.js       <- utils, setupBoard, _placeCardsOnBoard
        ├── engine-draft.js         <- fases de draft, times sugeridos, afinidade de mugics
        ├── engine-board.js         <- renderBoard, handleCardClick, selecao de formacao
        ├── engine-combat.js        <- executeAttack, resolveAttack, resumo de combate
        ├── engine-burst.js         <- burst stack, mugics em combate, painel de burst
        ├── engine-ui.js            <- tooltips, animacoes, floating numbers, historico
        ├── engine-multiplayer.js   <- Socket.IO, lobby, votacao de modo, reconexao, sync
        ├── engine-ai.js            <- sistema de dificuldade da IA
        ├── engine-turn.js          <- nextTurn, checkWinCondition
        └── data/
            ├── cards.js        <- 92 criaturas (stats oficiais)
            ├── attacks.js      <- deck de ataques
            ├── mugics.js       <- magias
            ├── battlegear.js   <- 29 equipamentos
            ├── locations.js    <- locais de batalha
            ├── passives.js     <- logica de passivas
            └── teams.js        <- 18 times para 6v6 + 8 times para 3v3
```

---

## Fluxo de uma partida

```
SETUP
  └─ Escolher Dificuldade (Facil / Medio / Dificil)
  └─ Escolher Tribo da IA (Auto / OverWorld / UnderWorld / Mipedian / Danian)

LOBBY MULTIPLAYER (quando aplicavel)
  └─ Definir nome do jogador
  └─ Votar no modo de jogo (1v1 / 3v3 / 6v6)
  └─ Aguardar consenso dos dois jogadores

DRAFT
  └─ Fase 1 — Criaturas
       └─ Ver Times Sugeridos (18 para 6v6 / 8 para 3v3)
       └─ Barra de afinidade dinamica em cada carta
       └─ Filtros + deck stats em tempo real
  └─ Fase 2 — Battlegears
       └─ Recomendacao automatica por afinidade
       └─ Randomizar entre os mais indicados
  └─ Fase 3 — Mugics
       └─ Pre-selecao automatica das mais sinergicas
       └─ Botoes Recomendar e Randomizar
  └─ Fase 4 — Deck de Ataques
       └─ Escolhe 20 cartas (6v6) / 12 (3v3) / 6 (1v1) — max 2 copias da mesma
       └─ Recomendacao inteligente: considera elementos da criatura E do battlegear equipado
       └─ Cada carta exibe descricao completa do efeito em portugues
       └─ Filtros por elemento (Fire/Water/Earth/Air), stat do challenge e ordenacao
       └─ Score de sinergia ⭐ visivel em cada carta

FORMACAO
  └─ Jogador posiciona suas criaturas no tabuleiro manualmente antes da batalha

BATALHA
  └─ Turno do Jogador
       ├─ Mover criatura -> fim do turno
       └─ Atacar -> entra em combate
            └─ Preview de veredito (VANTAGEM / EQUILIBRADO / DESVANTAGEM)
            └─ Banner de iniciativa com stats comparados
            └─ Modal de ataque: dano real com battlegear + sinergia + local
            └─ Battlegear revelado apenas ao confirmar o ataque
            └─ Compra de carta ANTES de mostrar o modal (sempre 3 opcoes)
            └─ Burst: tooltip rico + painel mostrando efeito e alvo de cada mugic
            └─ Preview de dano inimigo visivel antes de responder no burst
            └─ Dano aplicado -> floating numbers + sync de tabuleiro (multiplayer)
            └─ Morte simultanea -> empate no duelo
            └─ Resumo do combate ao fim de cada duelo
  └─ Turno da IA (automatico, adapta-se a dificuldade)

FIM DE JOGO
  └─ Tela de vitoria / derrota / empate
  └─ Historico completo da partida no painel lateral
```
