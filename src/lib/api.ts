export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

export const jsonPost = (url: string, body?: any) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

export const jsonPut = (url: string, body: any) =>
  fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const apiDelete = (url: string) => fetch(url, { method: "DELETE" });
