const { connectLambda, getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  connectLambda(event);

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    const store = getStore({ name: "calendar-editorial", consistency: "strong" });

    if (event.httpMethod === "GET") {
      const key = event.queryStringParameters && event.queryStringParameters.key;
      if (!key) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "missing key" }) };
      }
      const value = await store.get(key);
      return { statusCode: 200, headers, body: JSON.stringify({ value: value === undefined ? null : value }) };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { key, value } = body;
      if (!key || typeof value !== "string") {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "missing key/value" }) };
      }
      await store.set(key, value);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "method not allowed" }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err && err.message) || err }) };
  }
};
