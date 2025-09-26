const API_BASE_URL = "https://ul4jxnpezi.execute-api.ap-northeast-2.amazonaws.com"; 

async function callAPI(path, method = "GET", body = null) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = (data && (data.message || data.error || data.raw)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}
