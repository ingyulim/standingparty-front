const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({ region: "ap-northeast-2" });
const TABLE = process.env.TABLE_NAME;

exports.handler = async () => {
  console.log("### sp-getRooms invoked");

  try {
    const res = await client.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "SK = :meta",
      ExpressionAttributeValues: { ":meta": { S: "METADATA" } }
    }));

    const rooms = (res.Items || []).map(item => {
      const pk = item.PK?.S || "";
      const roomId = pk.replace("ROOM#", "");

      return {
        id: roomId,
        title: item.title?.S || "(제목 없음)",
        createdAt: item.createdAt?.S || null,
        missionActive: item.missionActive?.BOOL ?? item.missionActive?.S === "true",
        bingoActive: item.bingoActive?.BOOL ?? item.bingoActive?.S === "true",   // ✅ 추가됨
        bingoId: item.bingoId?.S || "DEFAULT"                                    // ✅ 선택 사항
      };
    });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(rooms)
    };
  } catch (err) {
    console.error("sp-getRooms 오류:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "getRooms failed", error: err.message })
    };
  }
};
