export function cid(base, parts = {}) {
  const p = Object.entries(parts).map(([k,v])=>`${k}=${encodeURIComponent(String(v))}`).join("&");
  return p ? `${base}?${p}` : base;
}
export function parseCid(customId) {
  const [base, qs] = customId.split("?", 2);
  const params = {};
  if (qs) for (const kv of qs.split("&")) {
    const [k,v] = kv.split("=",2);
    params[k] = decodeURIComponent(v ?? "");
  }
  return { base, params };
}
