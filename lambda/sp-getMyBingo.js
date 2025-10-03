const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");

const dbClient = new DynamoDBClient({ region: "ap-northeast-2" });
const TABLE_NAME = process.env.TABLE_NAME || "StandingParty";

exports.handler = async (event) => {
  try {
    const query = event.queryStringParameters || {};
    const { roomId, phone } = query;

    console.log("🔍 빙고 조회:", { roomId, phone });

    if (!roomId || !phone) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "roomId와 phone은 필수입니다." })
      };
    }

    // ROOM#{roomId}의 SUBMIT#{row}#{col}#{phone} 조회
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": { S: `ROOM#${roomId}` },
        ":prefix": { S: "SUBMIT#" }
      }
    });

    const result = await dbClient.send(command);
    console.log("📊 조회 결과:", result.Items?.length || 0, "개");

    // SK에서 row, col 추출: SUBMIT#{row}#{col}#{phone}
    const completed = (result.Items || [])
      .filter(item => {
        const sk = item.SK.S;
        return sk.endsWith(`#${phone}`);
      })
      .map(item => {
        const sk = item.SK.S;
        const parts = sk.split('#'); // ["SUBMIT", row, col, phone]
        if (parts.length >= 4) {
          return `${parts[1]}-${parts[2]}`; // "row-col" 형식
        }
        return null;
      })
      .filter(Boolean);

    console.log("✅ 완료된 칸 목록:", completed);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ completed })
    };
  } catch (err) {
    console.error("빙고 상태 조회 오류:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "서버 오류: 빙고 상태 조회 실패", error: err.message })
    };
  }
};