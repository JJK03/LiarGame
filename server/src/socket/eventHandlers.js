/**
 * 이 파일은 모든 Socket.IO 이벤트 핸들러를 정의합니다.
 * 'connection' 이벤트가 발생했을 때, 이 파일의 함수들이
 * 각 소켓의 개별 이벤트(예: 'join', 'createRoom' 등)를 처리합니다.
 */

// 상태 관리 모듈과 단어 목록을 가져옵니다.
const state = require('../game/state');
const wordList = require('../game/wordList');

/**
 * 클라이언트로부터 받은 이벤트를 처리하는 핸들러들을 등록하는 함수입니다.
 * @param {object} io - Socket.IO 서버 인스턴스
 * @param {object} socket - 개별 클라이언트와의 연결을 나타내는 소켓 객체
 */
const registerEventHandlers = (io, socket) => {

    /**
     * 'join' 이벤트 핸들러
     * 클라이언트가 처음 접속하여 닉네임을 제출했을 때 호출됩니다.
     * 플레이어 정보를 생성하고 로비에 입장시킵니다.
     */
    socket.on('join', (nickname) => {
        console.log(`${nickname} 님이 접속했습니다. (ID: ${socket.id})`);
        
        // 새 플레이어 객체 생성
        const newPlayer = { id: socket.id, nickname: nickname, roomId: null };
        state.addPlayer(newPlayer);
        
        // 로비에 있는 모든 클라이언트에게 최신 플레이어 목록을 전송하여 UI를 업데이트합니다.
        io.emit('updatePlayerList', state.getLobbyPlayers());
        
        // 새로 접속한 클라이언트에게만 현재 생성된 방 목록을 전송합니다.
        socket.emit('updateRoomList', state.getAllRooms());
    });

    /**
     * 'createRoom' 이벤트 핸들러
     * 클라이언트가 새 방 생성을 요청했을 때 호출됩니다.
     */
    socket.on('createRoom', (roomName) => {
        const player = state.getPlayer(socket.id);
        if (player) {
            // 새 방을 생성하고 플레이어를 방장으로 설정
            const newRoom = state.createRoom(roomName, player);
            
            // 소켓을 해당 방의 채널에 조인시킵니다.
            socket.join(newRoom.id);
            console.log(`${player.nickname} 님이 ${roomName} (ID: ${newRoom.id}) 방을 생성했습니다.`);
            
            // 방을 생성한 클라이언트에게 방 정보를 전송합니다.
            socket.emit('roomInfo', newRoom);
            
            // 모든 클라이언트에게 최신 방 목록과 로비 플레이어 목록을 전송합니다.
            io.emit('updateRoomList', state.getAllRooms());
            io.emit('updatePlayerList', state.getLobbyPlayers());
        }
    });

    /**
     * 'joinRoom' 이벤트 핸들러
     * 클라이언트가 기존 방 입장을 요청했을 때 호출됩니다.
     */
    socket.on('joinRoom', (roomId) => {
        const room = state.getRoom(roomId);
        const player = state.getPlayer(socket.id);

        if (room && player && !room.players.find(p => p.id === player.id)) {
            // 게임이 이미 시작된 방에는 입장할 수 없습니다.
            if (room.gameStarted) {
                socket.emit('error', '이미 게임이 시작된 방입니다.');
                return;
            }
            
            player.roomId = roomId;
            room.players.push(player);
            socket.join(roomId);
            console.log(`${player.nickname} 님이 ${room.name} (ID: ${roomId}) 방에 입장했습니다.`);
            
            // 해당 방에 있는 모든 클라이언트에게 최신 방 정보를 전송합니다.
            io.to(roomId).emit('roomInfo', room);
            
            // 모든 클라이언트에게 최신 방 목록과 로비 플레이어 목록을 전송합니다.
            io.emit('updateRoomList', state.getAllRooms());
            io.emit('updatePlayerList', state.getLobbyPlayers());
        } else {
            socket.emit('error', '방이 존재하지 않거나 입장할 수 없습니다.');
        }
    });

    /**
     * 'startGame' 이벤트 핸들러
     * 방장이 게임 시작을 요청했을 때 호출됩니다.
     */
    socket.on('startGame', (roomId) => {
        const room = state.getRoom(roomId);
        // 유효성 검사
        if (!room) return socket.emit('error', '방이 존재하지 않습니다.');
        if (room.host !== socket.id) return socket.emit('error', '방장만 게임을 시작할 수 있습니다.');
        if (room.gameStarted) return socket.emit('error', '이미 게임이 시작되었습니다.');
        if (room.players.length < 3) return socket.emit('error', '게임 시작에는 최소 3명 이상의 플레이어가 필요합니다.');
        if (wordList.length < 2) return socket.emit('error', '게임에 필요한 단어가 부족합니다.');

        console.log(`방 ${room.name} (ID: ${roomId}) 게임 시작.`);
        
        // 게임 상태 초기화 및 설정
        room.gameStarted = true;
        room.votes = {};
        room.turnOrder = [...room.players].sort(() => Math.random() - 0.5).map(p => p.id);
        room.currentPlayerIndex = 0;
        room.round = 1;

        // 1. 라이어 선택
        const liarIndex = Math.floor(Math.random() * room.players.length);
        const liar = room.players[liarIndex];
        room.liar = liar.id;

        // 2. 시민과 라이어의 제시어 선택 (서로 다른 단어)
        const wordsCopy = [...wordList];
        const citizenWordIndex = Math.floor(Math.random() * wordsCopy.length);
        const citizenWord = wordsCopy.splice(citizenWordIndex, 1)[0];
        const liarWordIndex = Math.floor(Math.random() * wordsCopy.length);
        const liarWord = wordsCopy[liarWordIndex];
        room.word = citizenWord; // 시민 단어를 대표 단어로 저장

        // 3. 각 플레이어에게 역할과 단어 전송
        room.players.forEach(p => {
            const playerSocket = io.sockets.sockets.get(p.id);
            if (playerSocket) {
                const role = (p.id === liar.id) ? 'liar' : 'citizen';
                const word = (p.id === liar.id) ? liarWord : citizenWord;
                playerSocket.emit('gameStart', { role, word });
            }
        });

        // 방 목록 상태 변경(게임 중)을 모든 클라이언트에게 알림
        io.emit('updateRoomList', state.getAllRooms());

        // 첫 번째 턴 시작 알림
        const firstPlayerId = room.turnOrder[room.currentPlayerIndex];
        const firstPlayer = state.getPlayer(firstPlayerId);
        io.to(roomId).emit('nextTurn', {
            round: room.round,
            turn: room.currentPlayerIndex + 1,
            totalTurns: room.players.length,
            currentPlayer: { id: firstPlayer.id, nickname: firstPlayer.nickname }
        });
    });

    /**
     * 'submitTurn' 이벤트 핸들러
     * 플레이어가 자신의 턴에 설명을 제출했을 때 호출됩니다.
     */
    socket.on('submitTurn', ({ roomId, message }) => {
        const room = state.getRoom(roomId);
        if (!room || !room.gameStarted) return;

        const player = state.getPlayer(socket.id);
        // 현재 턴인 플레이어만 설명을 제출할 수 있습니다.
        if (player && room.turnOrder[room.currentPlayerIndex] === player.id) {
            io.to(roomId).emit('chat', { nickname: player.nickname, message });

            room.currentPlayerIndex++;

            if (room.currentPlayerIndex >= room.players.length) {
                // 모든 플레이어가 설명을 마쳤으면 1라운드 종료를 알림
                io.to(roomId).emit('firstRoundEnd', { round: room.round });
            } else {
                // 다음 플레이어의 턴을 알림
                const nextPlayerId = room.turnOrder[room.currentPlayerIndex];
                const nextPlayer = state.getPlayer(nextPlayerId);
                io.to(roomId).emit('nextTurn', {
                    round: room.round,
                    turn: room.currentPlayerIndex + 1,
                    totalTurns: room.players.length,
                    currentPlayer: { id: nextPlayer.id, nickname: nextPlayer.nickname }
                });
            }
        }
    });

    /**
     * 'requestVoting' 이벤트 핸들러
     * 방장이 투표 시작을 요청했을 때 호출됩니다.
     */
    socket.on('requestVoting', ({ roomId }) => {
        const room = state.getRoom(roomId);
        if (room && room.host === socket.id) {
            console.log(`방 ${room.name} (ID: ${roomId}) 투표 시작.`);
            io.to(roomId).emit('startVoting');
        }
    });

    /**
     * 'requestSecondRound' 이벤트 핸들러
     * 방장이 추가 라운드(2라운드) 진행을 요청했을 때 호출됩니다.
     */
    socket.on('requestSecondRound', ({ roomId }) => {
        const room = state.getRoom(roomId);
        if (room && room.host === socket.id) {
            console.log(`방 ${room.name} (ID: ${roomId}) 추가 라운드 시작.`);
            room.round++;
            room.currentPlayerIndex = 0;
            // 턴 순서를 다시 섞습니다.
            room.turnOrder = [...room.players].sort(() => Math.random() - 0.5).map(p => p.id);

            const firstPlayerId = room.turnOrder[room.currentPlayerIndex];
            const firstPlayer = state.getPlayer(firstPlayerId);
            io.to(roomId).emit('nextTurn', {
                round: room.round,
                turn: room.currentPlayerIndex + 1,
                totalTurns: room.players.length,
                currentPlayer: { id: firstPlayer.id, nickname: firstPlayer.nickname }
            });
        }
    });

    /**
     * 'vote' 이벤트 핸들러
     * 플레이어가 라이어로 의심되는 사람에게 투표했을 때 호출됩니다.
     */
    socket.on('vote', ({ roomId, target }) => {
        const room = state.getRoom(roomId);
        const voter = room ? state.getPlayer(socket.id) : null;

        // 이미 투표했는지 확인
        if (room && voter && !room.votes[voter.id]) {
            room.votes[voter.id] = target;
            console.log(`${voter.nickname}님이 ${target}님에게 투표했습니다.`);

            // 모든 플레이어가 투표했는지 확인
            const allVoted = room.players.every(p => room.votes[p.id]);
            if (allVoted) {
                // 투표 결과 집계
                const voteCounts = Object.values(room.votes).reduce((acc, voteTarget) => {
                    acc[voteTarget] = (acc[voteTarget] || 0) + 1;
                    return acc;
                }, {});

                // 최다 득표자 찾기
                let maxVotes = 0;
                let votedPlayerId = null;
                for (const playerId in voteCounts) {
                    if (voteCounts[playerId] > maxVotes) {
                        maxVotes = voteCounts[playerId];
                        votedPlayerId = playerId;
                    }
                }

                const liarPlayer = state.getPlayer(room.liar);
                const liarName = liarPlayer ? liarPlayer.nickname : 'Unknown';
                let resultMessage = '';

                if (votedPlayerId === room.liar) {
                    resultMessage = `라이어를 찾아냈습니다! 승자는 시민입니다. (라이어: ${liarName})`;
                } else {
                    resultMessage = `라이어를 찾지 못했습니다. 승자는 라이어입니다. (라이어: ${liarName})`;
                }
                
                io.to(roomId).emit('voteResult', resultMessage);
                
                // 게임 상태 초기화
                room.gameStarted = false;
                room.liar = null;
                room.word = null;
                room.votes = {};
                
                // 방 목록 및 방 정보 업데이트
                io.emit('updateRoomList', state.getAllRooms());
                io.to(roomId).emit('roomInfo', room);
            }
        }
    });

    /**
     * 'leaveRoom' 이벤트 핸들러
     * 플레이어가 방을 나갈 때 호출됩니다.
     */
    socket.on('leaveRoom', (roomId) => {
        const player = state.getPlayer(socket.id);
        const room = state.getRoom(roomId);

        if (player && room && room.players.some(p => p.id === socket.id)) {
            console.log(`${player.nickname} 님이 ${room.name} (ID: ${roomId}) 방에서 나갔습니다.`);

            // 게임 중에 나가면 게임을 종료시킴
            if (room.gameStarted) {
                io.to(roomId).emit('gameTerminated', '플레이어가 방을 나가 게임이 종료되었습니다.');
                room.gameStarted = false; // 상태 초기화
                room.liar = null;
                room.word = null;
                room.votes = {};
            }
            
            // 방에서 플레이어 제거
            room.players = room.players.filter(p => p.id !== socket.id);
            player.roomId = null;
            socket.leave(roomId);
            socket.emit('leftRoom'); // 나간 플레이어에게 확인 메시지

            if (room.players.length === 0) {
                // 방이 비었으면 삭제
                state.removeRoom(roomId);
                console.log(`방 ${room.name} (ID: ${room.id})이 비어서 삭제되었습니다.`);
            } else {
                // 방장이 나갔으면 새로운 방장 지정
                if (room.host === socket.id) {
                    room.host = room.players[0].id;
                    const newHost = state.getPlayer(room.host);
                    console.log(`새로운 방장: ${newHost.nickname}`);
                }
                io.to(roomId).emit('roomInfo', room);
            }

            // 전체 클라이언트에게 방 목록 및 로비 플레이어 목록 업데이트
            io.emit('updateRoomList', state.getAllRooms());
            io.emit('updatePlayerList', state.getLobbyPlayers());
        }
    });

    /**
     * 'chat' 이벤트 핸들러
     * 클라이언트가 채팅 메시지를 보냈을 때 호출됩니다.
     */
    socket.on('chat', (msg) => {
        const player = state.getPlayer(socket.id);
        if (player && player.roomId) {
            // 같은 방에 있는 모든 클라이언트에게 메시지 전송
            io.to(player.roomId).emit('chat', msg);
        }
    });
};

/**
 * 'disconnect' 이벤트 핸들러
 * 클라이언트의 연결이 끊어졌을 때 호출됩니다.
 * @param {object} io - Socket.IO 서버 인스턴스
 * @param {object} socket - 연결이 끊어진 클라이언트의 소켓 객체
 */
const handleDisconnect = (io, socket) => {
    const disconnectedPlayer = state.removePlayer(socket.id);
    
    if (disconnectedPlayer) {
        console.log(`${disconnectedPlayer.nickname} 님이 나갔습니다.`);
        
        // 플레이어가 방에 있었다면 해당 방 처리
        if (disconnectedPlayer.roomId) {
            const room = state.getRoom(disconnectedPlayer.roomId);
            if (room) {
                // 게임 중에 접속이 끊기면 게임 종료
                if (room.gameStarted) {
                    io.to(room.id).emit('gameTerminated', '플레이어의 접속이 끊겨 게임이 종료되었습니다.');
                    room.gameStarted = false;
                    room.liar = null;
                    room.word = null;
                    room.votes = {};
                }

                // 방에서 플레이어 제거
                room.players = room.players.filter(p => p.id !== socket.id);

                if (room.players.length === 0) {
                    // 방이 비었으면 삭제
                    state.removeRoom(disconnectedPlayer.roomId);
                    console.log(`방 ${room.name} (ID: ${room.id})이 비어서 삭제되었습니다.`);
                } else {
                    // 방장이 나갔으면 새로운 방장 지정
                    if (room.host === socket.id) {
                        room.host = room.players[0].id;
                        const newHost = state.getPlayer(room.host);
                        console.log(`새로운 방장: ${newHost.nickname}`);
                    }
                    io.to(room.id).emit('roomInfo', room);
                }
                io.emit('updateRoomList', state.getAllRooms());
            }
        }
        // 로비 플레이어 목록 업데이트
        io.emit('updatePlayerList', state.getLobbyPlayers());
    } else {
        console.log('클라이언트 연결 해제 (닉네임 없음):', socket.id);
    }
};

module.exports = {
    registerEventHandlers,
    handleDisconnect,
};
