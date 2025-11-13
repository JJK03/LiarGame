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
        console.log('MySQL 연결 성공');
        connection.release();
        return true;
    } catch (err) {
        console.error('MySQL 연결 실패:', err);
        return false;
    }
}

/**
 * 새 게임을 위한 카테고리와 단어 2개를 DB에서 가져옵니다.
 * 1. DB에 있는 모든 카테고리 중 하나를 무작위로 선택합니다.
 * 2. 해당 카테고리에 속한 단어 중 2개를 무작위로 선택합니다.
 * 3. 카테고리, 시민 단어, 라이어 단어를 반환합니다.
 * @returns {Promise<{category: string, citizenWord: string, liarWord: string} | null>}
 */
async function getGameSetup() {
    try {
        // 1. 모든 고유 카테고리를 가져옵니다.
        const [categories] = await pool.query('SELECT DISTINCT category FROM words');
        if (categories.length === 0) {
            throw new Error('DB에 카테고리가 없습니다.');
        }

        // 2. 카테고리 중 하나를 무작위로 선택합니다.
        const randomCategory = categories[Math.floor(Math.random() * categories.length)].category;

        // 3. 선택된 카테고리에 속한 모든 단어를 가져옵니다.
        const [words] = await pool.query('SELECT word FROM words WHERE category = ?', [randomCategory]);
        if (words.length < 2) {
            // 게임 진행을 위해 최소 2개의 단어가 필요합니다.
            console.warn(`'${randomCategory}' 카테고리에 단어가 2개 미만이라 게임을 시작할 수 없습니다. 다른 카테고리를 시도합니다.`);
            // 재귀적으로 다른 카테고리를 찾거나, 여기서는 간단히 null을 반환합니다.
            // 실제 프로덕션에서는 모든 카테고리를 시도하는 로직이 더 안정적일 수 있습니다.
            return null; 
        }

        // 4. 단어 목록을 섞은 후, 2개를 선택합니다. (Fisher-Yates 셔플)
        for (let i = words.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [words[i], words[j]] = [words[j], words[i]];
        }
        
        const citizenWord = words[0].word;
        const liarWord = words[1].word;

        return { category: randomCategory, citizenWord, liarWord };

    } catch (err) {
        console.error('DB에서 게임 설정 정보를 가져오는 데 실패했습니다:', err);
        return null;
    }
}

module.exports = { pool, testConnection, getGameSetup };