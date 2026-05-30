# Chaotic Lite

Simulador tático multiplayer de batalha em turnos rodando no navegador, inspirado no card game **Chaotic**. Servidor Node.js + Socket.IO para partidas em tempo real entre dois jogadores.

---

## Como rodar

```bash
# Instalar dependências
npm install

# Iniciar servidor
node server.js

# Acessar no navegador
http://127.0.0.1:5500/chaotic_lite/
```

Dois jogadores abrem a URL no mesmo servidor. O jogo aguarda as duas conexões antes de iniciar o draft.

---

## O que o jogo tem

### Sistemas de jogo

| Sistema | Descrição |
|---|---|
| **Draft de criaturas** | Escolha 6 criaturas de um pool de 92 com filtros por tribo, stat mínimo, passiva e ordenação |
| **Deck stats em tempo real** | Painel no draft mostrando média de stats, distribuição de tribos e passivas no deck |
| **Battlegear** | Equipe 1 equipamento por criatura — bônus de stats, passivas extras, elementos, efeitos de sacrifício |
| **Mugics** | Mão de 6 magias escolhidas no draft; jogadas durante o burst com custo em mugic counters |
| **Tabuleiro 6×1** com proteção posicional | Criaturas na retaguarda ficam protegidas pelas da frente |
| **Locais** | Deck de locais revelado a cada combate; define o atributo de iniciativa e aplica efeitos passivos |
| **Initiativa** | Determinada pelo atributo ditado pelo Local ativo (coragem, poder, sabedoria ou velocidade) |
| **Deck de ataques** | Descarte automático após uso; reciclagem quando o deck acaba |
| **Challenge de atributo** | Ataques com threshold verificam o stat do defensor — dano zero se não passar |
| **Bônus elemental** | Fire / Water / Earth / Air amplificam dano de ataques compatíveis |
| **Burst Stack (LIFO)** | Janela de resposta após cada ataque — mugics empilham e resolvem em ordem reversa |
| **Sinergia tribal** | Bônus de stats acumulativos por ter múltiplas criaturas da mesma tribo no deck |
| **IA** | Jogador 2 controlado por IA que avalia dano esperado do ataque, passivas e elementos |

### Passivas de criaturas

| Passiva | Efeito |
|---|---|
| **Intimidate** | Reduz stat específico do oponente antes de checar iniciativa |
| **Swift** | Adiciona velocidade efetiva para fins de iniciativa |
| **Strike** | Causa dano extra no primeiro ataque do combate |
| **Tough** | Reduz todo dano recebido por valor fixo |
| **Berserk** | Ganha bônus de stat a cada ponto de dano recebido |
| **Reckless** | Ataques de poder causam dano extra mas o atacante também sofre dano |
| **Fireproof** | Imune a dano de elemento Fire |
| **Range** | Pode atacar criaturas não-adjacentes |
| **Brainwash** | Efeito especial de tribo M'arrillian |

### Interface e UX

| Recurso | Descrição |
|---|---|
| **Preview de combate** | Ao selecionar um atacante, cada carta inimiga mostra overlay com veredito (VANTAGEM / EQUILIBRADO / DESVANTAGEM), dano estimado dos dois lados e quem tem iniciativa |
| **Feed de batalha** | Mensagens animadas aparecem na tela durante o combate classificadas por tipo (dano, cura, mugic, morte, local) com timing variável |
| **Resumo pós-combate** | Modal automático ao fim de cada duelo com linha do tempo de ataques, total de dano, mugics usadas e curas |
| **Badges de passivas** | Ícones coloridos visíveis diretamente nas cartas, sem precisar de hover |
| **Labels de stats** | COR / POD / SAB / VEL sempre visíveis com tooltip explicativo ao hover |
| **Tooltip global** | Posicionado no `<body>` — nunca cortado por `overflow:hidden` |
| **Efeitos de Local no modal de ataque** | Banner mostrando o que o local ativo faz, com ✅/❌ indicando se a criatura tem o elemento/tribo necessário |
| **Visualizador de descarte** | Botão para ver criaturas e mugics descartadas de ambos os jogadores em abas separadas |
| **Animação de morte** | Gotas de sangue animadas ao morrer + efeito de escurecimento na carta |
| **Auto-scroll para modais** | Janela rola automaticamente para o centro ao abrir burst / seleção de ataque |
| **Filtros no draft** | Filtrar criaturas por tribo, stat mínimo, passiva; ordenar por qualquer stat; contador de resultados |

---

## Estrutura do projeto

```
chaotic_lite/
├── index.html           ← interface completa (single-page)
├── server.js            ← servidor Node.js + Socket.IO
├── README.md
├── RULES.md
└── src/
    ├── css/
    │   └── style.css    ← todos os estilos e animações
    ├── assets/          ← imagens das cartas
    └── js/
        ├── main.js      ← motor principal (GameEngine ~6000 linhas)
        └── data/
            ├── cards.js        ← 92 criaturas
            ├── attacks.js      ← deck de ataques
            ├── mugics.js       ← magias
            ├── battlegear.js   ← 29 equipamentos
            ├── locations.js    ← locais de batalha
            └── passives.js     ← lógica de passivas
```

---

## Fluxo de uma partida

```
DRAFT (ambos os jogadores simultaneamente)
  └─ Fase 1 — Escolher 6 criaturas
       └─ Filtros: tribo / stat mínimo / passiva / ordenação
       └─ Painel de stats do deck em tempo real
  └─ Fase 2 — Equipar 1 Battlegear por criatura
  └─ Fase 3 — Escolher 6 Mugics para a mão

BATALHA (turnos alternados)
  └─ Turno do Jogador
       ├─ Mover criatura (espaço adjacente) → fim do turno
       └─ Atacar criatura inimiga exposta → entra em combate
            └─ Preview de veredito nas cartas inimigas
            └─ Revelar Battlegears
            └─ Determinar iniciativa (atributo do Local)
            └─ Aplicar passivas de combatStart (Swift, Intimidate…)
            └─ Loop de strikes até alguém morrer
                 └─ Atacante escolhe carta de ataque
                      └─ Modal mostra dano estimado, challenge, elementos
                      └─ Banner com efeitos do Local ativo
                 └─ Burst abre (janela de resposta)
                      └─ Ambos podem jogar Mugics ou passar
                      └─ Iron Balls bloqueia mugics não-genéricas
                 └─ Burst fecha → resolve LIFO
                 └─ Dano aplicado (base + elemental + challenge + passivas)
                 └─ Troca o striker
            └─ Criatura com energia ≤ 0 é descartada
            └─ Modal de resumo do combate (dano / mugics / curas / timeline)
            └─ Novo local revelado para o próximo combate
  └─ Turno da IA (automático)

FIM DE JOGO
  └─ Vence quem eliminar todas as criaturas do oponente do tabuleiro
```

---

## Regras detalhadas

Veja [RULES.md](RULES.md) para o manual completo de mecânicas.
