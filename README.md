# Chaotic Lite

Simulador tático multiplayer de batalha em turnos rodando no navegador, inspirado no card game **Chaotic**. Servidor Node.js + Socket.IO para partidas em tempo real entre dois jogadores.

---

## Como rodar

### ⚡ Jeito rápido (recomendado)

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

### Fluxo de entrada

| Etapa | Descrição |
|---|---|
| **Tela de Setup** | Escolha dificuldade da IA (Fácil/Médio/Difícil) e tribo antes de qualquer coisa |
| **Lobby Multiplayer** | Tela de espera com link copiável, slots dos jogadores e status em tempo real |
| **Reconexão automática** | Socket.IO reconecta automaticamente; overlay com progresso |

### Sistemas de jogo

| Sistema | Descrição |
|---|---|
| **Draft de criaturas** | 92 criaturas com filtros (tribo, stat mínimo, passiva, ordenação) |
| **Times Sugeridos** | 18 times pré-montados com estratégias diversas; clique para pré-selecionar |
| **Barra de afinidade** | Cada carta mostra % de sinergia com o time atual em tempo real |
| **Deck stats em tempo real** | Média de stats, distribuição de tribos e passivas do deck |
| **Battlegear** | 29 equipamentos; recomendação automática + randomização por afinidade |
| **Mugics** | Pré-seleção automática das 6 mais sinérgicas + botões Recomendar e Randomizar |
| **Tabuleiro 6v6** | Pirâmide invertida com proteção posicional (frente/meio/trás) |
| **Locais** | Deck de 10 locais; define iniciativa e aplica efeitos passivos de combate |
| **Iniciativa** | Determinada pelo atributo do Local (Coragem, Poder, Sabedoria ou Velocidade) |
| **Deck de ataques** | 20 cartas por jogador; descarte automático e reciclagem |
| **Challenge de atributo** | Threshold verificado no preview E na execução — valores sempre consistentes |
| **Bônus elemental** | Fire / Water / Earth / Air amplificam dano de ataques compatíveis |
| **Burst Stack (LIFO)** | Janela de resposta após cada ataque; preview de dano inimigo visível no burst |
| **Sinergia tribal** | OverWorld +COR/SAB · UnderWorld +POD · Mipedian +VEL · Danian +Hive |
| **IA com 3 níveis** | Fácil (aleatório) · Médio (alvo mais fraco, usa mugics) · Difícil (counter-pick, look-ahead) |
| **IA usa battlegear** | Sacrifica equipamentos estrategicamente no burst (Médio e Difícil) |

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

### Interface e UX

| Recurso | Descrição |
|---|---|
| **Preview de combate** | Overlay nas cartas inimigas: veredito, dano estimado dos dois lados, quem tem iniciativa |
| **Banner de iniciativa** | No modal de ataque: "⚡ Você ataca primeiro!" ou "⚠️ Inimigo ataca primeiro!" com stats comparados |
| **Preview de dano no burst** | Quando inimigo ataca, o burst mostra quanto dano você vai tomar antes de decidir resposta |
| **Feed de batalha** | Mensagens animadas classificadas por tipo (dano, cura, mugic, morte, local) |
| **Resumo pós-combate** | Timeline de ataques, total de dano, mugics e curas por duelo |
| **Histórico da partida** | Painel lateral colapsável com todos os combates da partida |
| **Floating damage numbers** | `-35` vermelho / `+20` verde flutuando sobre a carta ao receber dano/cura |
| **Barra de vida** | Barra colorida (verde→amarelo→vermelho) com pulso crítico em HP < 20% |
| **Animação de ataque** | Carta do atacante salta na direção do defensor + flash dourado |
| **Animação de entrada** | Cartas "caem" em posição com stagger ao início da batalha |
| **Animação de morte** | Gotas de sangue animadas ao morrer |
| **Minimizar modais** | Botão ⌄ em qualquer modal; fica como pílula flutuante para restaurar depois |
| **Filtros no draft** | Tribo / stat mínimo / passiva / ordenação com contador de resultados |
| **Botões de voltar** | Em todas as fases do draft: criaturas ↔ battlegears ↔ mugics |

### Correções de dados

- Stats de **92 criaturas** corrigidos com os valores oficiais do Chaotic TCG (Dawn of Perim)
- Elementos, raridades, subtypes e habilidades atualizados
- Preview de ataques (`showAttackModal`) usa **mesmos stats efetivos** que a execução — sem surpresas

---

## Estrutura do projeto

```
chaotic_lite/
├── index.html              ← interface completa (single-page)
├── server.js               ← servidor Node.js + Socket.IO
├── iniciar.bat             ← inicia servidor + ngrok com 1 clique
├── encerrar.bat            ← encerra tudo
├── README.md
└── src/
    ├── css/
    │   └── style.css       ← todos os estilos e animações
    ├── assets/             ← imagens das cartas
    └── js/
        ├── engine-core.js          ← GameEngine: constructor + init
        ├── engine-helpers.js       ← helpers de descarte, render, passivas
        ├── engine-draft.js         ← draft (criaturas, battlegears, mugics)
        ├── engine-board.js         ← tabuleiro, renderização, movimento
        ├── engine-combat.js        ← executeAttack, resolveAttack, resumo
        ├── engine-burst.js         ← burst stack, mugics em combate
        ├── engine-ui.js            ← alertas, animações, histórico
        ├── engine-multiplayer.js   ← Socket.IO, lobby, reconexão
        ├── engine-ai.js            ← IA (Fácil/Médio/Difícil)
        ├── engine-turn.js          ← nextTurn, checkWinCondition
        └── data/
            ├── cards.js        ← 92 criaturas (stats oficiais)
            ├── attacks.js      ← deck de ataques
            ├── mugics.js       ← magias
            ├── battlegear.js   ← 29 equipamentos
            ├── locations.js    ← locais de batalha
            ├── passives.js     ← lógica de passivas
            └── teams.js        ← 18 times sugeridos
```

---

## Fluxo de uma partida

```
SETUP
  └─ Escolher Dificuldade (Fácil / Médio / Difícil)
  └─ Escolher Tribo da IA (Auto / OverWorld / UnderWorld / Mipedian / Danian)

DRAFT
  └─ Fase 1 — Criaturas
       └─ Ver Times Sugeridos (18 estratégias prontas)
       └─ Barra de afinidade dinâmica em cada carta
       └─ Filtros + deck stats em tempo real
  └─ Fase 2 — Battlegears
       └─ Recomendação automática por afinidade
       └─ Randomizar entre os mais indicados
  └─ Fase 3 — Mugics
       └─ Pré-seleção automática das mais sinérgicas
       └─ Botões Recomendar e Randomizar

BATALHA
  └─ Turno do Jogador
       ├─ Mover criatura → fim do turno
       └─ Atacar → entra em combate
            └─ Preview de veredito (VANTAGEM/EQUILIBRADO/DESVANTAGEM)
            └─ Banner de iniciativa ("você ataca primeiro!")
            └─ Modal de ataque: dano real (com battlegear + sinergia + local)
            └─ Burst: preview de dano inimigo visível antes de responder
            └─ Dano aplicado → floating numbers
            └─ Resumo do combate ao fim de cada duelo
  └─ Turno da IA (automático, adapta-se à dificuldade)

FIM DE JOGO
  └─ Tela de vitória/derrota
  └─ Histórico completo da partida no painel lateral
```
