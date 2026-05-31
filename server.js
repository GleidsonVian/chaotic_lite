/**
 * Chaotic Lite — Servidor Multiplayer
 * Tecnologias: Node.js + Express + Socket.IO
 *
 * Uso:
 *   npm install
 *   node server.js
 */

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
    cors: { origin: '*' }
});

// Serve os arquivos estáticos do jogo (index.html, js, css, assets)
app.use(express.static(path.join(__dirname)));

// ─── Estado das salas ────────────────────────────────────────────────────────
// Cada sala tem exatamente 2 jogadores.
// Formato: { [roomId]: { p1: socketId, p2: socketId } }
const rooms = {};

function findOrCreateRoom(socket) {
    // Procura uma sala aguardando segundo jogador
    for (const [roomId, room] of Object.entries(rooms)) {
        if (!room.p2) {
            room.p2 = socket.id;
            return { roomId, playerNumber: 2 };
        }
    }
    // Cria sala nova
    const roomId = `room_${Date.now()}`;
    rooms[roomId] = { p1: socket.id, p2: null };
    return { roomId, playerNumber: 1 };
}

// ─── Eventos Socket.IO ────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[+] Conectado: ${socket.id}`);

    // Jogador entra numa sala automaticamente
    const { roomId, playerNumber } = findOrCreateRoom(socket);
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerNumber = playerNumber;

    // Informa o jogador qual número ele é + URL pública se disponível
    socket.emit('assigned', { playerNumber, roomId, publicUrl });

    const room = rooms[roomId];

    if (room.p1 && room.p2) {
        // Sala completa — informa ambos para começar
        io.to(roomId).emit('room_ready', { roomId });
        console.log(`[=] Sala ${roomId} completa. Jogo pode começar.`);
    } else {
        socket.emit('waiting', { message: 'Aguardando segundo jogador...' });
        console.log(`[~] Sala ${roomId} aguardando P2.`);
    }

    // ── Repassar ações do jogo para o outro jogador ──────────────────────────
    // O cliente envia qualquer ação com socket.emit('action', { type, ...dados })
    // O servidor repassa para o outro jogador da mesma sala.
    socket.on('action', (data) => {
        socket.to(roomId).emit('action', data);
    });

    // ── Sincronizar estado completo (útil após reconexão) ────────────────────
    socket.on('sync_state', (state) => {
        socket.to(roomId).emit('sync_state', state);
    });

    // ── Desconexão ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log(`[-] Desconectado: ${socket.id}`);
        if (rooms[roomId]) {
            // Avisa o outro jogador
            socket.to(roomId).emit('opponent_disconnected');
            // Limpa a sala
            delete rooms[roomId];
            console.log(`[x] Sala ${roomId} encerrada.`);
        }
    });
});

// ─── Detectar URL pública do ngrok ───────────────────────────────────────────
let publicUrl = null;

function detectNgrok() {
    const http = require('http');
    const req = http.get('http://localhost:4040/api/tunnels', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const tunnels = JSON.parse(data).tunnels;
                const https   = tunnels.find(t => t.proto === 'https');
                if (https) {
                    publicUrl = https.public_url;
                    console.log(`║  Público: ${publicUrl}`);
                    console.log('╚════════════════════════════════════════╝');
                    // Avisa todos os clientes conectados sobre a URL pública
                    io.emit('public_url', { publicUrl });
                }
            } catch(e) {}
        });
    });
    req.on('error', () => {
        // ngrok não está rodando — normal no modo local
        console.log('║  Público: (ngrok não detectado)        ║');
        console.log('╚════════════════════════════════════════╝');
    });
    req.setTimeout(3000, () => req.destroy());
}

// ─── Iniciar servidor ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   Chaotic Lite — Servidor Multiplayer  ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Local:  http://localhost:${PORT}          ║`);
    // Tenta detectar ngrok após 2s (tempo para o ngrok iniciar)
    setTimeout(detectNgrok, 2000);
});
