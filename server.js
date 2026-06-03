/**
 * Chaotic Lite — Servidor Multiplayer com Salas
 * Tecnologias: Node.js + Express + Socket.IO
 *
 * Modos de sala:
 *   private  — criada com código de 4 letras, só entra quem tem o código
 *   public   — aparece na lista pública, qualquer um entra
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
const io     = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname)));

// ─── Gerador de código curto ──────────────────────────────────────────────────
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I/O/0/1 (confusos)
function genCode() {
    let code;
    do { code = Array.from({length: 4}, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join(''); }
    while (rooms.has(code));
    return code;
}

// ─── Estado das salas ─────────────────────────────────────────────────────────
// Map<code, Room>
// Room: { code, type, name, p1, p2, spectators, state, createdAt }
//   p1/p2: { id, name } | null
//   spectators: Set<socketId>
//   state: 'waiting' | 'playing' | 'done'
const rooms = new Map();

function roomPublicInfo(room) {
    return {
        code:       room.code,
        name:       room.name,
        type:       room.type,
        players:    (room.p1 ? 1 : 0) + (room.p2 ? 1 : 0),
        spectators: room.spectators ? room.spectators.size : 0,
        state:      room.state,
        gameMode:   room.gameMode || null,
        createdAt:  room.createdAt,
    };
}

function broadcastPublicRooms() {
    const list = [];
    for (const room of rooms.values()) {
        // Mostra salas públicas abertas (waiting) E em andamento (playing — para espectadores)
        if (room.type === 'public' && (room.state === 'waiting' || room.state === 'playing')) {
            list.push(roomPublicInfo(room));
        }
    }
    io.emit('public_rooms', list);
}

// Limpa salas antigas (> 2h sem atividade) a cada 30min
setInterval(() => {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    for (const [code, room] of rooms.entries()) {
        if (room.createdAt < cutoff) {
            rooms.delete(code);
            console.log(`[gc] Sala ${code} expirada e removida.`);
        }
    }
}, 30 * 60 * 1000);

// ─── Eventos Socket.IO ────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[+] Conectado: ${socket.id}`);

    // Envia URL pública se disponível
    if (publicUrl) socket.emit('public_url', { publicUrl });

    // ── Lista de salas públicas disponíveis ──────────────────────────────────
    socket.on('get_public_rooms', () => {
        const list = [];
        for (const room of rooms.values()) {
            if (room.type === 'public' && (room.state === 'waiting' || room.state === 'playing')) {
                list.push(roomPublicInfo(room));
            }
        }
        socket.emit('public_rooms', list);
    });

    // ── Criar sala ───────────────────────────────────────────────────────────
    // data: { type: 'private'|'public', name: string, playerName: string }
    socket.on('create_room', (data) => {
        const code = genCode();
        const room = {
            code,
            type:      data.type || 'private',
            name:      data.name || `Sala de ${data.playerName || 'Jogador'}`,
            p1:        { id: socket.id, name: data.playerName || 'Jogador 1' },
            p2:        null,
            state:     'waiting',
            createdAt: Date.now(),
        };
        room.spectators = new Set();
        rooms.set(code, room);
        socket.join(code);
        socket.roomCode      = code;
        socket.playerNumber  = 1;
        socket.isSpectator   = false;

        socket.emit('room_created', { code, playerNumber: 1 });
        console.log(`[+] Sala ${code} criada (${room.type}) por ${room.p1.name}`);

        if (room.type === 'public') broadcastPublicRooms();
    });

    // ── Entrar em sala por código ─────────────────────────────────────────────
    // data: { code: string, playerName: string }
    socket.on('join_room', (data) => {
        const code = (data.code || '').toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
            socket.emit('join_error', { message: `Sala "${code}" não encontrada.` });
            return;
        }
        if (room.state !== 'waiting') {
            socket.emit('join_error', { message: `Sala "${code}" já está em andamento.` });
            return;
        }
        if (room.p2) {
            socket.emit('join_error', { message: `Sala "${code}" já está cheia.` });
            return;
        }

        room.p2    = { id: socket.id, name: data.playerName || 'Jogador 2' };
        room.state = 'playing';
        socket.join(code);
        socket.roomCode      = code;
        socket.playerNumber  = 2;
        socket.isSpectator   = false;

        console.log(`[=] Sala ${code} completa: ${room.p1.name} vs ${room.p2.name}`);

        // Avisa P1 que P2 entrou
        socket.to(code).emit('opponent_joined', {
            opponentName: room.p2.name,
            playerNumber: 1,
        });

        // Avisa P2 que entrou com sucesso
        socket.emit('room_joined', {
            code,
            playerNumber: 2,
            opponentName: room.p1.name,
        });

        // Avisa ambos que a sala está pronta
        io.to(code).emit('room_ready', { code });

        if (room.type === 'public') broadcastPublicRooms();
    });

    // ── Entrar como espectador ────────────────────────────────────────────────
    // data: { code: string, playerName: string }
    socket.on('spectate_room', (data) => {
        const code = (data.code || '').toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
            socket.emit('spectate_error', { message: `Sala "${code}" não encontrada.` });
            return;
        }
        if (room.state === 'waiting') {
            socket.emit('spectate_error', { message: `Sala "${code}" ainda não tem partida em andamento.` });
            return;
        }

        socket.join(code);
        socket.roomCode    = code;
        socket.isSpectator = true;
        socket.spectName   = data.playerName || 'Espectador';
        room.spectators    = room.spectators || new Set();
        room.spectators.add(socket.id);

        const spectCount = room.spectators.size;
        socket.emit('spectate_joined', {
            code,
            spectatorCount: spectCount,
            p1Name: room.p1 ? room.p1.name : 'Jogador 1',
            p2Name: room.p2 ? room.p2.name : 'Jogador 2',
            gameMode: room.gameMode || null,
        });

        // Avisa os jogadores que um espectador entrou
        socket.to(code).emit('spectator_joined', {
            name:  socket.spectName,
            count: spectCount,
        });

        console.log(`[👁] ${socket.spectName} entrou como espectador na sala ${code} (total: ${spectCount})`);
        if (room.type === 'public') broadcastPublicRooms();
    });

    // ── Reentrar numa sala após reconexão ────────────────────────────────────
    // data: { code, playerNum, playerName }
    socket.on('rejoin_room', (data) => {
        const code = (data.code || '').toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
            socket.emit('rejoin_error', { message: 'Sala não encontrada ou já encerrada.' });
            return;
        }

        const pn = data.playerNum; // 1 ou 2
        if (room[`p${pn}`]) {
            socket.emit('rejoin_error', { message: 'Slot já ocupado.' });
            return;
        }

        // Cancela o timer de abandono
        const timer = room[`p${pn}ReconnectTimer`];
        if (timer) { clearTimeout(timer); room[`p${pn}ReconnectTimer`] = null; }

        // Restaura o slot
        room[`p${pn}`]    = { id: socket.id, name: data.playerName || room[`p${pn}DisconnectedName`] || `Jogador ${pn}` };
        room.state        = 'playing';
        socket.join(code);
        socket.roomCode     = code;
        socket.playerNumber = pn;
        socket.isSpectator  = false;

        console.log(`[↩] Jogador ${pn} reconectou na sala ${code}`);

        socket.emit('rejoin_ok', { code, playerNum: pn });
        // Avisa o oponente que o jogador voltou
        socket.to(code).emit('opponent_reconnected', {
            playerNum: pn,
            playerName: room[`p${pn}`].name
        });

        if (room.type === 'public') broadcastPublicRooms();
    });

    // ── Repassar ações do jogo — jogadores enviam, todos na sala recebem ──────
    socket.on('action', (data) => {
        const code = socket.roomCode;
        if (!code) return;
        // Espectadores não podem enviar ações de jogo
        if (socket.isSpectator) return;
        // Guarda o modo votado na sala (para exibir na lista pública)
        if (data.type === 'vote_mode' && rooms.has(code)) {
            rooms.get(code).gameMode = data.mode;
        }
        // Envia para todos na sala EXCETO o remetente (inclui espectadores)
        socket.to(code).emit('action', data);
    });

    // ── Chat em partida ───────────────────────────────────────────────────────
    socket.on('chat', (data) => {
        const code = socket.roomCode;
        if (!code || !rooms.has(code)) return;
        const room  = rooms.get(code);
        const name  = socket.isSpectator
            ? (socket.spectName || 'Espectador')
            : (socket.playerNumber === 1 ? (room.p1 && room.p1.name) : (room.p2 && room.p2.name)) || `J${socket.playerNumber}`;
        const msg   = String(data.msg || '').trim().slice(0, 200); // limita a 200 chars
        if (!msg) return;
        // Envia para todos na sala EXCETO quem enviou (cliente mostra a própria msg imediatamente)
        socket.to(code).emit('chat', { name, msg, ts: Date.now(), isSpectator: !!socket.isSpectator });
    });

    // ── Sync de estado completo ───────────────────────────────────────────────
    socket.on('sync_state', (state) => {
        const code = socket.roomCode;
        if (code) socket.to(code).emit('sync_state', state);
    });

    // ── Espectador pede o estado atual (solicita aos jogadores da sala) ───────
    socket.on('spectate_request_state', () => {
        const code = socket.roomCode;
        if (!code) return;
        // Pede ao P1 da sala que envie o estado
        socket.to(code).emit('spectate_send_state');
    });

    // ── Desconexão ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log(`[-] Desconectado: ${socket.id}`);
        const code = socket.roomCode;
        if (!code || !rooms.has(code)) return;

        const room = rooms.get(code);

        if (socket.isSpectator) {
            // Espectador saiu — só remove do Set
            if (room.spectators) room.spectators.delete(socket.id);
            socket.to(code).emit('spectator_left', { count: room.spectators ? room.spectators.size : 0 });
            console.log(`[👁-] Espectador ${socket.spectName || socket.id} saiu da sala ${code}`);
            if (room.type === 'public') broadcastPublicRooms();
            return;
        }

        const playerNum = socket.playerNumber;
        const playerName = playerNum === 1
            ? (room.p1 && room.p1.name) : (room.p2 && room.p2.name);

        // Guarda info do jogador que saiu para permitir reconexão
        room[`p${playerNum}DisconnectedId`]   = socket.id;
        room[`p${playerNum}DisconnectedName`] = playerName;
        room.state = 'reconnecting';

        // Avisa o oponente que vai ter 60s de espera
        socket.to(code).emit('opponent_reconnecting', {
            playerNum,
            playerName,
            timeout: 60
        });
        console.log(`[~] Jogador ${playerNum} (${playerName}) desconectou da sala ${code}. Aguardando 60s...`);

        // Timer de 60s — se não reconectar, encerra
        const timer = setTimeout(() => {
            if (!rooms.has(code)) return;
            const r = rooms.get(code);
            // Verifica se ainda não reconectou (slot ainda null ou mesmo ID)
            const slotNull = r[`p${playerNum}`] === null
                || r[`p${playerNum}`]?.id === socket.id;
            if (slotNull) {
                socket.to(code).emit('opponent_disconnected');
                r.state = 'done';
                r[`p${playerNum}`] = null;
                if (!r.p1 && !r.p2) {
                    rooms.delete(code);
                    console.log(`[x] Sala ${code} encerrada por timeout.`);
                }
                if (r.type === 'public') broadcastPublicRooms();
            }
        }, 60 * 1000);

        // Guarda o timer para cancelar se reconectar
        room[`p${playerNum}ReconnectTimer`] = timer;

        // Zera o slot (socket desapareceu) mas preserva a sala
        if (room.p1 && room.p1.id === socket.id) room.p1 = null;
        if (room.p2 && room.p2.id === socket.id) room.p2 = null;

        if (room.type === 'public') broadcastPublicRooms();
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
                    io.emit('public_url', { publicUrl });
                }
            } catch(e) {}
        });
    });
    req.on('error', () => {
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
    setTimeout(detectNgrok, 2000);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n[ERRO] A porta ${PORT} já está em uso!`);
        console.error('Execute encerrar.bat primeiro e tente novamente.\n');
        process.exit(1);
    } else {
        console.error('[ERRO] Falha ao iniciar servidor:', err.message);
        process.exit(1);
    }
});
