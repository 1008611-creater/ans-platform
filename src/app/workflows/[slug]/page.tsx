import { ProductConnectionsSection } from "@/components/catalog/product-connections";
import { getWorkflowConnections } from "@/server/catalog/connections";
import { WorkflowHubAssociations } from "@/components/workflows/workflow-hub-associations";
import { WorkflowMarketUpload } from "@/components/workflows/workflow-market-upload";
import { WorkflowDetailFlow } from "@/components/workflows/workflow-detail-flow";
import styles from "@/components/workflows/workflow-detail.module.css";
import { isWorkflowMarketAvailable } from "@/server/marketplace/workflow-binding";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { MarketWorkflowRun } from "@/components/marketplace/workflow-run";
import { unifiedModelBilling } from "@/server/integrations/metered-cost";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, FileOutput, Play, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { WorkflowRunForm } from "@/components/workflows/workflow-run-form";
import { auth } from "@/lib/auth";
import { getPublicDisplayName } from "@/lib/public-identity";
import { extractInputVariables } from "@/domain/workflows/variables";
import { validateWorkflow } from "@/domain/workflows/graph";
import { assertSupportedRecipe } from "@/domain/workflows/recipes";
import { workflowDefinitionSchema } from "@/contracts/workflow";
import { listCredentials } from "@/server/credentials/service";
import { isFavorited } from "@/server/favorites/service";
import { getPublishedWorkflow } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

function readableDefinition(value: unknown) {
  const parsed = workflowDefinitionSchema.safeParse(value);
  if (!parsed.success || !validateWorkflow(parsed.data).ok) return null;
  try { assertSupportedRecipe(parsed.data); return parsed.data; }
  catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [workflow, t] = await Promise.all([getPublishedWorkflow(slug), getTranslations("product.workflowDetail")]);
  if (!workflow) return { title: t("notFoundTitle") };
  return { title: t("metadataTitle", { title: workflow.title }), description: workflow.summary ?? workflow.description ?? t("metadataDescription") };
}

export default async function WorkflowDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const workflow = await getPublishedWorkflow(slug);
  if (!workflow) notFound();

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const definition = readableDefinition(workflow.publishedDefinition);
  const variables = definition ? extractInputVariables(definition) : [];
  const [credentials, favorited, t, billing, w, connections] = await Promise.all([
    userId && process.env.ANS_APIC_BILLING_ENABLED !== "1" ? listCredentials(userId).catch(() => []) : Promise.resolve([]),
    userId ? isFavorited(userId, "WORKFLOW", workflow.id) : Promise.resolve(false),
    getTranslations("product.workflowDetail"), getTranslations("learning"), getTranslations("marketWorkflow"), getWorkflowConnections(workflow),
  ]);
  const version = workflow.publishedVersion ?? 1;
  const cost = process.env.ANS_APIC_BILLING_ENABLED === "1" ? Math.max(0.25, (definition?.nodes.filter(node => node.type === "model").length ?? 1) * 0.25) : Math.max(1, workflow.estimatedCost);
  const metered = unifiedModelBilling();
  const owner = userId === workflow.author.id;
  const marketAvailable = owner ? await isWorkflowMarketAvailable(workflow.id, userId!) : false;
  const order = definition ? validateWorkflow(definition).executionOrder : [];
  const finalNode = definition?.nodes.find(node => node.id === order.at(-1));
  const isResume = definition?.recipe === "resume-website-v1";
  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/workflows/${workflow.slug}`)}`;

  return <div className="ans-product-shell"><article className={`ans-product-container ans-page-content ${styles.page}`}>
    <nav aria-label={t("breadcrumb")} className={styles.back}><Link href="/workflows"><ArrowLeft size={15} aria-hidden="true" />{t("back")}</Link></nav>
    <header className={styles.hero}>
      <div className={styles.heroContent}>
        <div className={styles.statusRow}><span className={styles.kicker}>{t("eyebrow")}</span><Badge variant="secondary">{t("published")}</Badge><Badge variant="outline">v{version}</Badge></div>
        <h1>{workflow.title}</h1>
        {workflow.summary && <p className={styles.summary}>{workflow.summary}</p>}
        <p className={styles.author}>{workflow.isOfficial ? w("platformMaintained") : t("author", { name: getPublicDisplayName(workflow.author) })}<span aria-hidden="true">·</span>{t("runCount", { count: workflow.useCount })}</p>
        <div className={styles.heroActions}><FavoriteButton accountId={userId} targetType="WORKFLOW" targetId={workflow.id} initialFavorited={favorited} /><Link href="/workflows/runs">{t("records")}<ArrowRight size={14} aria-hidden="true" /></Link></div>
      </div>
      <div className={styles.delivery}>
        <FileOutput size={24} className={styles.deliveryIcon} aria-hidden="true" />
        <p className={styles.kicker}>{t("deliveryEyebrow")}</p>
        <h2>{isResume ? t("resumeOutput") : finalNode?.label ?? t("unavailableOutput")}</h2>
        <p className={styles.deliveryBody}>{isResume ? t("resumeOutputBody") : definition ? t("genericOutputBody") : t("unavailableBody")}</p>
        {definition && <><div className={styles.deliveryMeta}><span>{t("immutableVersion", { version })}</span><span>{metered ? w("computeOnRun") : billing("billingReservation", { points: cost })}</span></div><Button asChild className={styles.runLink}><Link href="#workflow-run"><Play size={15} aria-hidden="true" />{t("prepareRun")}</Link></Button></>}
      </div>
    </header>

    <ProductConnectionsSection connections={connections} />
    <nav className={styles.sectionNav} aria-label={t("sections")}>
      <Link href="#workflow-preparation">{t("preparationTitle")}</Link>
      {definition && <Link href="#workflow-process">{t("processTitle")}</Link>}
      <Link href="#workflow-run">{t("runTitle")}</Link>
      <Link href="#workflow-conditions">{t("conditionsTitle")}</Link>
    </nav>

    <div className={styles.overview}>
      <div className={styles.mainColumn}>
        {workflow.description && <section className={styles.section} aria-labelledby="workflow-description-title"><div className={styles.sectionHeading}><div><p className={styles.kicker}>{t("instructionsEyebrow")}</p><h2 id="workflow-description-title">{t("instructionsTitle")}</h2></div></div><p className={styles.description}>{workflow.description}</p></section>}
        {definition ? <WorkflowDetailFlow definition={definition} /> : <section className={styles.unavailable} role="status"><h2>{t("unavailableTitle")}</h2><p>{t("unavailableBody")}</p></section>}
      </div>
      <aside id="workflow-preparation" className={styles.preparation} aria-labelledby="workflow-preparation-title">
        <p className={styles.kicker}>{t("preparationEyebrow")}</p><h2 id="workflow-preparation-title">{t("preparationTitle")}</h2>
        {definition ? <>
          {isResume ? <ul className={styles.inputList}><li><strong>{t("resumeFacts")}</strong><p>{t("resumeFactsBody")}</p></li><li><strong>{t("resumeProjects")}</strong><p>{t("resumeProjectsBody")}</p></li><li><strong>{t("resumePreferences")}</strong><p>{t("resumePreferencesBody")}</p></li></ul> : variables.length > 0 ? <ul className={styles.inputList}>{variables.map(variable => <li key={variable.key}><div className={styles.inputTitle}><strong>{variable.label}</strong><span>{t(variable.required ? "required" : "optional")}</span></div>{variable.hint && <p>{variable.hint}</p>}</li>)}</ul> : <p className={styles.preparationBody}>{t("noVariables")}</p>}
          <div className={styles.reviewPrompt}><ShieldCheck size={17} aria-hidden="true" /><div><h3>{t("yourChoices")}</h3><p>{isResume ? t("resumeChoices") : t("genericChoices")}</p></div></div>
        </> : <p className={styles.preparationBody}>{t("unavailableBody")}</p>}
      </aside>
    </div>

    <section id="workflow-run" className={styles.runSection} aria-labelledby="workflow-run-title">
      <div className={styles.sectionHeading}><div><p className={styles.kicker}>{t("runEyebrow")}</p><h2 id="workflow-run-title">{t("runTitle")}</h2></div><span className={styles.smallMeta}>{t("immutableVersion", { version })}</span></div>
      {!definition ? <p className={styles.unavailable}>{t("unavailableBody")}</p> : userId ? <MarketAccountBoundary actorId={userId}>{definition.recipe ? <MarketWorkflowRun listingId={workflow.id} workflowSlug={workflow.slug} version={version} details={{ recipe: definition.recipe, variables, version, estimatedCost: metered ? null : cost }} /> : <WorkflowRunForm slug={workflow.slug} variables={variables} estimatedCost={metered ? null : cost} credentials={credentials.map(credential => ({ id: credential.id, label: credential.label, keyMasked: credential.keyMasked }))} />}</MarketAccountBoundary> : <div className={styles.loginPanel}><div><h3>{t("loginTitle")}</h3><p>{t("loginBody")}</p><p className={styles.smallMeta}>{metered ? w("meteredCost") : billing("billingExplanation", { points: cost })}</p></div><Button asChild><Link href={loginHref}>{t("loginAction")}<ArrowRight size={15} aria-hidden="true" /></Link></Button></div>}
    </section>

    <section id="workflow-conditions" className={styles.conditions} aria-labelledby="workflow-conditions-title"><h2 id="workflow-conditions-title">{t("conditionsTitle")}</h2><ul><li>{metered ? w("meteredCost") : billing("billingExplanation", { points: cost })}</li><li>{t("executionLimit")}</li><li>{t("versionNotice")}</li><li>{t("privacyNotice")}</li><li>{t("reviewNotice")}</li></ul></section>

    {definition && <details className={styles.rawDefinition}><summary>{t("rawDefinition")}</summary><div><h3>{t("variables")}</h3><pre>{JSON.stringify(variables, null, 2)}</pre><h3>{t("publishedDefinition")}</h3><pre>{JSON.stringify(definition, null, 2)}</pre></div></details>}
    {owner && <section className={styles.ownerSection} aria-labelledby="workflow-owner-title"><h2 id="workflow-owner-title">{t("ownerTitle")}</h2><MarketAccountBoundary actorId={userId!}><WorkflowHubAssociations actorId={userId!} slug={workflow.slug} /><WorkflowMarketUpload slug={workflow.slug} version={version} available={marketAvailable} /></MarketAccountBoundary></section>}
  </article></div>;
}
