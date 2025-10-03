// ✅ Lambda: sp-adminLogin.js
exports.handler = async (event) => {
    console.log("[sp-adminLogin] invoked");
  
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
  
    try {
      const body = JSON.parse(event.body || "{}");
      const { password } = body;
  
      if (!password) {
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "password가 필요합니다." })
        };
      }
  
      const success = password === ADMIN_PASSWORD;
  
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success })
      };
    } catch (err) {
      console.error("[sp-adminLogin] error", err);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "서버 오류", details: err.message })
      };
    }
  };
  