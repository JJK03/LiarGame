/**
 * 애플리케이션의 메인 진입점(Entry Point)입니다.
 * 이 파일은 HTTP 서버를 생성하고, Express 앱과 Socket.IO 서버를 초기화하며,
 * 지정된 포트에서 클라이언트의 연결을 수신 대기합니다.
 */

// 필요한 내장 모듈과 직접 만든 모듈들을 가져옵니다.
const http = require('http');           // Node.js의 기본 HTTP 서버 모듈
const app = require('./app');           // Express 앱 설정을 가져옵니다 (./app.js)
const initSocket = require('./socket'); // Socket.IO 서버 초기화 함수를 가져옵니다 (./socket/index.js)
const { testConnection } = require('./db'); // DB 관련 함수들을 가져옵니다.

// Express 앱을 기반으로 HTTP 서버를 생성합니다.
// app은 요청을 처리하는 핸들러 역할을 합니다.
const server = http.createServer(app);

// 생성된 HTTP 서버에 Socket.IO를 연결하여 실시간 통신을 준비합니다.
initSocket(server);

// 서버가 수신 대기할 포트를 설정합니다.
// 환경 변수에 PORT가 지정되어 있으면 그 값을 사용하고, 그렇지 않으면 3001번 포트를 기본값으로 사용합니다.
const PORT = process.env.PORT || 3001;

/**
 * 서버를 시작하는 메인 함수입니다.
 * 비동기 처리를 위해 async 함수로 정의합니다.
 */
const startServer = async () => {
    // 서버 시작 시 데이터베이스 연결을 테스트합니다.
    const dbConnected = await testConnection();

    if (!dbConnected) {
        console.error("DB 연결에 실패하여 서버를 시작할 수 없습니다.");
        process.exit(1); // DB 연결 실패 시 프로세스를 종료합니다.
    }

    // 서버를 시작하고 지정된 포트에서 연결을 수신 대기합니다.
    server.listen(PORT, () => {
        // 서버가 시작되었음을 콘솔에 알립니다.
        console.log(`서버가 ${PORT}번 포트에서 실행 중...`);
        console.log(`클라이언트 접속 주소: http://localhost:3001`);
        console.log(`서버 접속 주소: http://localhost:${PORT}`);
    });
}

// 서버 시작 함수를 호출합니다.
startServer();
