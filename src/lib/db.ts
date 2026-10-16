import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof prismaClientSingleton> | undefined;
};

// Prisma diagnostics may include query parameters, result rows or private inputs.
// Subscribe as events and log stable messages rather than the raw ORM diagnostic.
const prismaClientSingleton = () => {
  const datasourceUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
  if (datasourceUrl) {
    if (
      datasourceUrl.hostname.endsWith(".pooler.supabase.com") &&
      datasourceUrl.port === "6543" &&
      datasourceUrl.searchParams.get("pgbouncer") === "true"
    ) {
      datasourceUrl.port = "5432";
      datasourceUrl.searchParams.delete("pgbouncer");
    }
    if (!datasourceUrl.searchParams.has("connection_limit")) datasourceUrl.searchParams.set("connection_limit", "12");
    if (!datasourceUrl.searchParams.has("pool_timeout")) datasourceUrl.searchParams.set("pool_timeout", "20");
  }
  const client = new PrismaClient({
    log: [{ level: "error", emit: "event" }, { level: "warn", emit: "event" }],
    datasourceUrl: datasourceUrl?.toString(),
  });
  client.$on("error", () => console.error("ANS database operation failed."));
  client.$on("warn", () => console.warn("ANS database warning."));
  return client.$extends({ result: {
    user: { quotaPoints: { needs: { quotaPoints: true }, compute: (row) => Number(row.quotaPoints) } },
    run: { costPoints: { needs: { costPoints: true }, compute: (row) => Number(row.costPoints) } },
    workflowRun: { costPoints: { needs: { costPoints: true }, compute: (row) => Number(row.costPoints) } },
    quotaLedger: {
      amount: { needs: { amount: true }, compute: (row) => Number(row.amount) },
      balanceAfter: { needs: { balanceAfter: true }, compute: (row) => row.balanceAfter === null ? null : Number(row.balanceAfter) },
    },
    apiComputeRequest: {
      authorizedPoints: { needs: { authorizedPoints: true }, compute: (row) => Number(row.authorizedPoints) },
      settledPoints: { needs: { settledPoints: true }, compute: (row) => row.settledPoints === null ? null : Number(row.settledPoints) },
    },
    computeTask: {
      authorizedPoints: { needs: { authorizedPoints: true }, compute: (row) => Number(row.authorizedPoints) },
      settledPoints: { needs: { settledPoints: true }, compute: (row) => row.settledPoints === null ? null : Number(row.settledPoints) },
    },
  } });
};

export const db = globalForPrisma.prisma ?? prismaClientSingleton();

// Always reuse the same instance to prevent connection pool exhaustion.
globalForPrisma.prisma = db;

export type DbTransaction = Omit<typeof db, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
