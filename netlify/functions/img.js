// Proxy + cache de capas de publicações (Instagram/Facebook CDN) via servidor.
// 1ª vez: busca a imagem no servidor (sem bloqueio de hotlink) e guarda no Netlify Blobs;
// depois serve a cópia guardada, mesmo que o link original expire.
const crypto = require("crypto");
const { connectLambda, getStore } = require("@netlify/blobs");

const ALLOWED = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/i;

exports.handler = async (event) => {
  connectLambda(event);
  const u = event.queryStringParameters && event.queryStringParameters.u;
  if (!u) return { statusCode: 400, body: "missing u" };
  let url;
  try { url = new URL(u); } catch (e) { return { statusCode: 400, body: "bad url" }; }
  if (url.protocol !== "https:" || !ALLOWED.test(url.hostname)) return { statusCode: 403, body: "host not allowed" };

  // chave estável: caminho do arquivo sem os parâmetros assinados que mudam
  const key = "cover-" + crypto.createHash("sha1").update(url.hostname + url.pathname).digest("hex");
  const store = getStore({ name: "covers" });
  const send = (buf, type) => ({
    statusCode: 200,
    headers: { "Content-Type": type || "image/jpeg", "Cache-Control": "public, max-age=86400" },
    body: Buffer.from(buf).toString("base64"),
    isBase64Encoded: true,
  });

  try {
    const cached = await store.getWithMetadata(key, { type: "arrayBuffer" });
    if (cached && cached.data) return send(cached.data, cached.metadata && cached.metadata.type);
  } catch (e) { /* sem cache ainda */ }

  try {
    const r = await fetch(url.toString(), { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return { statusCode: 502, body: "upstream " + r.status };
    const type = r.headers.get("content-type") || "image/jpeg";
    const buf = await r.arrayBuffer();
    try { await store.set(key, buf, { metadata: { type } }); } catch (e) { /* segue sem cache */ }
    return send(buf, type);
  } catch (err) {
    return { statusCode: 502, body: "fetch failed" };
  }
};
