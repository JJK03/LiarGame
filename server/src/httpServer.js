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
    res.send('라이어게임 서버가 실행 중입니다!');
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
            message: 'DB 연결 성공!'
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

// socket.io 이벤트 예시
io.on('connection', (socket) => {
    console.log('새 클라이언트 연결:', socket.id);

    // 클라이언트에서 'chat' 이벤트를 보내면 전체에 전달
    socket.on('chat', (msg) => {
        console.log('채팅 메시지:', msg);
        io.emit('chat', msg); // 모든 클라이언트에 메시지 전송
    });

    socket.on('disconnect', () => {
        console.log('클라이언트 연결 해제:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
    console.log(`서버가 ${PORT}번 포트에서 실행 중... (socket.io 포함)`);
    console.log(`접속: http://localhost:${PORT}`);
    await testConnection();
});