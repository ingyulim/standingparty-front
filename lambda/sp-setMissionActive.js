const {
    DynamoDBClient,
    UpdateItemCommand
  } = require("@aws-sdk/client-dynamodb");
  
  const client = new DynamoDBClient({ region: "ap-northeast-2" });
  const TABLE_NAME = process.env.TABLE_NAME || "StandingParty";
  
  exports.handler = async (event) => {
    console.log("[sp-setMissionActive] invoked");
  
    try {
      const body = JSON.parse(event.body);
      const { roomId, active } = body;
  
      if (!roomId || typeof active !== "boolean") {
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "roomId와 active(boolean)이 필요합니다." })
        };
      }
  
      const pk = `ROOM#${roomId}`;
      const sk = "METADATA"; // ✅ 수정됨
  
      await client.send(new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: pk },
          SK: { S: sk },
        },
        UpdateExpression: "SET missionActive = :val",
        ExpressionAttributeValues: {
          ":val": { BOOL: active },
        },
      }));
  
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: true })
      };
    } catch (err) {
      console.error("[sp-setMissionActive] error", err);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "서버 오류", details: err.message })
      };
    }
  };
  