// sp-deleteGlobalMission.js
const { DynamoDBClient, DeleteItemCommand, GetItemCommand } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({ region: "ap-northeast-2" });
const TABLE_NAME = process.env.TABLE_NAME || "StandingParty";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ok = (bodyObj) => ({
  statusCode: 200,
  headers: CORS,
  isBase64Encoded: false,
  body: JSON.stringify(bodyObj ?? {}),
});

const bad = (code, msg) => ({
  statusCode: code,
  headers: CORS,
  isBase64Encoded: false,
  body: JSON.stringify({ error: msg }),
});

exports.handler = async (event) => {
  console.log("[sp-deleteGlobalMission] invoked");
  console.log("event.requestContext:", JSON.stringify(event.requestContext || {}));
  console.log("event.pathParameters:", JSON.stringify(event.pathParameters || {}));
  console.log("event.queryStringParameters:", JSON.stringify(event.queryStringParameters || {}));
  console.log("event.body:", event.body);

  try {
    // 1) missionId를 모든 경로에서 시도해서 안전하게 가져오기
    let missionId =
      event?.pathParameters?.missionId ||
      event?.queryStringParameters?.missionId ||
      (event?.body ? (JSON.parse(event.body).missionId || null) : null);

    if (!missionId) {
      // 경로 미스매핑/프록시 아님 대비
      // /admin/missions/{missionId} 같은 경로를 쓰지만 pathParameters가 비어오는 상황 대비
      const rawPath = event?.rawPath || event?.requestContext?.path || "";
      const m = rawPath.match(/\/admin\/missions\/([^\/\?]+)/);
      if (m) missionId = decodeURIComponent(m[1]);
    }

    if (!missionId) {
      return bad(400, "missionId는 필수입니다.");
    }

    const pk = "MISSION";
    const sk = missionId;

    // (선택) 존재 여부 조회 → 없더라도 DynamoDB는 DeleteItem을 허용하지만,
    // 원인 파악 편의를 위해 존재 체크 로그 남김
    try {
      const getRes = await client.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { PK: { S: pk }, SK: { S: sk } },
        ProjectionExpression: "PK",
      }));
      console.log("GetItem exists?:", !!getRes.Item);
    } catch (e) {
      console.warn("GetItem warning:", e?.name, e?.message);
    }

    // 2) 삭제
    await client.send(new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: { S: pk },
        SK: { S: sk },
      },
    }));

    return ok({ success: true, missionId });
  } catch (err) {
    console.error("[sp-deleteGlobalMission] error", err);
    return bad(500, err?.message || "서버 오류");
  }
};
