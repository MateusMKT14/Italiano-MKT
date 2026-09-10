import { getStore } from "npm:@netlify/blobs@8";

export default async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const store = getStore({ name: "calendar-editorial", consistency: "strong" });

    if (req.method === "GET") {
      const url = new URL(req.url);
      const key = url.searchParams.get("key");
      if (!key) {
        return new Response(JSON.stringify({ error: "missing key" }), { status: 400, headers });
      }
      const value = await store.get(key);
      if (value === null) {
        return new Response(JSON.stringify({ value: null }), { status: 200, headers });
      }
      return new Response(JSON.stringify({ value }), { status: 200, headers });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { key, value } = body;
      if (!key || typeof value !== "string") {
        return new Response(JSON.stringify({ error: "missing key/value" }), { status: 400, headers });
      }
      await store.set(key, value);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err && err.message || err) }), { status: 500, headers });
  }
};

export const config = { path: "/api/storage" };
