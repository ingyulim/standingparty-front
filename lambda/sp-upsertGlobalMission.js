// ✅ Lambda: sp-upsertGlobalMission.js
const {
    DynamoDBClient,
    PutItemCommand
  } = require("@aws-sdk/client-dynamodb");
  
  const client = new DynamoDBClient({ region: "ap-northeast-2" });
  const TABLE_NAME = process.env.TABLE_NAME || "StandingParty";
  
  exports.handler = async (event) => {
    console.log("[sp-upsertGlobalMission] invoked");
  
    try {
      const body = JSON.parse(event.body);
      const { missionId, title, description, points } = body;
  
      if (!missionId || !title || points === undefined) {
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "missionId, title, points는 필수입니다." })
        };
      }
  
      const idOnly = missionId.replace(/^mission-/, ""); // prefix 제거
      const pk = "MISSION";
      const sk = `mission-${idOnly}`; // ✅ prefix 강제 부여
  
      await client.send(new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: { S: pk },
          SK: { S: sk },
          title: { S: title },
          description: { S: description || "" },
          points: { N: String(points) },
          updatedAt: { S: new Date().toISOString() },
        }
      }));
  
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: true })
      };
    } catch (err) {
      console.error("[sp-upsertGlobalMission] error", err);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "서버 오류", details: err.message })
      };
    }
  };
  