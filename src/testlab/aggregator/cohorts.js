export function groupDocsByContext(docs = [], fieldNames = []) {
  const map = new Map();
  for (const doc of docs) {
    const values = fieldNames
      .flatMap((name) => {
        const value = doc?.[name];
        return Array.isArray(value) ? value : [value];
      })
      .map((x) => String(x || '').trim())
      .filter(Boolean);

    for (const value of values) {
      if (!map.has(value)) map.set(value, []);
      map.get(value).push(doc);
    }
  }
  return map;
}
