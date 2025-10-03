const {
    DynamoDBClient,
    QueryCommand,
    GetItemCommand
  } = require("@aws-sdk/client-dynamodb");
  
  const client = new DynamoDBClient({ region: "ap-northeast-2" });
  const TABLE_NAME = process.env.TABLE_NAME || "StandingParty";
  const ROOM_META_SK = "METADATA";
  
  exports.handler = async (event) => {
    console.log("[sp-getMyMissions] invoked ✅");
  
    try {
      const { roomId, phone } = event.queryStringParameters || {};
  
      console.log("🔍 roomId:", roomId);
      console.log("🔍 phone:", phone);
  
      if (!roomId || !phone) {
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "roomId, phone이 필요합니다." })
        };
      }
  
      // ✅ 1. 해당 room의 missionActive 여부 확인
      const roomMetaRes = await client.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: `ROOM#${roomId}` },
          SK: { S: ROOM_META_SK }
        }
      }));
  
      const missionActive = roomMetaRes.Item?.missionActive?.BOOL;
      console.log("✅ missionActive:", missionActive);
  
      if (!missionActive) {
        console.log(`[sp-getMyMissions] missionActive=false for roomId=${roomId}`);
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify([])
        };
      }
  
      // ✅ 2. 전역 미션 목록 가져오기 (PK = "MISSION")
      const missionsRes = await client.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": { S: "MISSION" },
          ":prefix": { S: "mission-" },
        },
      }));
  
      // ✅ 3. 참가자가 완료한 미션 제출 목록 가져오기
      const submitsRes = await client.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        FilterExpression: "phone = :phone",
        ExpressionAttributeValues: {
          ":pk": { S: `ROOM#${roomId}` },
          ":prefix": { S: "SUBMIT#" },
          ":phone": { S: phone },
        },
      }));
  
      // 🔧 수정: SK에서 missionId 추출 (mission- prefix 포함된 상태로)
      const doneMap = new Map();
      (submitsRes.Items || []).forEach(item => {
        const sk = item.SK.S; // "SUBMIT#mission-1759458991899#01048465441"
        const parts = sk.split("#");
        const missionKey = parts[1]; // "mission-1759458991899" (그대로 사용)
        const imageUrl = item.imageUrl?.S || null;
  
        console.log("🔍 SUBMIT SK:", sk, "→ missionKey:", missionKey);
  
        doneMap.set(missionKey, {
          done: true,
          imageUrl
        });
      });
  
      console.log("🔍 완료된 미션 Map:", Array.from(doneMap.keys()));
  
      // ✅ 4. 응답 구성
      const missions = (missionsRes.Items || []).map(m => {
        const missionSK = m.SK.S; // "mission-1759371819885"
        const id = missionSK.replace("mission-", ""); // "1759371819885"
        const submitInfo = doneMap.get(missionSK); // mission- prefix 포함된 키로 조회
  
        console.log("🔍 미션 체크:", {
          missionSK: missionSK,
          extractedId: id,
          hasDone: !!submitInfo
        });
  
        return {
          id,
          title: m.title?.S || "",
          description: m.description?.S || "",
          points: Number(m.points?.N || 0),
          done: submitInfo ? true : false,
          imageUrl: submitInfo?.imageUrl || null,
        };
      });
  
      console.log("✅ 최종 미션 목록:", JSON.stringify(missions, null, 2));
  
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(missions)
      };
    } catch (err) {
      console.error("[sp-getMyMissions] error ❌", err);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "서버 오류", details: err.message })
      };
    }
  };