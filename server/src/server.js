/**
 * 애플리케이션의 메인 진입점(Entry Point)입니다.
 * 이 파일은 HTTP 서버를 생성하고, Express 앱과 Socket.IO 서버를 초기화하며,
 * 지정된 포트에서 클라이언트의 연결을 수신 대기합니다.
 */

// 필요한 내장 모듈과 직접 만든 모듈들을 가져옵니다.
const http = require('http');           // Node.js의 기본 HTTP 서버 모듈
const app = require('./app');           // Express 앱 설정을 가져옵니다 (./app.js)
const initSocket = require('./socket'); // Socket.IO 서버 초기화 함수를 가져옵니다 (./socket/index.js)
const { testConnection } = require('./db'); // 데이터베이스 연결 테스트 함수를 가져옵니다 (./db.js)

// Express 앱을 기반으로 HTTP 서버를 생성합니다.
// app은 요청을 처리하는 핸들러 역할을 합니다.
const server = http.createServer(app);

// 생성된 HTTP 서버에 Socket.IO를 연결하여 실시간 통신을 준비합니다.
initSocket(server);

// 서버가 수신 대기할 포트를 설정합니다.
// 환경 변수에 PORT가 지정되어 있으면 그 값을 사용하고, 그렇지 않으면 3001번 포트를 기본값으로 사용합니다.
const PORT = process.env.PORT || 3001;

// 서버를 시작하고 지정된 포트에서 연결을 수신 대기합니다.
// 서버가 성공적으로 시작되면 콜백 함수가 실행됩니다.
server.listen(PORT, async () => {
    // 서버가 시작되었음을 콘솔에 알립니다.
    console.log(`서버가 ${PORT}번 포트에서 실행 중...`);
    console.log(`클라이언트 접속 주소: http://localhost:3001`);
    console.log(`서버 접속 주소: http://localhost:${PORT}`);
    
    // 서버 시작 시 데이터베이스 연결을 테스트합니다.
    // testConnection 함수는 DB 연결 성공 또는 실패 메시지를 콘솔에 출력합니다.
    await testConnection();
});
