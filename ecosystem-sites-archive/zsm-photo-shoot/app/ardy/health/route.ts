export function GET() {
  return Response.json(
    {
      status: "disabled",
      ok: false,
      reason: "CozyClay motion backend is not configured for this installation.",
    },
    {
      status: 200,
      headers: { "cache-control": "no-store" },
    },
  );
}
