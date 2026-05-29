# Como jogar Chaotic Lite com um amigo online

Você será o **Host** — o jogo roda na sua máquina, seu amigo se conecta pelo navegador.  
Seu amigo **não precisa instalar nada**.

---

## O que instalar (só uma vez)

| Programa | Para quê | Download |
|---|---|---|
| **Node.js** | Rodar o servidor do jogo | https://nodejs.org → botão "LTS" |
| **ngrok** | Criar um link público para sua máquina | Instalar via winget (ver abaixo) |
| **Conta ngrok** | Necessária para usar o túnel | https://dashboard.ngrok.com/signup (gratuito) |

---

## Instalação (só na primeira vez)

### 1. Instalar Node.js

1. Acesse https://nodejs.org e clique em **"LTS"**
2. Execute o instalador e clique em Next em tudo
3. **Importante:** na tela "Tools for Native Modules", marque a caixa se aparecer

Após instalar, feche e abra um novo PowerShell e fixe o PATH permanentemente:

```powershell
[System.Environment]::SetEnvironmentVariable("PATH", [System.Environment]::GetEnvironmentVariable("PATH","User") + ";C:\Program Files\nodejs", "User")
```

Feche e abra o PowerShell novamente. Verifique:

```powershell
node --version
npm --version
```

Devem aparecer números de versão. Se aparecerem, está pronto.

---

### 2. Instalar ngrok

A forma mais simples no Windows é pelo winget (já vem no Windows 10/11):

```powershell
winget install ngrok.ngrok
```

Se o winget não funcionar, baixe o `.zip` em https://ngrok.com/download, extraia o `ngrok.exe` e coloque em `C:\Users\SEU_USUARIO\`.

---

### 3. Criar conta e configurar o token do ngrok

1. Crie uma conta gratuita em https://dashboard.ngrok.com/signup
2. Após logar, vá em **"Your Authtoken"** no menu lateral
3. Copie o token e rode no PowerShell:

```powershell
ngrok config add-authtoken SEU_TOKEN_AQUI
```

Você verá: `Authtoken saved to configuration file`. Feito.

---

### 4. Instalar dependências do servidor

No PowerShell, navegue até a pasta do jogo e rode:

```powershell
cd C:\Users\ClikSofthouseTI\pasta4\chaotic_lite
npm install
```

Aparece uma pasta `node_modules`. Só precisa fazer isso **uma vez**.

---

## Como jogar com seu amigo (toda sessão)

Você vai usar **duas janelas de PowerShell** abertas ao mesmo tempo.

### Janela 1 — Servidor do jogo

```powershell
cd C:\Users\ClikSofthouseTI\pasta4\chaotic_lite
node server.js
```

Deve aparecer:

```
╔════════════════════════════════════════╗
║   Chaotic Lite — Servidor Multiplayer  ║
╠════════════════════════════════════════╣
║  Local:  http://localhost:3000         ║
║  Aguardando conexões...                ║
╚════════════════════════════════════════╝
```

Deixe essa janela **aberta** durante todo o jogo.

---

### Janela 2 — Túnel ngrok

```powershell
ngrok http 3000
```

Vai aparecer algo assim:

```
Forwarding   https://eggshell-upright-viewpoint.ngrok-free.dev -> http://localhost:3000
```

Copie a URL que aparecer na linha **Forwarding** (começa com `https://`).

---

### Conectar os dois

| Quem | Endereço |
|---|---|
| **Você** | `http://localhost:3000` |
| **Seu amigo** | A URL do ngrok (ex: `https://eggshell-upright-viewpoint.ngrok-free.dev`) |

Mande a URL no WhatsApp. Quando os dois abrirem, o jogo conecta automaticamente.

---

## O que aparece em cada situação

| Situação | O que aparece |
|---|---|
| Você conectou, amigo ainda não | "Aguardando segundo jogador..." |
| Os dois conectaram | Jogo inicia — P1 (você) e P2 (amigo) |
| Alguém caiu durante o jogo | Mensagem de desconexão |

---

## Encerrando

Quando terminar:
1. `Ctrl+C` na Janela 1 (servidor)
2. `Ctrl+C` na Janela 2 (ngrok)

A URL expira sozinha. Na próxima sessão, uma nova URL será gerada — só mandar pro amigo de novo.

---

## Problemas comuns

**`node` ou `npm` não reconhecido**
→ Rode o comando de PATH permanente da seção 1 e reabra o PowerShell.

**`ngrok` não reconhecido após winget**
→ Feche e abra o PowerShell. Se ainda não funcionar, use o caminho completo onde extraiu o `.exe`.

**Amigo abre o link e aparece aviso do ngrok ("Visit Site")**
→ Normal na conta gratuita. Ele clica em "Visit Site" e entra no jogo.

**Amigo abre o link mas tela fica em branco**
→ Confira se o `node server.js` ainda está rodando na Janela 1.

**`npm install` dá erro de permissão**
→ Abra o PowerShell como Administrador (botão direito → "Executar como administrador").

**ngrok mostra erro de authtoken**
→ Rode novamente: `ngrok config add-authtoken SEU_TOKEN`

---

## Resumo rápido (quando tudo já estiver instalado)

```powershell
# Janela 1 — servidor
cd C:\Users\ClikSofthouseTI\pasta4\chaotic_lite
node server.js

# Janela 2 — túnel
ngrok http 3000

# Copie a URL "Forwarding" e mande pro amigo no WhatsApp
# Você abre: http://localhost:3000
# Joguem!
```
