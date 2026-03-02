export async function editOriginalResponse(interaction, data) {
  const appId = interaction?.application_id;
  const token = interaction?.token;
  if (!appId || !token) return false;
  const url = `https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`;
  const body = JSON.stringify(data || {});
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return res.ok;
}
