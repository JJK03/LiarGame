/**
 * Socket.IO 서버를 초기화하고 설정하는 파일입니다.
 * HTTP 서버 인스턴스를 받아 Socket.IO를 연결하고,
 * 클라이언트의 연결 및 연결 해제 이벤트를 처리합니다.
 */

// Socket.IO 라이브러리와 이벤트 핸들러 모듈을 가져옵니다.
const { Server } = require('socket.io');
const { registerEventHandlers, handleDisconnect } = require('./eventHandlers');

/**
 * Socket.IO 서버를 설정하고 시작합니다.
 * @param {object} httpServer - Node.js http 서버 인스턴스
 */
const initSocket = (httpServer) => {
    // http 서버에 Socket.IO 서버를 연결합니다.
    // CORS 설정을 통해 클라이언트의 접근을 제어합니다.
    const io = new Server(httpServer, {
        cors: {
            origin: '*', // 모든 출처에서의 연결을 허용합니다. 배포 시에는 특정 도메인으로 제한하는 것이 좋습니다.
            methods: ['GET', 'POST'] // 허용할 HTTP 메소드를 지정합니다.
        }
    });

    // 'connection' 이벤트는 새로운 클라이언트가 서버에 연결될 때마다 발생합니다.
    io.on('connection', (socket) => {
        console.log('새 클라이언트 연결:', socket.id);

        // eventHandlers.js에 정의된 모든 게임 관련 이벤트 핸들러를 현재 소켓에 등록합니다.
        registerEventHandlers(io, socket);

        // 'disconnect' 이벤트는 클라이언트의 연결이 끊어졌을 때 발생합니다.
        socket.on('disconnect', () => {
            // eventHandlers.js에 정의된 연결 해제 핸들러를 호출합니다.
            handleDisconnect(io, socket);
        });
    });

    console.log('Socket.IO 서버가 준비되었습니다.');
    return io;
};

// initSocket 함수를 다른 파일에서 사용할 수 있도록 내보냅니다.
module.exports = initSocket;
