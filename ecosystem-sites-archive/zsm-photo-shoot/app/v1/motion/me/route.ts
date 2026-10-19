export function GET() {
  return Response.json(
    {
      status: "disabled",
      enabled: false,
      reason: "CozyClay motion service is not configured for this installation.",
    },
    {
      status: 200,
      headers: { "cache-control": "no-store" },
    },
  );
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { "access-control-allow-origin": "*" },
  });
}
