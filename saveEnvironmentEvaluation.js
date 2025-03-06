const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { promptTemplates, createPrompt } = require("./prompt.js");
const { saveEvaluation } = require("./db.js");

// AWS Bedrock 클라이언트 설정
const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });

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
    // Lambda 함수 URL과 API Gateway 모두에서 작동하도록 HTTP 메서드 확인
    const httpMethod = event.requestContext?.http?.method || event.httpMethod || 'POST';
    
    // OPTIONS 요청 처리 (프리플라이트 요청)
    if (httpMethod === 'OPTIONS') {
        return addCorsHeaders({
            statusCode: 200,
            body: "" 
        });
    }
    
    try {
        // 요청에서 body를 JSON으로 변환
        const requestBody = JSON.parse(event.body || "{}");

        // 객체가 아니거나 비어있는 경우 확인
        if (typeof requestBody !== 'object' || requestBody === null || Object.keys(requestBody).length === 0) {
            return addCorsHeaders({ 
                statusCode: 400, 
                body: JSON.stringify({ error: "요청 데이터는 객체여야 합니다." }) 
            });
        }

        // 객체의 모든 키가 promptTemplates에 있는지 확인
        for (const key in requestBody) {
            if (!promptTemplates[key] && key !== "mcqScores") {
                return addCorsHeaders({ 
                    statusCode: 400, 
                    body: JSON.stringify({ error: `알 수 없는 키: ${key}. 유효한 키만 사용해주세요.` }) 
                });
            }
        }

        // 프롬프트 생성
        const combinedPrompt = createPrompt(requestBody);
        
        // AWS Bedrock 요청 데이터
        const payload = {
            modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
            inferenceConfig: { temperature: 1, top_p: 0.9 },
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 4000,
                messages: [
                    {
                        role: "user",
                        content: combinedPrompt
                    }
                ]
            }),
        };

        // AWS Bedrock 모델 호출
        const command = new InvokeModelCommand(payload);
        const response = await client.send(command);

        // AWS Bedrock 응답 처리
        const decodedBody = new TextDecoder().decode(response.body);
        const responseBody = JSON.parse(decodedBody);
        const completion = responseBody?.content?.[0]?.text || "No response found";

        console.log("Claude 응답:", completion);
        
        // 데이터베이스에 평가 결과 저장
        try {
            const evaluationData = {
                userInputs: requestBody,
                response: completion
            };
            
            const evaluationId = await saveEvaluation(evaluationData);
            console.log(`평가 결과가 데이터베이스에 저장되었습니다. ID: ${evaluationId}`);
            
            // 저장된 ID만 반환
            return addCorsHeaders({
                statusCode: 200,
                body: JSON.stringify({ id: evaluationId })
            });
            
        } catch (dbError) {
            console.error("데이터베이스 저장 실패:", dbError);
            return addCorsHeaders({
                statusCode: 500,
                body: JSON.stringify({ error: "데이터베이스 저장 중 오류 발생" })
            });
        }
    } catch (error) {
        console.error("Lambda 실행 오류:", error);
        return addCorsHeaders({
            statusCode: 500,
            body: JSON.stringify({ error: "Lambda 실행 중 오류 발생" })
        });
    }
};
