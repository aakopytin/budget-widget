// Снимки отчёта «Исполнение договоров» на конец месяца (фиксация закрытого месяца).
// Хранилище: Vercel KV / Upstash Redis (REST). Переменные окружения создаются при подключении хранилища к проекту:
//   KV_REST_API_URL + KV_REST_API_TOKEN  (или UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
// GET  /api/snapshot?key=contracts:YYYY-MM-DD  → 200 сохранённый JSON | 404 нет снимка | 503 хранилище не подключено
// POST /api/snapshot?key=contracts:YYYY-MM-DD  (тело — JSON снимка) → 200 сохранён | 409 уже зафиксирован
// Перезапись запрещена (SET … NX): зафиксированный месяц не меняется. Удалить снимок — в консоли Upstash/Vercel KV.
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY_RE = /^contracts:\d{4}-\d{2}-\d{2}$/;
const MAX_SIZE = 900 * 1024;   // лимит размера снимка (Upstash: до 1 МБ на запрос)

function readBody(req) {
  return new Promise(function (resolve) {
    let d = '';
    req.on('data', function (c) { d += c.toString(); if (d.length > MAX_SIZE + 1) req.destroy(); });
    req.on('end', function () { resolve(d); });
    req.on('error', function () { resolve(''); });
  });
}
async function kv(cmd) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + KV_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || ('KV HTTP ' + r.status));
  return j.result;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const send = function (code, obj) { res.statusCode = code; res.end(typeof obj === 'string' ? obj : JSON.stringify(obj)); };
  if (!KV_URL || !KV_TOKEN) return send(503, { error: 'kv_not_configured' });
  const key = String((req.query && req.query.key) || '');
  if (!KEY_RE.test(key)) return send(400, { error: 'bad_key' });
  try {
    if (req.method === 'GET') {
      const v = await kv(['GET', key]);
      return v == null ? send(404, { error: 'not_found' }) : send(200, v);
    }
    if (req.method === 'POST') {
      const body = await readBody(req);
      if (!body || body.length > MAX_SIZE) return send(413, { error: 'too_large_or_empty' });
      try { JSON.parse(body); } catch (e) { return send(400, { error: 'bad_json' }); }
      const r = await kv(['SET', key, body, 'NX']);
      return r === 'OK' ? send(200, { ok: true }) : send(409, { error: 'already_fixed' });
    }
    return send(405, { error: 'method_not_allowed' });
  } catch (e) {
    return send(502, { error: e.message });
  }
};
