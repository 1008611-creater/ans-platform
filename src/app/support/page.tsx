"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ExternalLink, MessageCircleQuestion, ChevronDown, Activity, BookOpen, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const GITHUB_ISSUE_BASE_URL = "https://github.com/1008611-creater/ans-platform/issues/new";

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left font-medium hover:text-primary transition-colors"
      >
        {question}
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
      <div className={cn("overflow-hidden transition-all duration-200", isOpen ? "pb-4" : "max-h-0")}>
        <p className="text-muted-foreground whitespace-pre-line">{answer}</p>
      </div>
    </div>
  );
}

interface SupportFormProps {
  t: ReturnType<typeof useTranslations<"support">>;
}

function SupportForm({ t }: SupportFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const buildGitHubUrl = () => {
    const params = new URLSearchParams();
    params.set("title", title || "Support Request");
    params.set("body", description || "Please describe your issue or question here...");
    return `${GITHUB_ISSUE_BASE_URL}?${params.toString()}`;
  };

  return (
    <section className="border rounded-lg p-6 bg-muted/30">
      <h2 className="text-lg font-semibold mb-2">{t("contact.title")}</h2>
      <p className="text-muted-foreground mb-6">
        {t("contact.description")}
      </p>

      <div className="space-y-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="issue-title">{t("contact.form.title")}</Label>
          <Input
            id="issue-title"
            placeholder={t("contact.form.titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="issue-description">{t("contact.form.description")}</Label>
          <Textarea
            id="issue-description"
            placeholder={t("contact.form.descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />
        </div>
      </div>

      <Button asChild>
        <a 
          href={buildGitHubUrl()} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          {t("contact.openIssue")}
        </a>
      </Button>
    </section>
  );
}

export default function SupportPage() {
  const t = useTranslations("support");

  const quickCards = [
    {
      href: "/competitions",
      img: "/competitions/agrihackathon/gitglow-hub.webp",
      title: "赛事中心与团队算力",
      desc: "查看智耕黑客松、AIGC 创作赛道及团队额度申领说明。",
    },
    {
      href: "/workspace/benefits",
      img: "/catalog/ans-pro-v1/ans-3d-showcase.webp",
      title: "福利中心与 3D 兔兔龙展台",
      desc: "新手问卷、3D 抓娃娃机、兔兔龙互动与算力兑换码。",
    },
    {
      href: "/vibe-hub",
      img: "/catalog/ans-pro-v1/infinite-canvas.webp",
      title: "VibeHub 知识库与指南",
      desc: "查阅术语词典、操作指南、课程与实践路线。",
    },
  ];

  const faqItems = [
    {
      question: "ANS 平台的算力积分（Points）如何获取与使用？",
      answer: "注册登录即可在「福利中心」完成 30 秒新手问卷、操纵 3D 抓娃娃机或使用兑换码领取算力积分；报名参加黑客松或高校赛事的团队可在「团队」页面共享队长分配的参赛额度，用于运行工作流与在线大模型。",
    },
    {
      question: "如何组队参加智耕黑客松或 AIGC 创作赛并提交作品？",
      answer: "前往「团队」页面创建或加入队伍，在「赛事」中心查看赛题数据集与阶段交付要求，完成后通过「提交项目」页面上传真实可验证的作品链接与说明。",
    },
    {
      question: "右下角 3D 兔兔龙如何换装、投喂和触发特技？",
      answer: "点击页面右下角 3D 兔兔龙即可唤出互动面板（支持摸头、喂食、换装与近景特写）；在「福利中心」还可展开完整 3D 抓娃娃机与互动展台。",
    },
    {
      question: "发现页面或服务异常时如何排查？",
      answer: "可先访问「系统状态」页面查看各节点实时健康度，或在下方填写问题标题与复现步骤直接提交 Issue。",
    },
  ];

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/status" className="inline-flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              <span>系统状态</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/privacy" className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>隐私政策</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/terms" className="inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              <span>服务条款</span>
            </Link>
          </Button>
        </div>
      </div>

      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        {quickCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/50"
          >
            <img src={card.img} alt={card.title} loading="lazy" className="aspect-[16/9] w-full border-b object-cover object-top" />
            <div className="p-4">
              <h2 className="text-sm font-semibold group-hover:text-primary">{card.title}</h2>
              <p className="mt-1 hidden text-xs leading-5 text-muted-foreground group-hover:block">{card.desc}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5" />
          {t("faq.title")}
        </h2>
        
        <div className="border rounded-lg px-4">
          {faqItems.map((item, index) => (
            <FAQItem key={index} question={item.question} answer={item.answer} />
          ))}
        </div>
      </section>

      <SupportForm t={t} />
    </div>
  );
}
