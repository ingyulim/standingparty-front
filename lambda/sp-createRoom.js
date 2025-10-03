const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");

const dbClient = new DynamoDBClient({ region: "ap-northeast-2" });

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const title = body.title;

    const roomId = uuidv4(); // 고유 ID 생성
    const createdAt = new Date().toISOString();

    const command = new PutItemCommand({
      TableName: "StandingParty",
      Item: {
        PK: { S: `ROOM#${roomId}` },
        SK: { S: "METADATA" },
        title: { S: title },
        createdAt: { S: createdAt }
      }
    });

    await dbClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Room created successfully", roomId })
    };

  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to create room" })
    };
  }
};

