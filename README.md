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
| **3v3 — Rápido** | 3 criaturas por lado | Partida mais curta; 8 times sugeridos exclusivos |
| **1v1 — Duelo** | 1 criatura por lado | Confronto direto; sem tela de posicionamento |

No multiplayer os dois jogadores votam no modo antes da partida começar.

### Fluxo de entrada

| Etapa | Descrição |
|---|---|
| **Tela de Setup** | Escolha dificuldade da IA (Fácil/Médio/Difícil) e tribo antes de qualquer coisa |
| **Lobby Multiplayer** | Tela de espera com link copiável, slots dos jogadores, campo de nome e votação de modo |
| **Posicionamento** | Antes da batalha o jogador posiciona suas criaturas no tabuleiro manualmente (pulado no 1v1) |
| **Reconexão automática** | Socket.IO reconecta automaticamente; overlay com progresso |

### Sistemas de jogo

| Sistema | Descrição |
|---|---|
| **Draft de criaturas** | 92 criaturas com filtros (tribo, stat mínimo, passiva, ordenação) |
| **Times Sugeridos** | 18 times para 6v6 + 8 times para 3v3 pré-montados; clique para pré-selecionar |
| **Barra de afinidade** | Cada carta mostra % de sinergia com o time atual em tempo real |
| **Deck stats em tempo real** | Média de stats, distribuição de tribos e passivas do deck |
| **Battlegear** | 29 equipamentos com imagens; recomendação automática + randomização por afinidade |
| **Mugics** | Pré-seleção automática das 6 mais sinergicas + botões Recomendar e Randomizar |
| **Tabuleiro adaptativo** | Pirâmide invertida (6v6/3v3) ou duelo direto (1v1) com proteção posicional |
| **Locais** | Deck de 10 locais; define iniciativa e aplica efeitos passivos de combate |
| **Iniciativa** | Determinada pelo atributo do Local (Coragem, Poder, Sabedoria ou Velocidade) |
| **Draft de ataques** | Jogador monta seu deck de ataques antes da batalha (20/12/6 cartas por modo, máx 2 cópias) |
| **Recomendação de ataques** | Sistema sugere os melhores ataques considerando elementos das criaturas E do battlegear |
| **Deck de ataques** | Deck embaralhado; compra ANTES do modal (sempre 3 opções como no TCG original) |
| **Challenge de atributo** | Threshold verificado no preview E na execução — valores sempre consistentes |
| **Bônus elemental** | Fire / Water / Earth / Air amplificam dano de ataques compatíveis |
| **Burst Stack (LIFO)** | Janela de resposta após cada ataque; preview de dano inimigo visível no burst |
| **Painel de burst** | Lista o que cada mugic fará e quem será afetado antes de confirmar |
| **Morte simultânea** | Se ambas as criaturas morrem no mesmo ataque o resultado é empate no duelo |
| **Sinergia tribal** | OverWorld +COR/SAB · UnderWorld +POD · Mipedian +VEL · Danian +Hive |
| **IA com 3 níveis** | Fácil (aleatório) · Médio (alvo mais fraco, usa mugics) · Difícil (counter-pick, look-ahead) |
| **IA usa battlegear** | Sacrifica equipamentos estrategicamente no burst (Médio e Difícil) |
| **IA comenta as jogadas** | Mensagens de personalidade no feed em Médio/Difícil (kill, heal, mugic, etc.) |

### Passivas de criaturas

| Passiva | Efeito |
|---|---|
| **Intimidate** | Reduz stat específico do oponente antes de checar iniciativa |
| **Swift** | Adiciona velocidade efetiva para fins de iniciativa |
| **Strike** | Causa dano extra no primeiro ataque do combate |
| **Tough** | Reduz todo dano recebido por valor fixo |
| **Berserk** | Ganha bônus de stat a cada ponto de dano recebido |
| **Reckless** | Causa dano extra mas o atacante também se fere |
| **Fireproof** | Imune a dano de elemento Fire |
| **Range** | Pode atacar criaturas não-adjacentes |

### Multiplayer

| Recurso | Descrição |
|---|---|
| **Nome customizável** | Cada jogador define seu nome no lobby antes de entrar |
| **Votação de modo** | Ambos os jogadores votam em 1v1 / 3v3 / 6v6; partida só começa com consenso |
| **Mugics P1 e P2** | Ambos os jogadores podem lançar mugics corretamente durante o burst |
| **Sync de estado do tabuleiro** | Após cada morte de criatura o estado é sincronizado entre os clientes |
| **Sync de local** | Locais de batalha são sincronizados entre os jogadores em tempo real |
| **Reconexão** | Reconexão automática com overlay de progresso; estado da partida preservado |

### Interface e UX

| Recurso | Descrição |
|---|---|
| **Banner de turno animado** | "⚔️ SEU TURNO" (verde pulsante) vs "⏳ TURNO DO OPONENTE" (cinza com pontinhos) vs "🎯 ESCOLHA O ALVO!" (vermelho urgente) |
| **Preview de combate** | Overlay nas cartas inimigas: veredito, dano estimado dos dois lados, quem tem iniciativa com stat e valores |
| **Intimidate no preview** | Badge laranja "😨 Intimidate: COR −10" aparece no overlay quando o atacante tem a passiva |
| **Banner de iniciativa** | No modal de ataque: "Você ataca primeiro!" ou "Inimigo ataca primeiro!" com stats comparados |
| **Preview de dano no burst** | Quando inimigo ataca, o burst mostra quanto dano você vai tomar antes de decidir resposta |
| **Hover de ataque no burst** | Passar o mouse no nome do ataque inimigo no burst mostra tooltip com todos os efeitos |
| **Tooltips ricos de mugic** | Tooltip com efeito, custo real, penalidade de tribo e status de counters disponíveis |
| **Tooltips de ataque** | Hover em cada carta de ataque mostra dano total esperado e todos os efeitos em texto legível |
| **Tooltips de battlegear** | Hover no battlegear (board e modal de ataque) mostra imagem, bônus de stats, elemento concedido e descrição |
| **Tooltips de criatura no board** | Hover na imagem/nome da criatura: stats completos, imagem, elementos, passivas, battlegear e sinergia |
| **Notificação de burst na aba** | Título da aba pisca "🔔 Burst Aberto! — Chaotic Lite" quando o burst abre fora do seu turno |
| **Overlay ambiental do local** | Efeito visual no board por tipo de local: névoa azul (Water), brasas (Fire), âmbar (Earth), brilho frio (Air), etc. |
| **Tribe highlight do local** | Criaturas beneficiadas pelo local ganham borda dourada pulsante + badge "⭐ Local" |
| **Counter pendente de local** | Criaturas que ganharão counter ao engajar (ex: Gigantempopolis) mostram "♪ +1" tracejado antes do combate |
| **Counters de mugic** | Badge roxo pulsante para 2+ counters; counter pendente (tracejado) para efeitos de local |
| **Animação de morte** | Carta explode em 20 fragmentos (grid 4×5) voando para fora com rotação, usando recortes reais da imagem |
| **Animação de ataque** | Carta do atacante salta na direção do defensor usando posição exata (data-pos) — sem erro com criaturas de mesmo nome |
| **Floating damage numbers** | `-35` vermelho / `+20` verde flutuando sobre a carta ao receber dano/cura |
| **Drag & drop no board** | Arrastar criatura para reposicionar: slot verde = válido, vermelho = inválido |
| **Barra de vida** | Barra colorida (verde → amarelo → vermelho) com pulso crítico em HP < 20% |
| **Animação de entrada** | Cartas "caem" em posição com stagger ao início da batalha |
| **Tela de fim de jogo** | Header animado com gradiente, confete (vitória), estatísticas da partida (turnos, ataques, mugics, kills, maior dano) |
| **Resumo pós-combate** | Timeline de ataques, total de dano, mugics e curas por duelo; não aparece no combate decisivo |
| **Minimizar modais** | Botão em qualquer modal; fica como pílula flutuante para restaurar depois |
| **Atalhos de teclado** | Espaço = passar burst/turno · 1-3 = selecionar ataque · H = histórico · M = minimizar · Esc = restaurar |
| **Feed de batalha** | Mensagens animadas classificadas por tipo (dano, cura, mugic, morte, local) |
| **Histórico da partida** | Painel lateral colapsável com todos os combates da partida |

### Correções de dados

- Stats de **92 criaturas** corrigidos com os valores oficiais do Chaotic TCG (Dawn of Perim)
- Elementos, raridades, subtypes e habilidades atualizados
- Preview de ataques (`showAttackModal`) usa **mesmos stats efetivos** que a execução — sem surpresas

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
    │   └── style.css       <- todos os estilos e animações
    ├── assets/             <- imagens das cartas, battlegears e localizações
    └── js/
        ├── engine-core.js          <- GameEngine: constructor, init, modos de jogo, contadores de stats
        ├── engine-helpers.js       <- utils, setupBoard, _placeCardsOnBoard, _mugicCountersHtml
        ├── engine-draft.js         <- fases de draft, times sugeridos, afinidade, tela de ataques
        ├── engine-board.js         <- renderBoard, handleCardClick, drag&drop, overlays de local
        ├── engine-combat.js        <- executeAttack, resolveAttack, _getCombatPreview, resumo
        ├── engine-burst.js         <- burst stack, mugics em combate, painel de burst
        ├── engine-ui.js            <- tooltips ricos, animações, floating numbers, drag&drop handlers
        ├── engine-multiplayer.js   <- Socket.IO, lobby, votação de modo, reconexão, sync
        ├── engine-ai.js            <- sistema de dificuldade da IA, comentários de personalidade
        ├── engine-turn.js          <- nextTurn, checkWinCondition, tela de fim de jogo
        └── data/
            ├── cards.js        <- 92 criaturas (stats oficiais)
            ├── attacks.js      <- deck de ataques
            ├── mugics.js       <- magias
            ├── battlegear.js   <- 29 equipamentos com imagens
            ├── locations.js    <- locais de batalha
            ├── passives.js     <- lógica de passivas
            └── teams.js        <- 18 times para 6v6 + 8 times para 3v3
```

---

## Fluxo de uma partida

```
SETUP
  └─ Escolher Dificuldade (Fácil / Médio / Difícil)
  └─ Escolher Tribo da IA (Auto / OverWorld / UnderWorld / Mipedian / Danian)

LOBBY MULTIPLAYER (quando aplicável)
  └─ Definir nome do jogador
  └─ Votar no modo de jogo (1v1 / 3v3 / 6v6)
  └─ Aguardar consenso dos dois jogadores

DRAFT
  └─ Fase 1 — Criaturas
       └─ Ver Times Sugeridos (18 para 6v6 / 8 para 3v3)
       └─ Barra de afinidade dinâmica em cada carta
       └─ Filtros + deck stats em tempo real
  └─ Fase 2 — Battlegears
       └─ Recomendação automática por afinidade
       └─ Randomizar entre os mais indicados
  └─ Fase 3 — Mugics
       └─ Pré-seleção automática das mais sinérgicas
       └─ Botões Recomendar e Randomizar
  └─ Fase 4 — Deck de Ataques
       └─ Escolhe 20 cartas (6v6) / 12 (3v3) / 6 (1v1) — máx 2 cópias da mesma
       └─ Recomendação inteligente: considera elementos da criatura E do battlegear
       └─ Cada carta exibe descrição completa do efeito em português
       └─ Filtros por elemento, stat do challenge e ordenação
       └─ Score de sinergia ⭐ visível em cada carta

POSICIONAMENTO (pulado no 1v1)
  └─ Jogador arranja suas criaturas no tabuleiro antes da batalha
  └─ Drag & drop ou clique para mover durante a batalha

BATALHA
  └─ Banner de turno animado indica claramente quem está jogando
  └─ Overlay ambiental no board reflete o local ativo (névoa, brasas, etc.)
  └─ Tribe highlight dourado nas criaturas beneficiadas pelo local
  └─ Turno do Jogador
       ├─ Arrastar ou clicar criatura para mover -> fim do turno
       └─ Atacar -> entra em combate
            └─ Preview de veredito com iniciativa e valores de stat
            └─ Badge de Intimidate no preview se aplicável
            └─ Modal de ataque: dano real com battlegear + sinergia + local
            └─ Battlegear revelado apenas ao confirmar o ataque
            └─ Compra de carta ANTES do modal (sempre 3 opções)
            └─ Burst: tooltip rico + painel mostrando efeito e alvo de cada mugic
            └─ Hover no ataque inimigo no burst mostra efeitos completos
            └─ Preview de dano inimigo visível antes de responder no burst
            └─ Animação de ataque com salto por posição exata (data-pos)
            └─ Dano aplicado -> floating numbers + sync de tabuleiro (multiplayer)
            └─ Morte -> animação de explosão em fragmentos + sync
            └─ Morte simultânea -> empate no duelo
            └─ Resumo do combate ao fim de cada duelo (omitido no combate decisivo)
  └─ Turno da IA (automático, adapta-se à dificuldade + comentários de personalidade)

FIM DE JOGO
  └─ Tela animada: confete (vitória) / visual sombrio (derrota)
  └─ Estatísticas da partida: turnos, ataques, mugics, kills, maior dano único
  └─ Histórico completo da partida no painel lateral
```
