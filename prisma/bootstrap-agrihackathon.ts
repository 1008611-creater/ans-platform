import { PrismaClient } from "@prisma/client";
import { bootstrapAgriEditionInTx, DEFAULT_AGRI_EDITION_ID, resolveAgriBootstrapMode } from "../src/server/competitions/agrihackathon/bootstrap";

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
  const { draftOnly, provisionInitial, provisionRules } = resolveAgriBootstrapMode(process.argv);
  const competitionId = (
    parseArgValue("--competition-id") ||
    process.env.ANS_AGRIHACKATHON_COMPETITION_ID ||
    DEFAULT_AGRI_EDITION_ID
  ).trim();
  if (!competitionId || competitionId.length > 80) {
    throw new Error("ANS_AGRIHACKATHON_COMPETITION_ID 长度必须在 1 到 80 个字符之间。");
  }

  console.log(`[agri-bootstrap] Target competitionId: ${competitionId}`);
  if (provisionRules) {
    console.warn("[agri-bootstrap] --provision-rules: publishing placeholder Rule v1 (deadlines = now + 60/90 days). Replace them with the organizer's real dates in the management workspace.");
  }

  await prisma.$transaction(
    async tx => {
      await bootstrapAgriEditionInTx(tx, { competitionId, draftOnly, provisionInitial, provisionRules, silent: false });
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
