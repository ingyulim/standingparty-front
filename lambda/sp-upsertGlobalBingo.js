const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const dbClient = new DynamoDBClient({ region: "ap-northeast-2" });
const TABLE_NAME = process.env.TABLE_NAME || "StandingParty";

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { title, description, grid } = body;

    if (
      !title || !description ||
      !Array.isArray(grid) ||
      grid.length !== 5 ||
      grid.some(row => row.length !== 5)
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "title, description, grid(5x5) 모두 필수입니다." })
      };
    }

    const command = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: { S: "BINGO" },
        SK: { S: "DEFAULT" },
        title: { S: title },
        description: { S: description },
        grid: { S: JSON.stringify(grid) }
      }
    });

    await dbClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "빙고가 성공적으로 등록되었습니다." })
    };
  } catch (err) {
    console.error("Error saving bingo:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "서버 오류: 빙고 저장 실패" })
    };
  }
};
