import { PrismaClient } from "@prisma/client";
import { bootstrapAgriEditionInTx, DEFAULT_AGRI_EDITION_ID } from "../src/server/competitions/agrihackathon/bootstrap";

const prisma = new PrismaClient();

function parseArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index >= 0 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  const inline = process.argv.find(arg => arg.startsWith(`${flag}=`));
  return inline ? inline.slice(flag.length + 1) : undefined;
}

async function main() {
  const draftOnly = process.argv.includes("--draft-only") || process.env.AGRI_BOOTSTRAP_DRAFT_ONLY === "true";
  const competitionId = (
    parseArgValue("--competition-id") ||
    process.env.ANS_AGRIHACKATHON_COMPETITION_ID ||
    DEFAULT_AGRI_EDITION_ID
  ).trim();
  if (!competitionId || competitionId.length > 80) {
    throw new Error("ANS_AGRIHACKATHON_COMPETITION_ID 长度必须在 1 到 80 个字符之间。");
  }

  console.log(`[agri-bootstrap] Target competitionId: ${competitionId}`);

  await prisma.$transaction(
    async tx => {
      await bootstrapAgriEditionInTx(tx, { competitionId, draftOnly, silent: false });
    },
    { maxWait: 30000, timeout: 60000 },
  );

  console.log("[agri-bootstrap] Done.");
}

main()
  .catch(error => {
    console.error("[agri-bootstrap] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
