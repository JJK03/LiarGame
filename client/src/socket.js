import { io } from 'socket.io-client';

// 서버 주소
const URL = 'http://localhost:3001';
export const socket = io(URL);
