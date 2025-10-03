const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");

const dbClient = new DynamoDBClient({ region: "ap-northeast-2" });
const TABLE_NAME = process.env.TABLE_NAME || "StandingParty";

exports.handler = async (event) => {
  try {
    const command = new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: { S: "BINGO" },
        SK: { S: "DEFAULT" }
      }
    });

    const result = await dbClient.send(command);

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "등록된 빙고가 없습니다." })
      };
    }

    const title = result.Item.title?.S || "";
    const description = result.Item.description?.S || "";
    const grid = JSON.parse(result.Item.grid?.S || "[]");

    return {
      statusCode: 200,
      body: JSON.stringify({ title, description, grid })
    };
  } catch (err) {
    console.error("빙고 불러오기 오류:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "서버 오류: 빙고 불러오기 실패" })
    };
  }
};
