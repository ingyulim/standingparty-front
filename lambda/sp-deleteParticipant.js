const { DynamoDBClient, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");

const dbClient = new DynamoDBClient({ region: "ap-northeast-2" });
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const roomId = event.pathParameters?.roomId;
    const phone = event.pathParameters?.phone;

    if (!roomId || !phone) {
      return { statusCode: 400, body: JSON.stringify({ message: "roomId and phone required" }) };
    }

    const command = new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: { S: `ROOM#${roomId}` },
        SK: { S: `USER#${phone}` }
      }
    });

    await dbClient.send(command);

    return { statusCode: 200, body: JSON.stringify({ message: "Participant deleted", roomId, phone }) };
  } catch (err) {
    console.error("Error deleting participant", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Internal Server Error" }) };
  }
};
