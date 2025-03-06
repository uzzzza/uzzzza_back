const { getPool } = require('./db-connection');

// 환경 평가 저장 함수
async function saveEvaluation(evaluationData) {
  try {
    // evaluationData에서 필요한 필드 추출
    const claudeResponse = evaluationData.response || "";
    const userInputs = evaluationData.userInputs || {};
    
    // mcqScores 값 추출 (없으면 0으로 설정)
    const mcqScores = userInputs.mcqScores || 0;
    
    // Claude 응답에서 데이터 추출
    const scoreMatch = claudeResponse.match(/점수:\s*(\d+)/);
    const claudeScore = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    
    // Claude 점수와 mcqScores 합산
    const totalScore = claudeScore + mcqScores;
    
    // 주요 문제점 추출
    let problem = '';
    
    // 응답에서 섹션 구분을 위한 정규식 패턴 설정
    const sectionPattern = /(?:\d+\.\s*주요\s*문제점:|주요\s*문제점:)([\s\S]*?)(?:\d+\.\s*개선\s*필요\s*핵심\s*영역:|개선\s*필요\s*핵심\s*영역:)/i;
    const problemMatches = claudeResponse.match(sectionPattern);
    
    if (problemMatches && problemMatches[1]) {
      // 추출된 '주요 문제점' 섹션 내용 가져오기
      problem = problemMatches[1].trim();
      
      // 번호 매김이 있을 경우 제거
      problem = problem.replace(/^\s*\d+\.\s*|\s*\d+\.\s*$/g, '');
      
      // 끝에 있을 수 있는 숫자 패턴 제거
      problem = problem.replace(/\s+\d+\.\s*$/g, '');
    }
    
    // 개선 필요 핵심 영역 추출
    let feedback = '';
    
    // 응답에서 '개선 필요 핵심 영역:' 이후의 모든 내용 추출
    const feedbackPattern = /(?:\d+\.\s*개선\s*필요\s*핵심\s*영역:|개선\s*필요\s*핵심\s*영역:)([\s\S]*?)$/i;
    const feedbackMatches = claudeResponse.match(feedbackPattern);
    
    if (feedbackMatches && feedbackMatches[1]) {
      feedback = feedbackMatches[1].trim();
    }
    
    const pool = getPool();
    
    // environment 테이블에 데이터 삽입
    const query = 'INSERT INTO environment (score, problem, feedback) VALUES (?, ?, ?)';
    const [result] = await pool.execute(query, [totalScore, problem, feedback]);
    
    console.log(`환경 데이터가 저장되었습니다. ID: ${result.insertId}, 합산 점수: ${totalScore} (Claude: ${claudeScore}, MCQ: ${mcqScores})`);
    console.log('추출된 문제점:', problem);
    console.log('추출된 개선 영역:', feedback);
    
    return result.insertId;
  } catch (error) {
    console.error('데이터베이스 저장 오류:', error);
    throw error;
  }
}

// 환경 평가 조회 함수(ID로 데이터 가져오기)
async function getEnvironmentById(environmentId) {
  try {
    const pool = getPool();
    
    // environment_id로 데이터 조회
    const query = 'SELECT environment_id, score, problem, feedback FROM environment WHERE environment_id = ?';
    const [rows] = await pool.execute(query, [environmentId]);
    
    if (rows.length === 0) {
      return null; // 해당 ID의 데이터가 없음
    }
    
    return rows[0]; // 첫 번째 행 반환
  } catch (error) {
    console.error('데이터베이스 조회 오류:', error);
    throw error;
  }
}

module.exports = {
  saveEvaluation,
  getEnvironmentById
};
