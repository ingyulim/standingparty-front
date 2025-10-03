const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const client = new DynamoDBClient({ region: "ap-northeast-2" });
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  console.log("### sp-getParticipants invoked");

  const roomId = event.queryStringParameters?.roomId;

  if (!roomId) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "roomId is required" }),
    };
  }

  const pk = `ROOM#${roomId}`;

  try {
    const result = await client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": { S: pk },
          ":skPrefix": { S: "USER#" },
        },
      })
    );

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result.Items),
    };
  } catch (err) {
    console.error("DynamoDB query error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
