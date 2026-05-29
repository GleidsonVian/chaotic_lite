# Chaotic Lite

Simulador tático de batalha em turnos rodando 100% no navegador, inspirado no card game **Chaotic**. Sem instalação, sem dependências — basta abrir o `index.html`.

---

## Como jogar localmente

```bash
# Opção 1 — abrir direto
Abra o arquivo index.html em qualquer navegador moderno.

# Opção 2 — servidor local (recomendado para evitar CORS com imagens)
python -m http.server 5500
# acesse http://127.0.0.1:5500
```

---

## O que o jogo tem hoje

| Sistema | Status |
|---|---|
| Draft de criaturas (3 fases) | ✅ |
| Battlegear (equipamentos) | ✅ |
| Mugics (magias) na mão | ✅ |
| Tabuleiro 6v6 com proteção posicional | ✅ |
| Iniciativa pelo atributo do Local | ✅ |
| Deck de ataques com descarte e reciclagem | ✅ |
| Challenge de atributo com threshold | ✅ |
| Bônus elemental | ✅ |
| Burst Stack (respostas em pilha LIFO) | ✅ |
| Sinergia tribal | ✅ |
| Passivas das criaturas (Intimidate, Swift, Strike, Tough, Berserk) | ✅ |
| Histórico de combate por round | ✅ |
| IA com avaliação de dano esperado | ✅ |

---

## Estrutura do projeto

```
chaotic_lite/
├── index.html
├── README.md
├── RULES.md
└── src/
    ├── css/
    │   └── style.css
    ├── assets/          ← imagens das criaturas
    └── js/
        ├── main.js      ← motor principal (GameEngine)
        └── data/
            ├── cards.js
            ├── attacks.js
            ├── mugics.js
            ├── battlegear.js
            ├── locations.js
            └── passives.js
```

---

## Fluxo de uma partida

```
DRAFT
  └─ Escolher 6 criaturas
  └─ Equipar 1 Battlegear por criatura
  └─ Escolher 6 Mugics para a mão

BATALHA
  └─ Turno do Jogador
       └─ Mover criatura (adjacente) → fim do turno
       └─ Atacar criatura exposta inimiga → entra em combate
            └─ Revelar Battlegears
            └─ Determinar iniciativa (atributo do Local)
            └─ Aplicar passivas de combatStart
            └─ Loop de strikes até alguém morrer
                 └─ Atacante escolhe carta de ataque
                 └─ Burst abre (pilha de respostas)
                 └─ Ambos podem jogar Mugics ou passar
                 └─ Burst fecha → resolve em ordem reversa (LIFO)
                 └─ Dano aplicado (base + elemental + challenge)
                 └─ Troca o striker
  └─ Turno da IA (automático)
```

---

## Regras detalhadas

Veja [RULES.md](RULES.md) para o manual completo de mecânicas.
