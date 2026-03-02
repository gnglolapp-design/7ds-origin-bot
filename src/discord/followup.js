export async function sendFollowup(interaction, data) {
  const appId = interaction?.application_id;
  const token = interaction?.token;
  if (!appId || !token) return false;
  const url = `https://discord.com/api/v10/webhooks/${appId}/${token}`;
  const body = JSON.stringify(data || {});
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return res.ok;
}
