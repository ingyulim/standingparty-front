const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const client = new DynamoDBClient({ region: "ap-northeast-2" });
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async () => {
  console.log("### sp-getGlobalMissions invoked");

  try {
    const res = await client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: "MISSION" }
      }
    }));

    const missions = (res.Items || []).map(item => ({
      missionId: item.SK.S, // ⭐ .replace("GLOBAL#", "") 제거!
      title: item.title?.S || "",
      description: item.description?.S || "",
      points: Number(item.points?.N || 0)
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(missions)
    };
  } catch (err) {
    console.error("sp-getGlobalMissions Error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message })
    };
  }
};