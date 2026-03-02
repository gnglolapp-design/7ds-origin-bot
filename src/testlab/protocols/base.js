export function defineProtocol(def = {}) {
  return {
    id: def.id,
    title: def.title,
    what: def.what,
    min_n: Number(def.min_n || 1),
    fields: Array.isArray(def.fields) ? def.fields : [],
    science_context: Array.isArray(def.science_context) ? def.science_context : [],
  };
}
