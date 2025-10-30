const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL 연결 풀 생성
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// 연결 테스트 함수
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL 연결 성공! ✨');
        connection.release();
        return true;
    } catch (err) {
        console.error('MySQL 연결 실패:', err);
        return false;
    }
}

module.exports = { pool, testConnection };