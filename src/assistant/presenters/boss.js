function short(textValue, max = 760) {
  const s = String(textValue || '').trim();
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

export function addBossScienceActionField(embed, science = null) {
  if (!embed || !science?.actionLines?.length) return embed;
  embed.fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  const hasPriority = embed.fields.some((f) => /^1\)/.test(String(f?.name || '')));
  const insertAt = hasPriority ? 1 : 0;
  embed.fields.splice(insertAt, 0, {
    name: hasPriority ? '1b) 🎯 Lecture pattern' : '1) 🎯 Lecture pattern',
    value: short(science.actionLines.map((x) => `• ${x}`).join('\n')),
    inline: false,
  });
  return embed;
}
