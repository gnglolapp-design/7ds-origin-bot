import nacl from "tweetnacl";
function hexToUint8(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i*2,2),16);
  return bytes;
}
export async function verifyDiscordRequest(request, publicKey) {
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  if (!signature || !timestamp) return { isValid:false, body:null };
  const bodyText = await request.text();
  const msg = new TextEncoder().encode(timestamp + bodyText);
  const sig = hexToUint8(signature);
  const pk = hexToUint8(publicKey);
  const ok = nacl.sign.detached.verify(msg, sig, pk);
  return { isValid: ok, body: bodyText };
}
