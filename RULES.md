# Manual de Regras — Chaotic Lite

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Fase de Draft](#2-fase-de-draft)
3. [O Tabuleiro](#3-o-tabuleiro)
4. [Seu Turno](#4-seu-turno)
5. [Combate — Visão Geral](#5-combate--visão-geral)
6. [Iniciativa](#6-iniciativa)
7. [Deck de Ataques](#7-deck-de-ataques)
8. [Resolução de um Ataque](#8-resolução-de-um-ataque)
9. [Burst (Pilha de Respostas)](#9-burst-pilha-de-respostas)
10. [Mugics](#10-mugics)
11. [Battlegear](#11-battlegear)
12. [Locais de Batalha](#12-locais-de-batalha)
13. [Sinergia Tribal](#13-sinergia-tribal)
14. [Passivas das Criaturas](#14-passivas-das-criaturas)
15. [Fim do Combate](#15-fim-do-combate)
16. [Criaturas Disponíveis](#16-criaturas-disponíveis)

---

## 1. Visão Geral

Chaotic Lite é um jogo de estratégia em turnos para 1 jogador contra uma IA. Cada jogador controla um exército de **6 criaturas** posicionadas num tabuleiro piramidal. O objetivo é destruir as criaturas inimigas usando ataques, magias e habilidades especiais.

Uma partida tem duas fases:
- **Draft** — montar o exército antes da batalha
- **Batalha** — turnos alternados até um lado perder todas as criaturas

---

## 2. Fase de Draft

O Draft tem **3 etapas obrigatórias**, executadas em sequência.

### Etapa 1 — Escolher Criaturas

- Selecione exatamente **6 criaturas** do catálogo.
- Máximo de **2 cópias** da mesma criatura.
- Use os filtros de tribo (OverWorld, UnderWorld, Mipedian, Danian) para navegar.
- O painel de **Sinergia** à direita mostra o bônus que seu exército vai receber.
- Clique numa criatura já selecionada para removê-la.

### Etapa 2 — Equipar Battlegear

- Cada uma das suas 6 criaturas recebe **1 equipamento** (Battlegear).
- Clique no equipamento na lista da esquerda → clique na criatura que vai receber.
- Battlegears concedem bônus de atributos e/ou elementos adicionais.
- Todo equipamento fica **face down** até o primeiro combate daquela criatura.

### Etapa 3 — Escolher Mugics

- Escolha **6 Mugics** (magias) para compor a sua mão durante a batalha.
- Mugics têm **custo em ♪ (contadores Mugic)** — pago pela criatura caster.
- Se a Mugic for de uma tribo diferente da criatura que pagar, o custo aumenta **+1 ♪**.
- Somente Mugics da tribo do seu exército ou **Genéricas** aparecem sem penalidade.
- A mão de Mugics **não se repõe** — gaste com sabedoria.

---

## 3. O Tabuleiro

O tabuleiro de cada jogador é uma **pirâmide invertida** com 6 slots:

```
        [ Retaguarda ]
       [ Meio-E ][ Meio-D ]
  [ Frente-E ][ Frente-C ][ Frente-D ]
```

As criaturas são posicionadas automaticamente no início da batalha.

### Regra de Proteção

Uma criatura está **protegida** (não pode atacar nem ser atacada) se houver aliados bloqueando sua frente:

| Posição | Protegida quando... |
|---|---|
| Frente (qualquer) | Nunca — sempre exposta |
| Meio-E | Frente-E **ou** Frente-C estiver viva |
| Meio-D | Frente-C **ou** Frente-D estiver viva |
| Retaguarda | Meio-E **ou** Meio-D estiver viva |

Criaturas protegidas aparecem com **opacidade reduzida** na tela.

---

## 4. Seu Turno

A cada turno, você pode fazer **uma** ação:

### A. Mover

- Clique numa criatura sua exposta.
- Slots adjacentes válidos ficam destacados em **verde**.
- Clique no slot verde desejado para mover a criatura.
- O movimento termina seu turno imediatamente.

**Adjacências válidas:**
- Frente-E ↔ Meio-E
- Frente-C ↔ Meio-E e Meio-D
- Frente-D ↔ Meio-D
- Meio-E ↔ Retaguarda
- Meio-D ↔ Retaguarda

### B. Atacar

- Clique numa criatura sua exposta para selecioná-la (fica destacada em amarelo).
- Clique numa criatura inimiga exposta para iniciar o combate.
- Criaturas protegidas não podem ser alvo.

---

## 5. Combate — Visão Geral

O combate entre duas criaturas segue este fluxo:

```
1. Revelar Battlegears (se ainda não revelados)
2. Determinar Iniciativa → define quem ataca primeiro
3. Aplicar passivas de "combatStart"
4. Loop de Strikes:
     a. Atacante da vez escolhe uma carta de ataque
     b. Burst abre — ambos podem responder com Mugics
     c. Burst fecha — resoluções em ordem reversa (LIFO)
     d. Dano é calculado e aplicado
     e. Se ninguém morreu → troca o striker, volta para (a)
5. Criatura com Energy ≤ 0 é derrotada e removida do tabuleiro
6. Sobrevivente recupera energia total
7. Novo Local é revelado para o próximo combate
```

---

## 6. Iniciativa

A iniciativa determina **quem ataca primeiro** dentro do combate. O atributo usado é definido pelo **Local ativo**.

**Cálculo:**
```
valor = atributo_base + bônus_sinergia + bônus_location + bônus_swift
```

Quem tiver o **maior valor** ataca primeiro. Em caso de empate, o jogador que iniciou o ataque vai primeiro.

> **Passiva Swift:** Criaturas com Swift somam +N à sua Speed na disputa de iniciativa.

---

## 7. Deck de Ataques

Cada jogador tem um **deck de 20 cartas de ataque** embaralhadas aleatoriamente no início da partida. As cartas são **compartilhadas** entre todas as suas criaturas — não pertencem a nenhuma delas individualmente.

**Mão:** Você começa com **2 cartas** na mão. Após usar uma, compra uma nova do deck.

**Reciclagem:** Quando o deck esvazia, o **descarte é embaralhado** e vira o novo deck. Você nunca fica sem cartas.

### Estrutura de uma carta de ataque

| Campo | Significado |
|---|---|
| `baseDamage` | Dano garantido, sempre aplicado |
| `elementRequirement` | Elemento necessário para o bônus elemental |
| `elementDamage` | Dano extra se a criatura tem o elemento |
| `statRequirement` | Atributo do Challenge (courage, power, wisdom, speed) |
| `statThreshold` | Margem de superioridade necessária para o Challenge |
| `statDamage` | Dano extra se o Challenge for aprovado |

---

## 8. Resolução de um Ataque

O dano total de um ataque é calculado em três etapas:

### Etapa 1 — Dano Base

```
dano = carta.baseDamage
```

Sempre garantido, independente de qualquer condição.

### Etapa 2 — Bônus Elemental

```
se criatura possui carta.elementRequirement:
    dano += carta.elementDamage
```

Verifique os elementos da criatura e do Battlegear equipado.

### Etapa 3 — Challenge (Bônus de Atributo)

```
stat_atacante = atributo_base + sinergia + location + battlegear
stat_defensor = atributo_base + sinergia + location + battlegear

se stat_atacante >= stat_defensor + carta.statThreshold:
    dano += carta.statDamage
```

O **threshold** representa a margem de superioridade exigida. Cartas mais poderosas têm threshold maior.

**Exemplo — Sunder (Power, threshold 10, +10 dano):**
```
Chaor Power efetivo:  100  (base 85 + battlegear +15)
Maxxor Power efetivo:  75  (base 60 + sinergia +15)

100 >= 75 + 10  →  100 >= 85  →  ✅ Challenge aprovado
Dano: 20 (base) + 10 (challenge) = 30
```

### Redução de Dano (Passivas)

Passivas como **Tough** e **Elementproof** podem reduzir o dano **após** o cálculo completo:

```
dano_final = max(0, dano_total - redução_passiva)
```

---

## 9. Burst (Pilha de Respostas)

Quando um atacante declara um ataque, o jogo abre uma **janela de resposta** — o Burst.

### Como funciona

1. O ataque é colocado na **pilha (stack)**.
2. O **atacante** tem prioridade primeiro — pode jogar uma Mugic ou passar.
3. O **defensor** (ou IA) tem a próxima prioridade.
4. Quando **ambos passam em sequência**, o Burst fecha.
5. As ações são resolvidas em ordem **reversa (LIFO)** — a última adicionada resolve primeiro.

### Por que isso importa

Mugics jogadas no Burst resolvem **antes** do ataque que as provocou. Isso permite:
- Curar a criatura **antes** de receber dano.
- Buffar atributos **antes** do Challenge ser verificado.
- Causar dano ao inimigo **antes** que ele ataque.

---

## 10. Mugics

Mugics são magias jogadas durante o Burst. Elas têm **custo em ♪** pago pelos contadores de uma criatura aliada.

### Como jogar uma Mugic no Burst

1. Clique em **"Jogar Mugic"** no modal do Burst.
2. Selecione a Mugic na sua mão.
3. Clique na criatura que vai pagar o custo (ela precisa ter ♪ suficientes).
4. A Mugic entra na pilha.

### Penalidade tribal

Se a Mugic for de uma tribo diferente da criatura pagadora:
```
custo_real = custo_base + 1
```

### Tipos de efeito

| Tipo | Efeito |
|---|---|
| `heal` | Recupera energia da criatura aliada |
| `damage` | Causa dano mágico ao inimigo |
| `buff_courage` | +N Coragem na criatura aliada |
| `buff_power` | +N Poder na criatura aliada |
| `buff_wisdom` | +N Sabedoria na criatura aliada |
| `buff_speed` | +N Velocidade na criatura aliada |
| `buff_all` | +N em todos os atributos |

---

## 11. Battlegear

Equipamentos que ficam **face down** até o primeiro combate da criatura. Ao revelar:

- Bônus de atributos são aplicados permanentemente.
- Alguns Battlegears concedem **elementos** adicionais à criatura.

Os bônus do Battlegear entram no cálculo de iniciativa, challenge e dano elemental assim que revelados.

---

## 12. Locais de Batalha

Cada combate acontece num **Local** diferente, revelado automaticamente antes da luta.

O Local define:
- **Qual atributo** determina a iniciativa.
- **Modificadores** adicionados aos atributos de todos durante o combate.

Ao fim de cada combate, um novo Local é revelado para o próximo. O deck de Locais tem 10 cartas; quando acaba o jogo continua sem Local ativo (iniciativa por Speed padrão).

---

## 13. Sinergia Tribal

Criaturas da mesma tribo no seu exército se beneficiam mutuamente.

| Tribo | Bônus por aliado da mesma tribo |
|---|---|
| **OverWorld** | +5 Courage, +5 Wisdom |
| **UnderWorld** | +10 Power |
| **Mipedian** | +10 Speed |
| **Danian** | +5 em todos os atributos |

Esses bônus são somados nos cálculos de iniciativa, challenge e dano — mas **não** alteram os valores base da criatura permanentemente.

---

## 14. Passivas das Criaturas

Habilidades passivas são ativadas automaticamente nos momentos certos, sem nenhuma ação do jogador.

### Triggers disponíveis

| Trigger | Quando ocorre |
|---|---|
| `combatStart` | No início de qualquer combate envolvendo a criatura |
| `initiativeCalc` | Durante o cálculo de iniciativa |
| `attackStart` | Antes de um ataque ser declarado |
| `damageTaken` | Quando a criatura for receber dano |

### Passivas implementadas

| Passiva | Efeito | Criaturas |
|---|---|---|
| **Intimidate** | Reduz N de um atributo do adversário ao iniciar combate | Chaor |
| **Swift** | +N Speed na disputa de iniciativa | Intress |
| **Strike** | +N dano bônus no primeiro ataque do combate | Takinom, Lord Van Bloot, Zhade |
| **Tough** | Reduz N de todo dano recebido | Illexia |
| **Berserk** | +N Power quando abaixo de 50% de energia | — |
| **Fireproof** | Reduz N de dano de ataques Fire | — |

---

## 15. Fim do Combate

Quando uma criatura chega a **Energy ≤ 0**:

1. É removida do tabuleiro.
2. A criatura **sobrevivente recupera toda a sua energia** (modo Lite).
3. Um novo Local é revelado.
4. O turno passa para o próximo jogador.

O jogo termina quando um lado **não tiver mais criaturas vivas e expostas** para atacar.

---

## 16. Criaturas Disponíveis

| Nome | Tribo | Energy | Passiva |
|---|---|---|---|
| Maxxor | OverWorld | 65 | — |
| Intress | OverWorld | 60 | Swift +10 |
| Najarin | OverWorld | 45 | — |
| Tangath Toborn | OverWorld | 65 | — |
| Chaor | UnderWorld | 70 | Intimidate Courage 10 |
| Takinom | UnderWorld | 55 | Strike 10 |
| Lord Van Bloot | UnderWorld | 70 | Strike 15 |
| H'earring | UnderWorld | 40 | — |
| Mudeenu | Mipedian | 60 | — |
| Zhade | Mipedian | 55 | Strike 10 |
| Illexia | Danian | 70 | Tough 5 |
| Wamma | Danian | 45 | — |

---

*Última atualização: reflete o estado atual do motor (Nível 1 completo — histórico de combate, passivas, deck com reciclagem, IA inteligente).*
