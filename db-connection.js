const mysql = require('mysql2/promise');

// 환경 변수에서 DB 설정 로드
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
};


let pool;
// 연결 풀 가져오기
function getPool() {
  if (!pool) {
    console.log('DB 연결 풀 초기화...');
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

module.exports = {
  getPool
};
