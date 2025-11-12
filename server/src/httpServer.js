// TODO: ?�운???�리�?

const express = require('express');
const { pool, testConnection } = require('./db');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

// 루트 ?�우??(메인 ?�이지 ?�내)
app.get('/', (req, res) => {
    res.send('?�이?�게???�버 ?�행 �?);
});

// 기본 ?�우??
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// DB ?�결 ?�스???�우??
app.get('/db-test', async (req, res) => {
    try {
        const [result] = await pool.query('SELECT 1 + 1 AS result');
        res.json({ 
            ok: true, 
            result: result[0].result,
            message: 'DB ?�결 ?�공'
        });
    } catch (err) {
        res.status(500).json({ 
            ok: false, 
            message: 'DB ?�결 ?�패' 
        });
    }
});

// HTTP ?�버?� socket.io ?�버 ?�성
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // 개발 중에???�체 ?�용, 배포 ?�에???�메??지??
        methods: ['GET', 'POST']
    }
});

// ?�버???�속???�레?�어 목록???�?�할 배열
let players = [];
// 게임 �?목록???�?�할 객체
let rooms = {};
let nextRoomId = 1; // ?�음 �?ID�??�한 카운??
// 게임???�용???�어 목록
const wordList = ['?�과', '바나??, '?�기', '?�렌지', '?�도', '?�박', '?�인?�플', '멜론'];

// socket.io ?�결 �??�벤??처리
io.on('connection', (socket) => {
    console.log('???�라?�언???�결:', socket.id);

    socket.on('join', (nickname) => {
        console.log(`${nickname} ?�이 ?�속?�습?�다.`);
        const newPlayer = { id: socket.id, nickname: nickname, roomId: null };
        players.push(newPlayer);
        
        // 로비???�는 모든 ?�람?�게 최신 ?�레?�어 목록 ?�송
        io.emit('updatePlayerList', players.filter(p => p.roomId === null));
        
        // ?�로 ?�속???�람?�게�??�재 �?목록 ?�송
        socket.emit('updateRoomList', Object.values(rooms).map(r => ({ id: r.id, name: r.name, playerCount: r.players.length, gameStarted: r.gameStarted })));
    });

    socket.on('createRoom', (roomName) => {
        const roomId = nextRoomId++;
        const player = players.find(p => p.id === socket.id);
        if (player) {
            player.roomId = roomId;
            rooms[roomId] = {
                id: roomId,
                name: roomName,
                players: [player],
                gameStarted: false,
                word: null,
                liar: null,
                votes: {}, // ?�표 기록 객체 추�?
                host: player.id, // 방장 ID ?�??
                turnOrder: [],
                currentPlayerIndex: 0
            };
            socket.join(roomId);
            console.log(`${player.nickname} ?�이 ${roomName} (ID: ${roomId}) 방을 ?�성?�습?�다.`);
            socket.emit('roomInfo', rooms[roomId]);
            io.emit('updateRoomList', Object.values(rooms).map(r => ({ id: r.id, name: r.name, playerCount: r.players.length, gameStarted: r.gameStarted })));
            io.emit('updatePlayerList', players.filter(p => p.roomId === null));
        }
    });

    socket.on('joinRoom', (roomId) => {
        const room = rooms[roomId];
        const player = players.find(p => p.id === socket.id);
        if (room && player && !room.players.find(p => p.id === player.id)) {
            if (room.gameStarted) {
                socket.emit('error', '?��? 게임???�작??방입?�다.');
                return;
            }
            player.roomId = roomId;
            room.players.push(player);
            socket.join(roomId);
            console.log(`${player.nickname} ?�이 ${room.name} (ID: ${roomId}) 방에 ?�장?�습?�다.`);
            io.to(roomId).emit('roomInfo', room);
            io.emit('updateRoomList', Object.values(rooms).map(r => ({ id: r.id, name: r.name, playerCount: r.players.length, gameStarted: r.gameStarted })));
            io.emit('updatePlayerList', players.filter(p => p.roomId === null));
        } else {
            socket.emit('error', '방이 존재?��? ?�거???�장?????�습?�다.');
        }
    });

    socket.on('startGame', (roomId) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit('error', '방이 존재?��? ?�습?�다.');
            return;
        }
        if (room.gameStarted) {
            socket.emit('error', '?��? 게임???�작?�었?�니??');
            return;
        }
        if (room.players.length < 3) {
            socket.emit('error', '게임 ?�작?�는 최소 3�??�상???�레?�어가 ?�요?�니??');
            return;
        }
        if (wordList.length < 2) {
            socket.emit('error', '게임???�요???�어가 부족합?�다.');
            return;
        }

        console.log(`�?${room.name} (ID: ${roomId}) 게임 ?�작.`);
        room.gameStarted = true;
        room.votes = {}; // ?�표 기록 초기??
        room.turnOrder = [...room.players].sort(() => Math.random() - 0.5).map(p => p.id);
        room.currentPlayerIndex = 0;

        // 1. ?�이???�택
        const liarIndex = Math.floor(Math.random() * room.players.length);
        const liar = room.players[liarIndex];
        room.liar = liar.id;

        // 2. ?��?�??�이?�의 ?�시???�택 (?�로 ?�른 ?�어)
        const wordsCopy = [...wordList];
        const citizenWordIndex = Math.floor(Math.random() * wordsCopy.length);
        const citizenWord = wordsCopy.splice(citizenWordIndex, 1)[0]; // ?�어 ?�나�?뽑아?�고 배열?�서 ?�거
        
        const liarWordIndex = Math.floor(Math.random() * wordsCopy.length);
        const liarWord = wordsCopy[liarWordIndex];

        room.word = citizenWord; // ?��? ?�어�??�???�어�??�??

        // 3. �??�레?�어?�게 ??���??�어 ?�송
        room.players.forEach(p => {
            const playerSocket = io.sockets.sockets.get(p.id);
            if (playerSocket) {
                if (p.id === liar.id) {
                    // ?�이?�에게는 ?�른 ?�어 ?�송
                    playerSocket.emit('gameStart', { role: 'liar', word: liarWord });
                } else {
                    // ?��??�게??같�? ?�어 ?�송
                    playerSocket.emit('gameStart', { role: 'citizen', word: citizenWord });
                }
            }
        });
        io.emit('updateRoomList', Object.values(rooms).map(r => ({ id: r.id, name: r.name, playerCount: r.players.length, gameStarted: r.gameStarted })));

        // �?번째 ???�작
        const firstPlayerId = room.turnOrder[room.currentPlayerIndex];
        const firstPlayer = room.players.find(p => p.id === firstPlayerId);
        io.to(roomId).emit('nextTurn', {
            turn: room.currentPlayerIndex + 1,
            totalTurns: room.players.length,
            currentPlayer: {
                id: firstPlayer.id,
                nickname: firstPlayer.nickname
            }
        });
    }); // <-- ?�락???�기 괄호/?��?콜론???�기???�음

    socket.on('chat', (msg) => {
        const player = players.find(p => p.id === socket.id);
        if (player && player.roomId) {
            io.to(player.roomId).emit('chat', msg);
        }
    });

    socket.on('submitTurn', ({ roomId, message }) => {
        const room = rooms[roomId];
        if (!room || !room.gameStarted) return;

        const player = room.players.find(p => p.id === socket.id);
        if (player && room.turnOrder[room.currentPlayerIndex] === player.id) {
            // ?�재 ?�의 ?�레?�어가 맞는지 ?�인
            io.to(roomId).emit('chat', { nickname: player.nickname, message });

            room.currentPlayerIndex++;

            if (room.currentPlayerIndex >= room.players.length) {
                // 모든 ?�레?�어가 ?�을 마침 -> ?�표 ?�작
                io.to(roomId).emit('startVoting');
            } else {
                // ?�음 ??진행
                const nextPlayerId = room.turnOrder[room.currentPlayerIndex];
                const nextPlayer = room.players.find(p => p.id === nextPlayerId);
                io.to(roomId).emit('nextTurn', {
                    turn: room.currentPlayerIndex + 1,
                    totalTurns: room.players.length,
                    currentPlayer: {
                        id: nextPlayer.id,
                        nickname: nextPlayer.nickname
                    }
                });
            }
        }
    });

    socket.on('vote', ({ roomId, target }) => {
        const room = rooms[roomId];
        const voter = room ? room.players.find(p => p.id === socket.id) : null;

        if (room && voter && !room.votes[voter.id]) {
            room.votes[voter.id] = target; // ?�표 기록
            console.log(`${voter.nickname}?�이 ${target}?�에�??�표?�습?�다.`);

            // 모든 ?�레?�어가 ?�표?�는지 ?�인
            const allVoted = room.players.every(p => room.votes[p.id]);
            if (allVoted) {
                const voteCounts = {};
                for (const vote of Object.values(room.votes)) {
                    voteCounts[vote] = (voteCounts[vote] || 0) + 1;
                }

                let maxVotes = 0;
                let votedPlayerId = null;
                for (const playerId in voteCounts) {
                    if (voteCounts[playerId] > maxVotes) {
                        maxVotes = voteCounts[playerId];
                        votedPlayerId = playerId;
                    }
                }

                let resultMessage = '';
                const liarPlayer = players.find(p => p.id === room.liar);
                const liarName = liarPlayer ? liarPlayer.nickname : 'Unknown';

                if (votedPlayerId === room.liar) {
                    resultMessage = `?�이?��? 찾아?�습?�다! ?�자???��??�니??\n?�이?? ${liarName}`;
                } else {
                    resultMessage = `?�이?��? 찾�? 못했?�니?? ?�자???�이?�입?�다.\n?�이?? ${liarName}`;
                }
                
                io.to(roomId).emit('voteResult', resultMessage);
                // 게임 ?�태 초기???�는 ?�음 ?�운??준�?
                room.gameStarted = false;
                room.liar = null;
                room.word = null;
                room.votes = {};
                io.emit('updateRoomList', Object.values(rooms).map(r => ({ id: r.id, name: r.name, playerCount: r.players.length, gameStarted: r.gameStarted })));
            }
        }
    });

    socket.on('leaveRoom', (roomId) => {
        const player = players.find(p => p.id === socket.id);
        const room = rooms[roomId];

        if (player && room && room.players.some(p => p.id === socket.id)) {
            console.log(`${player.nickname} ?�이 ${room.name} (ID: ${roomId}) 방에???�갔?�니??`);
            
            // 방에???�레?�어 ?�거
            room.players = room.players.filter(p => p.id !== socket.id);
            player.roomId = null;
            socket.leave(roomId);
            socket.emit('leftRoom');

            if (room.players.length === 0) {
                // 방이 비었?�면 ??��
                delete rooms[roomId];
                console.log(`�?${room.name} (ID: ${room.id})??비어????��?�었?�니??`);
            } else {
                // 방장???�갔?�면 ?�로??방장 지??
                if (room.host === socket.id) {
                    room.host = room.players[0].id;
                    console.log(`?�로??방장: ${room.players[0].nickname}`);
                }
                // 방에 ?��? ?�람?�에�??�데?�트???�보 ?�송
                io.to(roomId).emit('roomInfo', room);
            }

            // ?�체 ?�라?�언?�에�?�?목록 �?로비 ?�레?�어 목록 ?�데?�트
            io.emit('updateRoomList', Object.values(rooms).map(r => ({ id: r.id, name: r.name, playerCount: r.players.length, gameStarted: r.gameStarted })));
            io.emit('updatePlayerList', players.filter(p => p.roomId === null));
        }
    });

    socket.on('disconnect', () => {
        const disconnectedPlayer = players.find(player => player.id === socket.id);
        if (disconnectedPlayer) {
            console.log(`${disconnectedPlayer.nickname} ?�이 ?�갔?�니??`);
            if (disconnectedPlayer.roomId && rooms[disconnectedPlayer.roomId]) {
                const room = rooms[disconnectedPlayer.roomId];
                room.players = room.players.filter(p => p.id !== disconnectedPlayer.id);
                if (room.players.length === 0) {
                    delete rooms[disconnectedPlayer.roomId];
                    console.log(`�?${room.name} (ID: ${room.id})??비어????��?�었?�니??`);
                } else {
                    io.to(room.id).emit('roomInfo', room);
                }
                io.emit('updateRoomList', Object.values(rooms).map(r => ({ id: r.id, name: r.name, playerCount: r.players.length, gameStarted: r.gameStarted })));
            }
            players = players.filter(player => player.id !== socket.id);
            io.emit('updatePlayerList', players.filter(p => p.roomId === null));
        } else {
            console.log('?�라?�언???�결 ?�제 (?�네???�음):', socket.id);
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
    console.log(`?�버가 ${PORT}�??�트?�서 ?�행 �?.. (socket.io ?�함)`);
    console.log(`?�속: http://localhost:${PORT}`);
    await testConnection();
});




