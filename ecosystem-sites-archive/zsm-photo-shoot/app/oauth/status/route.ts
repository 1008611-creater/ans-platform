export function GET() {
  return Response.json(
    {
      signedIn: false,
      pending: false,
      email: null,
      plan: null,
      status: "disabled",
      reason: "CozyClay cloud sign-in is not configured for this installation.",
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
