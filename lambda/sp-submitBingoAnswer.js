const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const dbClient = new DynamoDBClient({ region: "ap-northeast-2" });
const TABLE_NAME = process.env.TABLE_NAME || "StandingParty";

exports.handler = async (event) => {
  try {
    console.log("🔥 Raw event:", JSON.stringify(event));  // 요청 전체 로그 찍기

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Credentials": true },
        body: JSON.stringify({ message: "Invalid JSON body" })
      };
    }

    const { roomId, phone, row, col, answer } = body;

    if (!roomId || !phone || row === undefined || col === undefined || !answer) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Credentials": true },
        body: JSON.stringify({ message: "roomId, phone, row, col, answer 모두 필요합니다." })
      };
    }

    const timestamp = new Date().toISOString();

    const command = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: { S: `ROOM#${roomId}` },
        SK: { S: `SUBMIT#${row}#${col}#${phone}` },
        answer: { S: answer },
        completed: { BOOL: true },
        timestamp: { S: timestamp }
      }
    });

    await dbClient.send(command);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Credentials": true },
      body: JSON.stringify({ message: "빙고 미션 제출 완료", row, col })
    };
  } catch (err) {
    console.error("빙고 답변 제출 오류:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Credentials": true },
      body: JSON.stringify({ message: "서버 오류: 빙고 미션 제출 실패", error: err.message })
    };
  }
};
