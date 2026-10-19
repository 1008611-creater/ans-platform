export function GET() {
  return Response.json(
    {
      status: "disabled",
      sessions: [],
      reason: "CozyClay cloud agent sessions are not configured for this installation.",
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
