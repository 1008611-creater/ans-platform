/** Explicitly prepare a disabled workspace for an existing, confirmed competition.
 * Never creates event facts, grants permissions, publishes rules or opens windows.
 */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const index = process.argv.indexOf("--competition-id");
  const competitionId = index >= 0 ? process.argv[index + 1] : undefined;
  if (!competitionId || competitionId.startsWith("--") || competitionId !== competitionId.trim() || competitionId.length > 80) {
    throw new Error("Provide an existing confirmed competition with --competition-id <id>.");
  }
  const configured = process.env.ANS_AGRIHACKATHON_COMPETITION_ID?.trim();
  if (configured && configured !== competitionId) {
    throw new Error("Explicit competition does not match the configured edition.");
  }
  await prisma.$transaction(async (tx) => {
    const competition = await tx.competition.findUnique({ where: { id: competitionId }, select: { id: true } });
    if (!competition) throw new Error("Competition must already exist. No event has been created.");
    await tx.$executeRaw`
      INSERT INTO agri_workspaces (id, "competitionId")
      VALUES (${randomUUID()}, ${competitionId})
      ON CONFLICT ("competitionId") DO NOTHING
    `;
  });
  console.log("Workspace prepared. Existing rules, permissions and publication state preserved.");
}

main()
  .catch(() => {
    console.error("Workspace preparation failed. Check the explicit competition and database privately.");
    process.exitCode = 1;
  })
  .finally(async () => { await prisma.$disconnect(); });
