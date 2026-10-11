"use client";
export async function marketRequest<T>(url: string, method: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const envelope = await response.json().catch(() => null);
  if (!response.ok || !envelope?.ok) throw new Error(typeof envelope?.error?.code === "string" ? envelope.error.code : "INTERNAL_ERROR");
  return envelope.data as T;
}
