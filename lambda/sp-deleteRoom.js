const { DynamoDBClient, QueryCommand, BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");

const dbClient = new DynamoDBClient({ region: "ap-northeast-2" });
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const roomId = event.pathParameters?.roomId;
    if (!roomId) {
      return { statusCode: 400, body: JSON.stringify({ message: "roomId required" }) };
    }

    // 1. Query all items in the room
    const queryCmd = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: `ROOM#${roomId}` }
      }
    });
    const queryRes = await dbClient.send(queryCmd);

    if (!queryRes.Items || queryRes.Items.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ message: "Room not found" }) };
    }

    // 2. Batch delete (25개 제한)
    const chunks = [];
    for (let i = 0; i < queryRes.Items.length; i += 25) {
      chunks.push(queryRes.Items.slice(i, i + 25));
    }

    for (const chunk of chunks) {
      const deleteRequests = chunk.map(item => ({
        DeleteRequest: {
          Key: {
            PK: item.PK,
            SK: item.SK
          }
        }
      }));
      await dbClient.send(new BatchWriteItemCommand({
        RequestItems: { [TABLE_NAME]: deleteRequests }
      }));
    }

    return { statusCode: 200, body: JSON.stringify({ message: "Room deleted", roomId }) };
  } catch (err) {
    console.error("Error deleting room", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Internal Server Error" }) };
  }
};
