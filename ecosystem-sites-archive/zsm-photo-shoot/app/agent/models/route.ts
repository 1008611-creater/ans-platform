export function GET() {
  return Response.json(
    {
      status: "disabled",
      models: [],
      providers: [],
      reason: "CozyClay cloud agent models are not configured for this installation.",
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
