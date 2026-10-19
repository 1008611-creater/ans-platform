const sensitivePatterns = [
  /^Reconnecting\.\.\.\s+\d+\s*\/\s*\d+\s*$/gim,
  /\bunexpected status\s+\d+\b/gi,
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\b(?:sk|sess|fe_oa|ak)[-_][A-Za-z0-9._*-]{12,}\b/gi,
  /\b(?:request id|request_id|req)[\s:=_-]+[A-Za-z0-9._-]{12,}/gi,
  /\bcf-ray[:\s]+[A-Za-z0-9-]+/gi,
  /https:\/\/api\.openai\.com\/[^\s,，。)）]+/gi
];

const authFailurePattern =
  /(?:401|unauthorized|incorrect api key|invalid api key|api key provided|鉴权失败|认证失败|授权失败)/i;
const timeoutPattern = /(?:504|timeout|timed out|gateway|网关|超时|connect timeout|fetch failed)/i;
const doubaoRateLimitPattern = /(?:710022002|710022004|访问频繁|当前服务访问频繁|稍后重试|rate limited)/i;
const doubaoLoginRequiredPattern = /(?:doubao2api.*未登录|未登录|登录已失效|need login|not logged in|browser not ready|visit \/auth|扫码登录|备用账号尚未登录)/i;
const busyPattern = /(?:429|500|502|503|bad gateway|service unavailable|too many requests|rate limit|上游|繁忙)/i;
const providerErrorPattern = /(?:openai_error|provider error|api error|upstream error|model error|generation error)/i;
const internalAccountSetupPattern =
  /(?:Supabase|publishable|anon key|service role|secret\/service role|会员系统未配置完整|账号入口未配置完整)/i;
const image2GachaSetupPattern =
  /(?:抽卡数据库还未完成迁移|image2_gacha_runs|image2_gacha_recipes|202606030001_image2_gacha_runs|Could not find the table 'public\.image2_gacha|schema cache)/i;

export function toUserFacingError(value: unknown, fallback = "操作失败，请稍后重试。") {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  if (image2GachaSetupPattern.test(raw)) {
    return "抽卡服务正在接入案例库账号系统，收藏夹和图片额度已经连上，抽卡记录库还在开通中。请稍后再试，已收藏的源图不会丢。";
  }

  if (internalAccountSetupPattern.test(raw)) {
    return "账号服务暂时不可用，请稍后再试。";
  }

  if (authFailurePattern.test(raw)) {
    return "AI 服务鉴权失败，请检查后台 API Key 配置后重试。";
  }

  if (timeoutPattern.test(raw)) {
    return "图片生成排队或耗时过长，本次请求没有等到结果。通常 60-90 秒会完成，请稍后重试；页面已经改成持续等待模式，会尽量避免静默超时。";
  }

  if (doubaoRateLimitPattern.test(raw)) {
    return "豆包账号当前访问频繁，本次任务没有扣额度。请先等 5-10 分钟再试；如果连续出现，换一个已登录账号或降低提交频率。";
  }

  if (doubaoLoginRequiredPattern.test(raw)) {
    return "doubao2api 账号未登录或登录已失效。请在右侧“本地通道”面板打开对应账号的登录页，扫码后再提交。";
  }

  if (busyPattern.test(raw)) {
    return "图片生成服务当前繁忙或临时失败，本次没有拿到结果。请稍等一会再点生成；如果提示词很长，可以先换一个短提示词测试。";
  }

  if (providerErrorPattern.test(raw)) {
    return "图片生成服务临时返回错误，本次没有拿到结果。请稍后重试，或切换另一条生成通道。";
  }

  let message = raw;
  for (const pattern of sensitivePatterns) {
    message = message.replace(pattern, "[已隐藏]");
  }
  message = message
    .replace(/\[已隐藏\](?:\s*,\s*|\s*，\s*|\s*。?\s*)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!message || message === "[已隐藏]" || message.length > 180) {
    return fallback;
  }

  return message;
}
