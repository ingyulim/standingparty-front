// ✅ Lambda: sp-submitMissionByCode.js (본인 코드 제출 시 완료 처리 + 감점)
const {
    DynamoDBClient,
    QueryCommand,
    GetItemCommand,
    PutItemCommand,
    UpdateItemCommand
  } = require("@aws-sdk/client-dynamodb");
  
  const client = new DynamoDBClient({ region: "ap-northeast-2" });
  const TABLE_NAME = process.env.TABLE_NAME || "StandingParty";
  
  exports.handler = async (event) => {
    console.log("[sp-submitMissionByCode] invoked");
    console.log("📦 event.body:", event.body);
  
    try {
      const body = JSON.parse(event.body);
      console.log("📝 파싱된 body:", JSON.stringify(body));
      
      const { roomId, missionId, phone, targetCode } = body;
      console.log("🔍 추출된 값:", { roomId, missionId, phone, targetCode });
  
      if (!roomId || !missionId || !phone || !targetCode) {
        console.log("❌ 필수 값 누락!");
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "roomId, missionId, phone, targetCode 모두 필요합니다." })
        };
      }
  
      const pk = `ROOM#${roomId}`;
  
      // ✅ 0. 본인 코드 조회
      console.log("👤 본인 코드 조회 중...");
      const myInfo = await client.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: pk },
          SK: { S: `USER#${phone}` }
        },
        ProjectionExpression: "code"
      }));
      const myCode = myInfo.Item?.code?.S;
      console.log("✅ 본인 코드:", myCode, "/ 입력한 코드:", targetCode);
  
      // ✅ 1. 상대 코드 검증 (본인 코드면 건너뜀)
      if (targetCode !== myCode) {
        console.log("🔍 상대 코드 검증 중...");
        const res = await client.send(new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
          FilterExpression: "#code = :targetCode",
          ExpressionAttributeNames: { "#code": "code" },
          ExpressionAttributeValues: {
            ":pk": { S: pk },
            ":prefix": { S: "USER#" },
            ":targetCode": { S: targetCode },
          },
        }));
  
        if (!res.Items || res.Items.length === 0) {
          console.log("❌ 코드 검증 실패");
          return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "입력한 코드가 이 방에 존재하지 않습니다." })
          };
        }
        console.log("✅ 코드 검증 성공");
      } else {
        console.log("⚠️ 본인 코드 입력 - 감점 처리 예정");
      }
  
      // ✅ 2. 중복 제출 확인
      console.log("🔍 중복 제출 확인 중...");
      const check = await client.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: pk },
          SK: { S: `SUBMIT#${missionId}#${phone}` },
        },
      }));
      if (check.Item) {
        console.log("❌ 중복 제출");
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "이미 완료한 미션입니다." })
        };
      }
      console.log("✅ 중복 제출 아님");
  
      // ✅ 3. 전역 미션 포인트 조회
      const globalSK = missionId.startsWith("mission-") ? missionId : `mission-${missionId}`;
      console.log("🎯 미션 조회:", globalSK);
      
      const mission = await client.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: "MISSION" },
          SK: { S: globalSK },
        },
      }));
  
      const basePoints = parseInt(mission.Item?.points?.N || "0", 10);
      console.log("💰 기본 포인트:", basePoints);
  
      // ✅ 4. 점수 결정 (본인 코드면 감점)
      let points = basePoints;
      let penalty = false;
      if (targetCode === myCode) {
        points = -Math.abs(basePoints); // 감점
        penalty = true;
        console.log("⚠️ 감점 처리:", points);
      }
  
      console.log(`[MISSION] ${globalSK} → ${points} points (penalty=${penalty})`);
  
      // ✅ 5. 포인트 반영
      console.log("💾 포인트 업데이트 중...");
      await client.send(new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: pk },
          SK: { S: `USER#${phone}` },
        },
        UpdateExpression: "ADD points :inc",
        ExpressionAttributeValues: {
          ":inc": { N: String(points) },
        },
      }));
      console.log("✅ 포인트 업데이트 완료");
  
      // ✅ 6. 제출 기록 저장
      console.log("💾 제출 기록 저장 중...");
      await client.send(new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: { S: pk },
          SK: { S: `SUBMIT#${missionId}#${phone}` },
          missionId: { S: missionId },
          phone: { S: phone },
          targetCode: { S: targetCode },
          completedAt: { S: new Date().toISOString() },
          penalty: { BOOL: penalty },
        },
      }));
      console.log("✅ 제출 기록 저장 완료");
  
      console.log("🎉 미션 제출 성공!");
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: true, points, penalty })
      };
    } catch (err) {
      console.error("[sp-submitMissionByCode] error", err);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "서버 오류", details: err.message })
      };
    }
  };