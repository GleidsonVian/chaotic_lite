# Manual de Regras: Chaotic Lite 📚⚔️

Bem-vindo ao **Chaotic Lite**, um simulador tático de batalha em turnos rodando direto no seu navegador. Este documento consolida todas as regras matemáticas e mecânicas atuais do jogo, ajudando a guiar nossos próximos passos e garantindo que as regras fiquem consistentes.

---

## 1. O Campo de Batalha (Tabuleiro 6v6)
A batalha acontece em duas pirâmides invertidas que se encaram horizontalmente. Cada jogador controla 6 criaturas organizadas em três linhas estratégicas:
- **Linha de Frente (3 slots):** A mais próxima do inimigo.
- **Linha do Meio (2 slots):** Posição intermediária de suporte.
- **Retaguarda (1 slot):** O slot mais recuado e seguro.

---

## 2. Árvore de Proteção e Adjacência (Bloqueios)
No Chaotic Lite, a posição importa muito. Uma criatura não pode atacar ou ser alvo de um ataque corpo-a-corpo se houver um aliado na frente dela bloqueando o caminho.
- **Frente:** Nunca está protegida. Sempre pode agir e ser atacada.
- **Meio:** Protegida pelas criaturas da frente conectadas a ela (ex: a criatura do "Meio Esquerda" fica segura enquanto houver uma criatura na "Frente Esquerda" ou "Frente Centro").
- **Retaguarda:** Fica completamente segura desde que haja qualquer monstro vivo na Linha do Meio.

*Nota Visual: Criaturas "protegidas" ficam com um filtro cinza transparente na tela, para indicar que não podem participar do combate direto até que a barreira à sua frente seja destruída.*

---

## 3. Ações do Turno
Durante o seu turno, ao clicar em uma criatura sua (que não esteja protegida/bloqueada), você pode realizar uma de duas ações. Qualquer ação encerra imediatamente o seu turno.

### A. Reposicionamento Tático (Andar) 🚶‍♂️
- Você pode mover uma criatura para qualquer slot vazio **adjacente**.
- Ao selecionar sua criatura, todos os slots vazios vizinhos (seguindo os galhos da Árvore de Proteção) brilharão em **Verde**. 
- Clicar no slot vazio move a criatura, reconfigurando quem protege quem, e passa a vez.

### B. Combate Corpo-a-Corpo (Atacar) ⚔️
- Ao selecionar uma criatura sua (exposta), você clica numa criatura inimiga (também exposta) para atacá-la.
- O sistema resolverá o "Choque de Atributos" para decidir o dano.

---

## 4. Resolução de Combate (Choque de Atributos)
O Chaotic Lite não usa o dano fixo ou aleatório. O dano é gerado por comparações matemáticas das **Disciplinas** das criaturas (Coragem, Poder, Sabedoria e Velocidade).

1. **Escolha da Disciplina:** O motor analisa os atributos do Atacante e escolhe a disciplina na qual ele tem a maior pontuação.
2. **Dano Base:** Todo ataque validado gera um Dano Base fixo de **15 pontos**.
3. **Bônus de Choque:** O motor pega a disciplina escolhida do Atacante e subtrai pela mesma disciplina do Defensor. 
   - Se a diferença for positiva (o atacante é mais forte naquilo), esse valor é adicionado como dano extra (Limitado a **+20 de bônus** para balanceamento).
   - *Exemplo: Atacante ataca com 60 de Poder. Defensor tem 50 de Poder. Dano final = 15 (Base) + 10 (Diferença) = 25 de Dano.*
4. **Crítico de Velocidade ⚡:** Antes do dano ser aplicado, o motor verifica a Velocidade. Se a Velocidade do Atacante for 15+ pontos maior que a do Defensor, há **30% de chance do ataque ser um Acerto Crítico**. Um crítico **dobra** o dano total calculado!

---

## 5. Para Onde o Jogo Está Indo? (Próximos Upgrades)
O motor de regras primário (Motor do "Professor") está concluído. Daqui para frente, o jogo deve evoluir nas seguintes frentes:

1. **Seleção de Tropas (Deck Drafting):** No futuro, os jogadores não começarão direto no tabuleiro. Haverá uma tela de menus onde cada um escolhe seus 6 monstros a partir do banco de dados (o arquivo `cards.js`).
2. **Ataques Elementais:** Além do Choque de Atributos, criaturas com elemento (ex: Fogo) causarão bônus de dano contra criaturas fracas contra ele (ex: Água).
3. **Mugics (Magias):** Feitiços conjurados durante o turno usando uma barra de energia especial ("Mugicians"), capazes de curar monstros ou lançar danos mágicos que ignoram a proteção do tabuleiro.
4. **Habilidades de Batalha (Range / Swift):** Uma mecânica onde monstros com a tag "Alcance" podem atacar a retaguarda inimiga ignorando a Árvore de Proteção!
5. **Aprimoramentos de UI/UX (O Aprendiz):** Animações de pancada em CSS, efeitos sonoros de espadas, músicas de fundo e modais bonitos de Vitória/Derrota.
