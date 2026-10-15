/** Run only against an explicitly approved server environment. Never prints credentials or storage paths. */
import { db } from "../src/lib/db";
import { reconcileEvidenceReservations } from "../src/server/competitions/agrihackathon/evidence-maintenance";
const apply = process.argv.includes("--apply");
if (apply && process.env.ANS_AGRI_EVIDENCE_MAINTENANCE_CONFIRM !== "retire-unbound-after-48h")
    throw new Error("Explicit retention authorization is required before applying cleanup.");
reconcileEvidenceReservations(apply).then(value => console.log(JSON.stringify(value))).catch(() => { console.error("Evidence maintenance failed; no reservation is released without successful exact-namespace cleanup."); process.exitCode = 1; }).finally(() => db.$disconnect());
