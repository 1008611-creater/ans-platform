export async function GET() {
  return Response.json(
    {
      status: "disabled",
      session: null,
      reason: "CozyClay cloud agent sessions are not configured for this installation.",
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
