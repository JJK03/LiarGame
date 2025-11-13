/**
 * 서버의 전체 상태를 중앙에서 관리합니다.
 * 이 파일은 현재 접속 중인 플레이어, 생성된 게임 방 등
 * 애플리케이션의 메모리에 저장되는 모든 데이터를 포함합니다.
 * 상태를 한 곳에서 관리하면 데이터의 일관성을 유지하고 추적하기 쉬워집니다.
 */

// 서버에 접속한 모든 플레이어의 정보를 저장하는 배열
// 예: [{ id: 'socket.id', nickname: '유저1', roomId: 1 }, ...]
const players = [];

// 생성된 모든 게임 방의 정보를 저장하는 객체
// 키는 roomId, 값은 방의 상세 정보입니다.
// 예: { 1: { id: 1, name: '즐겜방', players: [...], gameStarted: false, ... } }
const rooms = {};

// 새로운 방이 생성될 때마다 1씩 증가하는 카운터
// 고유한 방 ID를 부여하기 위해 사용됩니다。
let nextRoomId = 1;

/**
 * 새로운 플레이어를 'players' 배열에 추가합니다。
 * @param {object} player - 추가할 플레이어 객체 { id, nickname, roomId }
 */
const addPlayer = (player) => {
    players.push(player);
};

/**
 * ID를 기반으로 'players' 배열에서 플레이어를 찾습니다.
 * @param {string} socketId - 찾을 플레이어의 소켓 ID
 * @returns {object | undefined} - 찾은 플레이어 객체 또는 undefined
 */
const getPlayer = (socketId) => {
    return players.find(p => p.id === socketId);
};

/**
 * ID를 기반으로 'players' 배열에서 플레이어를 제거합니다.
 * @param {string} socketId - 제거할 플레이어의 소켓 ID
 * @returns {object | undefined} - 제거된 플레이어 객체 또는 undefined
 */
const removePlayer = (socketId) => {
    const index = players.findIndex(p => p.id === socketId);
    if (index !== -1) {
        return players.splice(index, 1)[0];
    }
};

/**
 * 'players' 배열에서 현재 로비에 있는 (방에 들어가지 않은) 플레이어 목록을 반환합니다.
 * @returns {Array<object>} - 로비에 있는 플레이어 목록
 */
const getLobbyPlayers = () => {
    return players.filter(p => p.roomId === null);
};

/**
 * 새로운 방을 'rooms' 객체에 추가하고, 방 ID를 1 증가시킵니다.
 * @param {string} roomName - 생성할 방의 이름
 * @param {object} hostPlayer - 방을 생성한 플레이어 (방장)
 * @returns {object} - 생성된 방 객체
 */
const createRoom = (roomName, hostPlayer) => {
    const roomId = nextRoomId++;
    const newRoom = {
        id: roomId,
        name: roomName,
        players: [hostPlayer],
        gameStarted: false,
        word: null,
        liar: null,
        votes: {},
        host: hostPlayer.id,
        turnOrder: [],
        currentPlayerIndex: 0,
        round: 1,
    };
    rooms[roomId] = newRoom;
    hostPlayer.roomId = roomId;
    return newRoom;
};

/**
 * ID를 기반으로 'rooms' 객체에서 방을 찾습니다.
 * @param {number} roomId - 찾을 방의 ID
 * @returns {object | undefined} - 찾은 방 객체 또는 undefined
 */
const getRoom = (roomId) => {
    return rooms[roomId];
};

/**
 * ID를 기반으로 'rooms' 객체에서 방을 삭제합니다.
 * @param {number} roomId - 삭제할 방의 ID
 */
const removeRoom = (roomId) => {
    delete rooms[roomId];
};

/**
 * 모든 방의 목록을 요약된 정보와 함께 반환합니다.
 * 클라이언트에게 전체 방 목록을 업데이트할 때 사용됩니다.
 * @returns {Array<object>} - 모든 방의 요약 정보 목록
 */
const getAllRooms = () => {
    return Object.values(rooms).map(r => ({
        id: r.id,
        name: r.name,
        playerCount: r.players.length,
        gameStarted: r.gameStarted
    }));
};


// 다른 파일에서 이 상태 변수들과 함수들을 사용할 수 있도록 내보냅니다.
module.exports = {
    players, // 직접 접근이 필요할 경우를 위해 players 배열도 내보냅니다.
    rooms,   // rooms 객체도 내보냅니다.
    addPlayer,
    getPlayer,
    removePlayer,
    getLobbyPlayers,
    createRoom,
    getRoom,
    removeRoom,
    getAllRooms,
};
