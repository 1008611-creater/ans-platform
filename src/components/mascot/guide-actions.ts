export type GuideAction = { href: string; title: string; detail: string; icon: "project" | "video" | "credits" | "team" | "discover" | "learn" };
type ActionKey = "discover" | "project" | "video" | "learn" | "competition" | "credits" | "workspace" | "team" | "hub" | "community" | "market";
const copy: Record<ActionKey, { href: string; icon: GuideAction["icon"];  }> = {
  discover: { href: "/explore", icon: "discover" },
  project: { href: "/projects#new-project", icon: "project" },
  video: { href: "/hubs/aigc", icon: "video" },
  hub: { href: "/hubs", icon: "learn" },
  community: { href: "/community", icon: "team" },
  market: { href: "/market", icon: "discover" },
  learn: { href: "/vibe-hub", icon: "learn" },
  competition: { href: "/competitions", icon: "team" },
  credits: { href: "/workspace/credits", icon: "credits" },
  workspace: { href: "/workspace", icon: "project" },
  team: { href: "/teams", icon: "team" },
};
type Translator = (key: string) => string;
function actions(keys: ActionKey[], t: Translator): GuideAction[] { return keys.map(key => { const a = copy[key], label = key.charAt(0).toUpperCase() + key.slice(1); return { href: a.href, icon: a.icon, title: t(`action${label}Title`), detail: t(`action${label}Detail`) }; }); }
export function pageContextKey(path: string) {
  if (path.startsWith("/workspace/credits")) return "pageContext.credits";
  if (path.startsWith("/projects") || path.startsWith("/workspace")) return "pageContext.workspace";
  if (path.startsWith("/hubs") || path.startsWith("/workflows")) return "pageContext.hub";
  if (path.startsWith("/community")) return "pageContext.community";
  if (path.startsWith("/market")) return "pageContext.market";
  if (path.startsWith("/competitions") || path.startsWith("/teams")) return "pageContext.competition";
  if (path.startsWith("/vibe-hub")) return "pageContext.learning";
  return "pageContext.explore";
}
export function pageActions(path: string, t: Translator) {
  const keys: ActionKey[] = path.startsWith("/workspace/credits") ? ["workspace", "hub"]
    : path.startsWith("/workflows") || path.startsWith("/hubs") ? ["workspace", "discover"]
    : path.startsWith("/competitions") || path.startsWith("/teams") ? ["team", "project"]
    : path.startsWith("/projects") || path.startsWith("/workspace") ? ["hub", "discover"]
    : path.startsWith("/vibe-hub") ? ["project", "hub"]
    : path.startsWith("/market") ? ["hub", "workspace"]
    : path.startsWith("/community") ? ["project", "discover"]
    : ["hub", "project"];
  return actions(keys, t);
}
export function pagePrompts(path: string, t: Translator) {
  const key = pageContextKey(path).slice("pageContext.".length);
  const prompts: Record<string, string[]> = {
    credits: ["promptCredits", "promptWorkflow", "promptFirstStep"],
    workspace: ["promptTasks", "promptProject", "promptWorkflow"],
    hub: ["promptWorkflow", "promptInputs", "promptRunWhere"],
    community: ["promptCommunity", "promptShare", "promptProject"],
    market: ["promptMarketplace", "promptWorkflow", "promptCredits"],
    competition: ["promptCompetition", "promptTeam", "promptPitch"],
    learning: ["promptLearn", "promptFirstStep", "promptProject"],
    explore: ["promptRecommend", "promptFirstStep", "iWantToMakeAVideo"],
  };
  return prompts[key].map(item => t(item));
}
export function guideReply(input: string, t: Translator): { text: string; actions: GuideAction[] } {
  const line = input.toLowerCase();
  let keys: ActionKey[], reply: string;
  if (/hub|工作流|workflow|学校|方向入口/.test(line)) { keys = ["hub", "workspace"]; reply = "replyHub"; }
  else if (/社区|成长记录|分享|community|share/.test(line)) { keys = ["community", "project"]; reply = "replyCommunity"; }
  else if (/市场|购买|交易|market|purchase/.test(line)) { keys = ["market", "hub"]; reply = "replyMarket"; }
  else if (/积分|余额|充值|账单|收费|credits|balance|billing|price/.test(line)) { keys = ["credits"]; reply = "reply1"; }
  else if (/视频|图片|短剧|创作|配音|video|image|create|creative/.test(line)) { keys = ["video", "workspace"]; reply = "reply2"; }
  else if (/比赛|参赛|赛事|competition|hackathon/.test(line)) { keys = ["competition", "team"]; reply = "reply3"; }
  else if (/团队|组队|协作|team|collaborat/.test(line)) { keys = ["team", "project"]; reply = "reply4"; }
  else if (/学习|术语|概念|怎么用|learn|concept|vibehub/.test(line)) { keys = ["learn", "discover"]; reply = "reply5"; }
  else if (/发现|推荐|开源|github|灵感|discover|recommend|inspir|open.source/.test(line)) { keys = ["discover", "project"]; reply = "reply6"; }
  else if (/项目|开始|工作台|做什么|project|start|workspace/.test(line)) { keys = ["project", "workspace"]; reply = "reply7"; }
  else if (/你好|嗨|hello|hey|hi\b/.test(line)) { keys = ["project", "discover"]; reply = "reply8"; }
  else { keys = ["discover", "video", "learn"]; reply = "reply9"; }
  return { text: t(reply), actions: actions(keys, t) };
}
