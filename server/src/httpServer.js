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

// socket.io 연결 및 이벤트 처리
io.on('connection', (socket) => {
    console.log('새 클라이언트 연결:', socket.id);

    // [신규] 'join' 이벤트 처리 (클라이언트가 닉네임과 함께 접속 요청)
    socket.on('join', (nickname) => {
        console.log(`${nickname} 님이 접속했습니다.`);

        // 플레이어 정보 객체 생성
        const newPlayer = {
            id: socket.id, // 각 클라이언트를 구분하는 고유 ID
            nickname: nickname
        };

        // players 배열에 새로운 플레이어 추가
        players.push(newPlayer);

        // 모든 클라이언트에게 최신 플레이어 목록 전송
        io.emit('updatePlayerList', players);
    });

    // 클라이언트에서 'chat' 이벤트를 보내면 전체에 전달
    socket.on('chat', (msg) => {
        console.log('채팅 메시지:', msg);
        io.emit('chat', msg); // 모든 클라이언트에 메시지 전송
    });

    // [수정] 'disconnect' 이벤트 처리 (클라이언트 연결 해제)
    socket.on('disconnect', () => {
        // players 배열에서 연결이 끊긴 플레이어 찾기
        const disconnectedPlayer = players.find(player => player.id === socket.id);
        
        if (disconnectedPlayer) {
            console.log(`${disconnectedPlayer.nickname} 님이 나갔습니다.`);
            // 해당 플레이어를 제외한 새로운 배열 생성
            players = players.filter(player => player.id !== socket.id);
            
            // 모든 클라이언트에게 최신 플레이어 목록 전송
            io.emit('updatePlayerList', players);
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