const { getEnvironmentById } = require("./db.js");

// 완전히 개방된 CORS 헤더 추가
const addCorsHeaders = (response) => {
    response.headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json"
    };
    return response;
};

exports.handler = async (event) => {
    // OPTIONS 요청 처리 (프리플라이트 요청)
    const httpMethod = event.requestContext?.http?.method || event.httpMethod || 'GET';
    if (httpMethod === 'OPTIONS') {
        return addCorsHeaders({
            statusCode: 200,
            body: ""
        });
    }

    try {
        let environmentId;
        
        // Query 파라미터에서 ID 가져오기
        if (event.queryStringParameters && event.queryStringParameters.id) {
            environmentId = event.queryStringParameters.id;
        } 
        // Path 파라미터에서 ID 가져오기
        else if (event.pathParameters && event.pathParameters.id) {
            environmentId = event.pathParameters.id;
        }
        // Body에서 ID 가져오기 (POST 요청인 경우)
        else if (event.body) {
            const requestBody = JSON.parse(event.body);
            environmentId = requestBody.id;
        }
        else {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "environment_id가 필요합니다." })
            };
        }

        // 숫자로 변환
        environmentId = parseInt(environmentId);
        if (isNaN(environmentId) || environmentId <= 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "유효한 environment_id가 아닙니다." })
            };
        }

        // DB에서 데이터 조회
        const environmentData = await getEnvironmentById(environmentId);
        
        if (!environmentData) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "해당 ID의 데이터를 찾을 수 없습니다." })
            };
        }

        // 성공적으로 데이터 찾음
        return addCorsHeaders({
            statusCode: 200,
            body: JSON.stringify(environmentData)
        });
    } catch (error) {
        console.error("🚨 환경 데이터 조회 오류:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "데이터 조회 중 오류 발생" })
        };
    }
};
