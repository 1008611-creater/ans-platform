import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { countSlugStatus, listPromptsNeedingSlugs, setPromptSlug } from "@/server/admin/slugs";
import { generatePromptSlug } from "@/lib/slug";

export async function POST(request: Request) {
  try {
    const context = await requireAdminPermission("PROMPTS_MANAGE");
    if (!context) {
      return NextResponse.json(
        { error: "forbidden", message: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const regenerateAll = searchParams.get("regenerate") === "true";

    const prompts = await listPromptsNeedingSlugs(regenerateAll);

    if (prompts.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        message: "No prompts to update",
      });
    }

    // Stream response for progress updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let success = 0;
        let failed = 0;

        for (let i = 0; i < prompts.length; i++) {
          const prompt = prompts[i];
          
          try {
            const slug = await generatePromptSlug(prompt.title);
            
            await setPromptSlug(prompt.id, slug);
            
            success++;
          } catch (error) {
            console.error(`Failed to generate slug for prompt ${prompt.id}:`, error);
            failed++;
          }

          // Send progress update
          const progress = {
            current: i + 1,
            total: prompts.length,
            success,
            failed,
            done: false,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
        }

        // Send final result
        const finalResult = {
          current: prompts.length,
          total: prompts.length,
          success,
          failed,
          done: true,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalResult)}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Generate slugs error:", error);
    return NextResponse.json(
      { error: "server_error", message: "Something went wrong" },
      { status: 500 }
    );
  }
}

// GET endpoint to check slug status
export async function GET() {
  try {
    const context = await requireAdminPermission("PROMPTS_MANAGE");
    if (!context) {
      return NextResponse.json(
        { error: "forbidden", message: "Admin access required" },
        { status: 403 }
      );
    }

    const status = await countSlugStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Get slug status error:", error);
    return NextResponse.json(
      { error: "server_error", message: "Something went wrong" },
      { status: 500 }
    );
  }
}
