import { db } from "@/lib/db";

/**
 * 健康检查：只做一次最轻量的连通性探测。
 *
 * 返回值刻意保持「永不抛出」：探测失败本身就是要报告的信息，
 * 抛异常会让 /api/health 变成 500，反而看不出是数据库不可用。
 */
export type HealthProbe = {
  status: "healthy" | "unhealthy";
  timestamp: string;
  database: "connected" | "disconnected";
  error?: string;
};

export async function probeDatabase(): Promise<HealthProbe> {
  const timestamp = new Date().toISOString();
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: "healthy", timestamp, database: "connected" };
  } catch (error) {
    return {
      status: "unhealthy",
      timestamp,
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}