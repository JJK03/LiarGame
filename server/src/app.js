/**
 * Express 애플리케이션을 설정하고 구성하는 파일입니다.
 * 이 파일에서는 미들웨어 설정, API 라우트 정의 등을 담당합니다.
 * HTTP 서버의 기본적인 로직이 여기에 포함됩니다.
 */

// 필요한 모듈들을 가져옵니다.
const express = require('express'); // Node.js 웹 프레임워크
const cors = require('cors');       // Cross-Origin Resource Sharing을 위한 미들웨어
const { pool } = require('./db');   // 데이터베이스 연결 풀

// Express 애플리케이션 인스턴스를 생성합니다.
const app = express();

// --- 미들웨어 설정 ---

// CORS 미들웨어를 사용합니다.
// 클라이언트(예: 웹 브라우저)가 다른 도메인에서 오는 요청을 서버가 허용하도록 설정합니다.
// 개발 중에는 모든 출처를 허용('*')하는 것이 편리할 수 있습니다.
app.use(cors());

// express.json() 미들웨어를 사용합니다.
// 클라이언트가 보낸 JSON 형식의 요청 본문(body)을 서버가 파싱하여
// req.body 객체에서 쉽게 사용할 수 있도록 만들어줍니다.
app.use(express.json());


// --- 라우트(Routes) 정의 ---

// 1. 루트 라우트 ('/')
// 서버의 기본 주소로 GET 요청이 왔을 때 응답합니다.
// 서버가 잘 작동하고 있는지 간단히 확인하는 용도로 사용할 수 있습니다.
app.get('/', (req, res) => {
    res.send('라이어게임 서버 실행 중');
});

// 2. 상태 확인 라우트 ('/health')
// 서버의 상태를 JSON 형식으로 응답합니다.
// 주로 서비스의 상태를 모니터링하는 용도로 사용됩니다.
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// 3. 데이터베이스 연결 테스트 라우트 ('/db-test')
// 서버가 데이터베이스에 성공적으로 연결되었는지 확인하는 비동기 라우트입니다.
app.get('/db-test', async (req, res) => {
    try {
        // db.js에서 가져온 pool을 사용해 간단한 쿼리를 실행합니다.
        // 'SELECT 1 + 1 AS result'는 DB가 계산을 수행할 수 있는지 확인하는 간단한 방법입니다.
        const [result] = await pool.query('SELECT 1 + 1 AS result');
        
        // 쿼리가 성공하면 성공 메시지와 결과를 JSON으로 응답합니다.
        res.json({ 
            ok: true, 
            result: result[0].result,
            message: 'DB 연결 성공'
        });
    } catch (err) {
        // 쿼리 실행 중 오류가 발생하면 500 서버 오류 상태 코드와 함께 실패 메시지를 응답합니다.
        console.error('DB 연결 테스트 실패:', err);
        res.status(500).json({ 
            ok: false, 
            message: 'DB 연결 실패' 
        });
    }
});

// 설정이 완료된 Express 앱 인스턴스를 다른 파일에서 사용할 수 있도록 내보냅니다.
module.exports = app;
