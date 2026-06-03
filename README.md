# Chaotic Lite

Simulador tático multiplayer de batalha em turnos rodando no navegador, inspirado no card game **Chaotic**. Servidor Node.js + Socket.IO para partidas em tempo real com suporte a múltiplas salas simultâneas.

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

### Deploy online (24/7)

Para deixar o jogo acessível sem depender da sua máquina local:

1. Suba o código no **GitHub**
2. Crie uma conta em [Railway](https://railway.app)
3. Conecte o repositório — Railway detecta Node.js automaticamente
4. Deploy com 1 clique; o servidor fica online 24/7 gratuitamente dentro do limite de uso

O `process.env.PORT` já está configurado no `server.js` para compatibilidade com Railway e outros serviços de PaaS.

---

## Sistema de Salas

O servidor suporta **múltiplas partidas simultâneas** isoladas.

### Tipos de sala

| Tipo | Como funciona |
|---|---|
| **Sala Privada** | Gera código de 4 letras (ex: `KXBW`). Só entra quem tiver o código. |
| **Sala Pública** | Aparece na lista para qualquer jogador. Qualquer um entra com 1 clique. |
| **Entrar por código** | Digite o código de uma sala privada e entre diretamente. |
| **Espectador** | Entre como espectador por código ou pelo botão "👁️ Assistir" na lista pública. |

### Fluxo do lobby

```
Jogador abre o site
    │
    ├── Criar Sala Privada  →  código KXBW gerado  →  manda pro amigo
    ├── Salas Públicas      →  lista de salas abertas + botão "Criar Pública"
    ├── Entrar com Código   →  digita KXBW e entra direto
    └── 👁️ Assistir         →  digita código ou clica "Assistir" na lista pública
```

Após ambos entrarem → votação de modo → draft (4 fases) → batalha.

---

## O que o jogo tem

### Modos de jogo

| Modo | Formato | Descrição |
|---|---|---|
| **6v6 — Padrão** | 6 criaturas por lado | Partida completa com tabuleiro em pirâmide invertida |
| **3v3 — Rápido** | 3 criaturas por lado | Partida mais curta; 8 times sugeridos exclusivos |
| **1v1 — Duelo** | 1 criatura por lado | Confronto direto; sem tela de posicionamento |

No multiplayer os dois jogadores votam no modo antes da partida começar.

### Draft (4 fases)

| Fase | Descrição |
|---|---|
| **1 — Criaturas** | 92 criaturas com filtros (tribo, stat mínimo, passiva, ordenação) e barra de afinidade em tempo real |
| **2 — Battlegear** | 29 equipamentos; recomendação automática por afinidade + randomização |
| **3 — Mugics** | Pré-seleção automática das mais sinérgicas + botões Recomendar e Randomizar |
| **4 — Ataques** | Monta deck de 20/12/6 cartas (por modo); recomendação considera elementos e battlegear |

Em qualquer fase: botão **💾 Salvar Deck** para salvar o progresso no localStorage.

### Sistemas de combate

| Sistema | Descrição |
|---|---|
| **Tabuleiro adaptativo** | Pirâmide invertida (6v6/3v3) ou duelo direto (1v1) com proteção posicional |
| **Locais** | Deck de 10 locais; define iniciativa e aplica efeitos de combate (30 efeitos distintos) |
| **Iniciativa** | Determinada pelo atributo do Local (Coragem, Poder, Sabedoria ou Velocidade) |
| **Deck de ataques** | Deck embaralhado; compra ANTES do modal (sempre 3 opções como no TCG original) |
| **Challenge de atributo** | Threshold verificado no preview E na execução — valores sempre consistentes |
| **Bônus elemental** | Fire / Water / Earth / Air amplificam dano de ataques compatíveis |
| **Burst Stack (LIFO)** | Janela de resposta após cada ataque; preview de dano inimigo visível no burst |
| **Morte simultânea** | Se ambas morrem no mesmo ataque o resultado é empate no duelo |
| **Sinergia tribal** | OverWorld +COR/SAB · UnderWorld +POD · Mipedian +VEL · Danian +Hive |
| **Reciclagem de deck** | Quando o deck de ataques esvazia, o descarte é embaralhado e reutilizado |

### Passivas de criaturas

| Passiva | Efeito |
|---|---|
| **Intimidate** | Reduz stat específico do oponente antes de checar iniciativa |
| **Swift** | Adiciona velocidade efetiva para fins de iniciativa |
| **Strike** | Causa dano extra no primeiro ataque do combate |
| **Tough** | Reduz todo dano recebido por valor fixo |
| **Berserk** | Ganha bônus de Power quando abaixo de 50% de energia |
| **Reckless** | Causa dano extra mas o atacante também se fere |
| **Fireproof** | Reduz dano de elemento Fire |
| **Range** | Pode atacar criaturas protegidas (não-adjacentes) |

### IA

| Nível | Comportamento |
|---|---|
| **Fácil** | Aleatório — ataques e alvos escolhidos sem estratégia |
| **Médio** | Prioriza alvo mais fraco, usa mugics de sobrevivência, sacrifica battlegear |
| **Difícil** | Counter-pick de mugics, avaliação de ameaça, look-ahead de dano |

### Multiplayer

| Recurso | Descrição |
|---|---|
| **Salas isoladas** | N partidas simultâneas; cada sala tem estado independente |
| **Código curto** | 4 letras sem ambiguidade (sem I/O/0/1) |
| **Lista pública** | Salas abertas e em andamento aparecem em tempo real |
| **Espectador** | Assiste partidas ao vivo sem interagir; recebe estado sincronizado ao entrar |
| **Chat em partida** | Mensagens em tempo real com indicador "digitando..." · atalho `T` |
| **Votação de modo** | Ambos votam em 1v1 / 3v3 / 6v6; partida só começa com consenso |
| **Reconexão inteligente** | Overlay de 60s aguardando reconexão antes de declarar abandono |
| **Link de convite** | Botão copia `?sala=KXBW` — amigo abre o link e entra direto |
| **Torneio (melhor de 3)** | Placar acumulado entre partidas; tela de "Série Vencida!" ao fim |
| **Sync de estado** | Tabuleiro sincronizado após cada morte de criatura e para espectadores |
| **Limpeza automática** | Salas inativas por +2h removidas automaticamente |

### Decks salvos

| Recurso | Descrição |
|---|---|
| **Salvar deck** | Botão disponível em todas as 4 fases do draft |
| **Carregar deck** | Preenche o draft completo (criaturas + battlegear + mugics + ataques) |
| **Renomear** | Edita o nome de qualquer deck salvo |
| **Exportar código** | Gera string base64 compartilhável — importável em qualquer navegador |
| **Importar código** | Cola o código do amigo e carrega o deck direto no draft |
| **Histórico de torneios** | Últimas 20 séries salvas com placar, oponente, modo e data |

### Interface e UX

| Recurso | Descrição |
|---|---|
| **Banner de turno animado** | Verde pulsante (seu turno) · cinza com pontinhos (oponente) · vermelho urgente (escolha alvo) |
| **Indicador de borda** | Pulso na borda da tela: verde (seu turno) · vermelho (escolha alvo) · roxo (conjurador) |
| **Preview de combate** | Overlay nas cartas inimigas: veredito, dano estimado dos dois lados, iniciativa |
| **Range visual** | Cartas protegidas mas alcançáveis por Range pulsam em laranja com badge 🏹 |
| **Floating damage numbers** | `-35` vermelho / `+20` verde / 🎵 roxo (mugic) flutuando sobre a carta |
| **Painel deck de ataques** | Mão / Deck / Descarte + barra de progresso + top-3 prováximas cartas |
| **Destaques pós-partida** | Maior destruidor, mais resiliente, mais abates, sobrevivente — com foto |
| **Histórico de combates** | Painel lateral colapsável com timeline de cada duelo da partida |
| **Log estruturado** | Organizado por rounds com cores por tipo (dano, cura, mugic, local, passiva) |
| **Banner de iniciativa** | Popup antes do primeiro ataque mostrando quem inicia e por qual stat |
| **Atalhos de teclado** | `T` chat · `Enter` passar burst · `Esc` cancelar · `1/2/3` escolher ataque |

---

## Estrutura do projeto

```
chaotic_lite/
├── index.html              ← interface completa (single-page)
├── server.js               ← servidor Node.js + Socket.IO
├── iniciar.bat             ← inicia servidor + ngrok com 1 clique
├── encerrar.bat            ← encerra tudo
├── README.md / RULES.md / MULTIPLAYER.md
└── src/
    ├── css/style.css
    ├── assets/
    └── js/
        ├── engine-core.js          ← constructor, init, modos de jogo
        ├── engine-helpers.js       ← helpers, log estruturado, passivas
        ├── engine-draft.js         ← draft 4 fases, times sugeridos
        ├── engine-board.js         ← tabuleiro, renderização, movimento
        ├── engine-combat.js        ← combate, iniciativa, dano, locais
        ├── engine-burst.js         ← burst stack, mugics, sacrifício
        ├── engine-ui.js            ← tooltips, animações, histórico
        ├── engine-multiplayer.js   ← Socket.IO, lobby, chat, espectador
        ├── engine-ai.js            ← IA (Fácil/Médio/Difícil)
        ├── engine-turn.js          ← turnos, vitória, torneio
        ├── engine-decks.js         ← decks salvos, exportar/importar
        └── data/
            ├── cards.js        ← 92 criaturas
            ├── attacks.js      ← 49 ataques (0–5 BP)
            ├── mugics.js       ← 38 magias
            ├── battlegear.js   ← 29 equipamentos
            ├── locations.js    ← 30 locais de batalha
            ├── passives.js     ← catálogo de passivas
            └── teams.js        ← 18 times sugeridos (6v6 + 3v3 + 1v1)
```
