const {
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    QueryCommand,
  } = require("@aws-sdk/client-dynamodb");
  
  const client = new DynamoDBClient({ region: "ap-northeast-2" });
  const TABLE_NAME = process.env.TABLE_NAME;
  
  // 4자리 고유 코드 생성 (중복 방지)
  async function generateUniqueCode(roomId) {
    const maxAttempts = 10;
    const pk = `ROOM#${roomId}`;
  
    for (let i = 0; i < maxAttempts; i++) {
      const code = Math.floor(1000 + Math.random() * 9000).toString(); // 1000 ~ 9999
  
      const checkRes = await client.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk",
          FilterExpression: "#code = :code",
          ExpressionAttributeNames: { "#code": "code" },
          ExpressionAttributeValues: {
            ":pk": { S: pk },
            ":code": { S: code },
          },
        })
      );
  
      if (checkRes.Items.length === 0) return code;
    }
  
    throw new Error("고유 코드 생성 실패 (중복 충돌)");
  }
  
  exports.handler = async (event) => {
    console.log("### sp-joinRoom invoked");
    console.log("### ENV TABLE_NAME:", TABLE_NAME);
  
    try {
      const body = JSON.parse(event.body);
      const { roomId, phone, nickname, gender } = body;
  
      if (!roomId || !phone) {
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "roomId and phone are required" }),
        };
      }
  
      const pk = `ROOM#${roomId}`;
      const sk = `USER#${phone}`;
  
      const getRes = await client.send(
        new GetItemCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: { S: pk },
            SK: { S: sk },
          },
        })
      );
  
      if (getRes.Item) {
        const existingUser = {
          nickname: getRes.Item.nickname?.S || "",
          gender: getRes.Item.gender?.S || "",
          code: getRes.Item.code?.S || "",
        };
  
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            isNew: false,
            roomId,
            ...existingUser,
          }),
        };
      }
  
      if (!nickname || !gender) {
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            isNew: true,
            roomId,
          }),
        };
      }
  
      const code = await generateUniqueCode(roomId);
  
      await client.send(
        new PutItemCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: { S: pk },
            SK: { S: sk },
            nickname: { S: nickname },
            gender: { S: gender },
            phone: { S: phone },
            code: { S: code },
            points: { N: "0" },
            createdAt: { S: new Date().toISOString() },
          },
        })
      );
  
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          isNew: false,
          roomId,
          nickname,
          gender,
          code,
        }),
      };
    } catch (err) {
      console.error("Error in joinRoom:", err);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: err.message }),
      };
    }
  };
  