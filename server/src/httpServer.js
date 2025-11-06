// TODO: 방장 외에 게임시작 버튼 없애기, 한 번씩 발언하고 애매하면 한 번씩 더 발언하게 하기(라운드제?)

const express = require('express');
const { pool, testConnection } = require('./db');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

// 루트 라우트 (메인 페이지 안내)
app.get('/', (req, res) => {
    res.send('라이어게임 서버 실행 중');
});

// 기본 라우트
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// DB 연결 테스트 라우트
app.get('/db-test', async (req, res) => {
    try {
        const [result] = await pool.query('SELECT 1 + 1 AS result');
        res.json({ 
            ok: true, 
            result: result[0].result,
            message: 'DB 연결 성공'
        });
    } catch (err) {
        res.status(500).json({ 
            ok: false, 
            message: 'DB 연결 실패' 
        });
    }
});

// HTTP 서버와 socket.io 서버 생성
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // 개발 중에는 전체 허용, 배포 시에는 도메인 지정
        methods: ['GET', 'POST']
    }
});

// 서버에 접속한 플레이어 목록을 저장할 배열
let players = [];
// 게임 방 목록을 저장할 객체
let rooms = {};
let nextRoomId = 1; // 다음 방 ID를 위한 카운터
// 게임에 사용할 단어 목록
const wordList = ['사과', '바나나', '딸기', '오렌지', '포도', '수박', '파인애플', '멜론'];

// socket.io 연결 및 이벤트 처리
io.on('connection', (socket) => {
    console.log('새 클라이언트 연결:', socket.id);

    socket.on('join', (nickname) => {
        console.log(`${nickname} 님이 접속했습니다.`);
        const newPlayer = { id: socket.id, nickname: nickname, roomId: null };
        players.push(newPlayer);
        
        // 로비에 있는 모든 사람에게 최신 플레이어 목록 전송
        io.emit('updatePlayerList', players.filter(p => p.roomId === null));
        
        // 새로 접속한 사람에게만 현재 방 목록 전송
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
                votes: {}, // 투표 기록 객체 추가
                host: player.id, // 방장 ID 저장
                turnOrder: [],
                currentPlayerIndex: 0
            };
            socket.join(roomId);
            console.log(`${player.nickname} 님이 ${roomName} (ID: ${roomId}) 방을 생성했습니다.`);
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
                socket.emit('error', '이미 게임이 시작된 방입니다.');
                return;
            }
            player.roomId = roomId;
            room.players.push(player);
            socket.join(roomId);
            console.log(`${player.nickname} 님이 ${room.name} (ID: ${roomId}) 방에 입장했습니다.`);
            io.to(roomId).emit('roomInfo', room);
            io.emit('updateRoomList', Object.values(rooms).map(r => ({ id: r.id, name: r.name, playerCount: r.players.length, gameStarted: r.gameStarted })));
            io.emit('updatePlayerList', players.filter(p => p.roomId === null));
        } else {
            socket.emit('error', '방이 존재하지 않거나 입장할 수 없습니다.');
        }
    });

    socket.on('startGame', (roomId) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit('error', '방이 존재하지 않습니다.');
            return;
        }
        if (room.gameStarted) {
            socket.emit('error', '이미 게임이 시작되었습니다.');
            return;
        }
        if (room.players.length < 3) {
            socket.emit('error', '게임 시작에는 최소 3명 이상의 플레이어가 필요합니다.');
            return;
        }
        if (wordList.length < 2) {
            socket.emit('error', '게임에 필요한 단어가 부족합니다.');
            return;
        }

        console.log(`방 ${room.name} (ID: ${roomId}) 게임 시작.`);
        room.gameStarted = true;
        room.votes = {}; // 투표 기록 초기화
        room.turnOrder = [...room.players].sort(() => Math.random() - 0.5).map(p => p.id);
        room.currentPlayerIndex = 0;

        // 1. 라이어 선택
        const liarIndex = Math.floor(Math.random() * room.players.length);
        const liar = room.players[liarIndex];
        room.liar = liar.id;

        // 2. 시민과 라이어의 제시어 선택 (서로 다른 단어)
        const wordsCopy = [...wordList];
        const citizenWordIndex = Math.floor(Math.random() * wordsCopy.length);
        const citizenWord = wordsCopy.splice(citizenWordIndex, 1)[0]; // 단어 하나를 뽑아내고 배열에서 제거
        
        const liarWordIndex = Math.floor(Math.random() * wordsCopy.length);
        const liarWord = wordsCopy[liarWordIndex];

        room.word = citizenWord; // 시민 단어를 대표 단어로 저장

        // 3. 각 플레이어에게 역할과 단어 전송
        room.players.forEach(p => {
            const playerSocket = io.sockets.sockets.get(p.id);
            if (playerSocket) {
                if (p.id === liar.id) {
                    // 라이어에게는 다른 단어 전송
                    playerSocket.emit('gameStart', { role: 'liar', word: liarWord });
                } else {
                    // 시민에게는 같은 단어 전송
                    playerSocket.emit('gameStart', { role: 'citizen', word: citizenWord });
                }
            }
        });
        io.emit('updateRoomList', Object.values(rooms).map(r => ({ id: r.id, name: r.name, playerCount: r.players.length, gameStarted: r.gameStarted })));

        // 첫 번째 턴 시작
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
    }); // <-- 누락된 닫기 괄호/세미콜론을 여기서 닫음

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
            // 현재 턴의 플레이어가 맞는지 확인
            io.to(roomId).emit('chat', { nickname: player.nickname, message });

            room.currentPlayerIndex++;

            if (room.currentPlayerIndex >= room.players.length) {
                // 모든 플레이어가 턴을 마침 -> 투표 시작
                io.to(roomId).emit('startVoting');
            } else {
                // 다음 턴 진행
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
            room.votes[voter.id] = target; // 투표 기록
            console.log(`${voter.nickname}님이 ${target}님에게 투표했습니다.`);

            // 모든 플레이어가 투표했는지 확인
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
                    resultMessage = `라이어를 찾아냈습니다! 승자는 시민입니다. (라이어: ${liarName})`;
                } else {
                    resultMessage = `라이어를 찾지 못했습니다. 승자는 라이어입니다. (라이어: ${liarName})`;
                }
                
                io.to(roomId).emit('voteResult', resultMessage);
                
                // 게임 상태 초기화 또는 다음 라운드 준비
                room.gameStarted = false;
                room.liar = null;
                room.word = null;
                room.votes = {};
                io.emit('updateRoomList', Object.values(rooms).map(r => ({ id: r.id, name: r.name, playerCount: r.players.length, gameStarted: r.gameStarted })));
            }
        }
    });

    socket.on('disconnect', () => {
        const disconnectedPlayer = players.find(player => player.id === socket.id);
        if (disconnectedPlayer) {
            console.log(`${disconnectedPlayer.nickname} 님이 나갔습니다.`);
            if (disconnectedPlayer.roomId && rooms[disconnectedPlayer.roomId]) {
                const room = rooms[disconnectedPlayer.roomId];
                room.players = room.players.filter(p => p.id !== disconnectedPlayer.id);
                if (room.players.length === 0) {
                    delete rooms[disconnectedPlayer.roomId];
                    console.log(`방 ${room.name} (ID: ${room.id})이 비어서 삭제되었습니다.`);
                } else {
                    io.to(room.id).emit('roomInfo', room);
                }
                io.emit('updateRoomList', Object.values(rooms).map(r => ({ id: r.id, name: r.name, playerCount: r.players.length, gameStarted: r.gameStarted })));
            }
            players = players.filter(player => player.id !== socket.id);
            io.emit('updatePlayerList', players.filter(p => p.roomId === null));
        } else {
            console.log('클라이언트 연결 해제 (닉네임 없음):', socket.id);
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
    console.log(`서버가 ${PORT}번 포트에서 실행 중... (socket.io 포함)`);
    console.log(`접속: http://localhost:${PORT}`);
    await testConnection();
});
