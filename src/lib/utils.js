export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type","application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}
export function chunk(arr, size){
  const out=[]; for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size));
  return out;
}
