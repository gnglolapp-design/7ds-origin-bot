export function requireEnv(env, keys) {
  const missing = keys.filter(k => !env[k] || String(env[k]).trim() === "");
  if (missing.length) throw new Error("Missing env: " + missing.join(", "));
}
