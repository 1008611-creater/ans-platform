import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createExecutionPlan, WorkflowValidationError } from "@/domain/workflows/engine";

function requestId() {
  return crypto.randomUUID();
}

export async function POST(request: Request) {
  const id = requestId();

  try {
    const body: unknown = await request.json();
    const plan = createExecutionPlan(body);

    return NextResponse.json({
      ok: true,
      data: {
        order: plan.order,
        nodes: plan.nodes.map((node) => ({ id: node.id, type: node.type })),
      },
      requestId: id,
    });
  } catch (error) {
    if (error instanceof WorkflowValidationError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "WORKFLOW_INVALID",
            message: "工作流定义无法执行。",
            details: error.issues,
          },
          requestId: id,
        },
        { status: 422 },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "WORKFLOW_SCHEMA_INVALID",
            message: "工作流输入格式不正确。",
            details: error.issues,
          },
          requestId: id,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "WORKFLOW_VALIDATION_FAILED",
          message: "工作流校验失败。",
        },
        requestId: id,
      },
      { status: 500 },
    );
  }
}

