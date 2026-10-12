import { auth } from "@/lib/auth";
import { agentRequestSchema, type AgentEvent } from "@/contracts/companion-agent";
import { readSameOriginJson, assertRequestActor, HttpRequestError } from "@/server/http/json";
import { prepareAgentQuote, executeAgent, readAgentStatus } from "./service";
import { AgentError } from "./policy";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function companionAgentResponse(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new AgentError("UNAUTHORIZED", 401);
    const actor = session.user.id;
    assertRequestActor(request, actor);
    const parsed = agentRequestSchema.safeParse(await readSameOriginJson(request));
    if (!parsed.success) throw new AgentError("INVALID_INPUT", 400);
    const body = parsed.data;
    if (body.action === "quote") return Response.json(await prepareAgentQuote(actor, body.input), { headers });
    if (body.action === "status") return Response.json(await readAgentStatus(actor, body.ticket), { headers });
    const encoder = new TextEncoder();
    const abort = new AbortController();
    const requestAbort = () => abort.abort();
    if (request.signal.aborted) abort.abort();
    request.signal.addEventListener("abort", requestAbort, { once: true });
    let connected = true;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (event: AgentEvent) => { if (connected) try { controller.enqueue(encoder.encode(JSON.stringify(event) + "\n")); } catch { connected = false; abort.abort(); } };
        try { await executeAgent(actor, body.input, body.ticket, abort.signal, emit); }
        catch (error) { emit({ type: "error", code: error instanceof AgentError ? error.code : "AGENT_RESPONSE_UNAVAILABLE" }); }
        finally { emit({ type: "done" }); request.signal.removeEventListener("abort", requestAbort); if (connected) controller.close(); }
      },
      cancel() { connected = false; abort.abort(); request.signal.removeEventListener("abort", requestAbort); },
    });
    return new Response(stream, { headers: { ...headers, "Content-Type": "application/x-ndjson; charset=utf-8", "X-Accel-Buffering": "no" } });
  } catch (error) {
    const known = error instanceof AgentError || error instanceof HttpRequestError;
    return Response.json({ error: known ? error.code : "AGENT_UNAVAILABLE" }, { status: known ? error.status : 503, headers });
  }
}
