---
name: tokenrhythm-quota
description: |
  查询 tokenrhythm.studio（中转渠道）账号的剩余额度 / 余额 / 调用明细，以及批量接入多个账号到 WorkBuddy/CodeBuddy 自定义模型配置。
  触发词：「查额度」「tokenrhythm 额度」「sk_tr 余额」「中转渠道还剩多少」「tokenrhythm 余额」「接入 tokenrhythm」「把 key 接入」「批量查额度」「多账号接入」。
  关键事实：API Key（sk_tr_ 开头）本身查不到账户余额，必须改用网站登录态 sess_ 令牌当 Bearer 鉴权。
---

# tokenrhythm 账号操作手册

## 一、额度查询

### 适用场景
用户给出 tokenrhythm.studio 中转渠道的一组凭据（手机号 / `sess_xxx` 登录态 / `sk_tr_xxx` API Key 三者之一或全部），要查「还剩多少额度」「余额多少」「调用了多少次」。

### 核心事实（务必记住）
- 查余额的接口是网站侧接口，不是 API Key 接口。
- **API Key（`sk_tr_` 开头）不能查余额**，只能用来发起模型调用。
- **能查余额的是网站登录态令牌 `sess_xxx`**，作为 `Authorization: Bearer <sess>` 调用。
- 用户常误以为 `sk_tr_` 能查余额 —— 直接纠正：必须走登录态。
- 手机号 / 用户名只是账户标识回填，不参与鉴权。
- sess 令牌有有效期，过期后需要用户重新从网站登录后复制。

### 接口与鉴权
- 方法 / 地址：`GET https://tokenrhythm.studio/api/usage-summary`
- 鉴权头：`Authorization: Bearer <sess_令牌>`
- 响应：`application/json`，结构见下方「返回字段」。

### 单账号查询（执行步骤）
1. 向用户索取 `sess_xxx` 网站登录态令牌（若用户只给了 `sk_tr_`，明确告知换不成，需要登录态）。
2. 用环境变量传入 SESS，避免命令行泄露明文：

```bash
TR_SESS="sess_此处替换" node -e "
const SESS = process.env.TR_SESS;
fetch('https://tokenrhythm.studio/api/usage-summary', {
  headers: { authorization: 'Bearer ' + SESS, accept: 'application/json' },
  redirect: 'manual', signal: AbortSignal.timeout(20000),
}).then(r => r.text().then(b => console.log('status='+r.status+' body='+b.slice(0,1500))));
"
```

3. `status` 非 200 时按「异常处理」排查；200 则解析 `data` 字段。

### 批量查询（多个账号）
当用户给出多个 `sess_` 令牌或多个账号的完整凭据时，用脚本批量核查并给出汇总表：

```bash
cat > _batch.mjs <<'SCRIPT'
const ACCOUNTS = [
  # 每个账号：{ n: 1, phone: "手机号", sess: "sess_xxx", sk: "sk_tr_xxx" },
];
async function check(a) {
  try {
    const r = await fetch("https://tokenrhythm.studio/api/usage-summary", {
      headers: { authorization: `Bearer ${a.sess}`, accept: "application/json" },
      redirect: "manual", signal: AbortSignal.timeout(20000),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.code !== 0) return { ...a, status: r.status, err: j?.message || "bad" };
    const d = j.data;
    return { ...a, available: d.availableBalanceCny, expiring: d.expiringBalanceCny, nextExpiry: d.nextExpiryAt, cost: d.costCny, calls: d.calls, success: d.successCalls, error: d.errorCalls };
  } catch (e) { return { ...a, err: e?.message?.slice(0, 120) }; }
}
const results = await Promise.all(ACCOUNTS.map(check));
for (const r of results) {
  if (r.err) { console.log(`#${r.n} ${r.phone} ERR ${r.err}`); continue; }
  const is68 = Math.abs(Number(r.available) - 68) < 0.01;
  console.log(`#${r.n} ${r.phone} 可用¥${r.available} 即将过期¥${r.expiring} 到期${r.nextExpiry} 累计耗¥${r.cost} 调用${r.calls}(成功${r.success}/失败${r.error})`);
}
SCRIPT
TR_SESS="sess_xxx" node _batch.mjs
rm -f _batch.mjs
```

### 返回字段（data 内，单位均为人民币 CNY / token 数）
| 字段 | 含义 |
|---|---|
| `availableBalanceCny` | 可用余额（用户最关心的「还剩多少」）|
| `balanceCny` | 总余额 |
| `frozenBalanceCny` | 冻结金额 |
| `expiringBalanceCny` | 即将过期余额 |
| `nextExpiryAt` | 最近一笔过期时间（ISO8601 UTC）|
| `costCny` / `tokenCostCny` / `imageCostCny` | 累计已消耗（总 / token / 图片）|
| `calls` / `successCalls` / `errorCalls` / `abortedCalls` | 累计调用 / 成功 / 失败 / 中止 |
| `inputTokens` / `outputTokens` | 累计输入 / 输出 token |
| `currency` | 币种，通常为 `CNY` |

### 输出话术模板（给用户）
结论先行，结构化呈现：
- 账号（若用户提供）：用户名 / 手机尾号
- 可用余额：¥<availableBalanceCny>
- 总余额 / 冻结：¥<balanceCny> / ¥<frozenBalanceCny>
- 累计已消耗：¥<costCny>
- 累计调用：<calls> 次（成功 <successCalls>，失败 <errorCalls>，中止 <abortedCalls>）
- 累计用量：输入 <inputTokens> token / 输出 <outputTokens> token
- ⚠️ 到期提醒：若 `expiringBalanceCny` 接近 `availableBalanceCny`，高亮「¥XXX 将于 <nextExpiryAt 转本地时间> 到期清零，要用的趁早」。

批量查询时输出汇总表，逐账号列出上述字段，最后标注「是否全部满额」。

### 异常处理
- `401` / `AUTH_REQUIRED`：sess 令牌失效或填错 —— 让用户重新从 tokenrhythm 网站登录后复制登录态（浏览器 Network 里任意请求带的 `Authorization: Bearer sess_...`，或直接复制 cookie 里的 `sess_xxx`）。
- 网络超时 / 无法连接：确认能访问 `tokenrhythm.studio`（有时需代理 / 特殊网络）。
- `code` 非 0：把 `message` / `traceId` 原样回给用户。

---

## 二、接入 models.json（将 tokenrhythm 渠道接入 WorkBuddy / CodeBuddy）

### 适用场景
用户有 tokenrhythm 的 `sk_tr_` API Key，希望把它加进 WorkBuddy 和 CodeBuddy 的 `models.json` 自定义模型配置，让本地 AI 工具能通过这个渠道调用模型。

### 核心约束（务必记住）
- **`id` 必须等于上游 `/v1/models` 返回的真实模型名**，禁止加渠道前缀。例如上游返回 `glm-5.2`，配置里的 `id` 就必须是 `glm-5.2`；写成 `tr1-glm-5.2` 会导致客户端把错误模型名传给上游，报 "Model is not supported by any configured account"。
- **`id` 必须全局唯一**。同一个模型名（如 `glm-5.2`）在配置中只能出现一次，不能为了多个账号重复写入。
- 两份文件 (`%USERPROFILE%\.workbuddy\models.json` + `%USERPROFILE%\.codebuddy\models.json`) 内容必须同步。

### 接入步骤

#### 1. 定位文件
```
%USERPROFILE%\.workbuddy\models.json
%USERPROFILE%\.codebuddy\models.json
```
禁止写死用户名（不用 `C:\Users\lsb\`），始终用 `%USERPROFILE%` 环境变量。

#### 2. 查询上游真实模型列表
用用户提供的 `sk_tr_` key 请求：
```
GET https://tokenrhythm.studio/v1/models
Authorization: Bearer sk_tr_xxx
```
返回的 `data.models[].id` 或 `models[].id` 即为真实模型名。记录用户想要的模型（如 `glm-5.2`、`deepseek-v4-flash`）。

常见 tokenrhythm 模型名（带连字符，用户可能写错格式）：
- `glm-5.2`（不是 `glm5.2`）
- `deepseek-v4-flash`（不是 `deepseekv4flash`）
- `deepseek-v4-pro`
- `glm-5.1`
- `kimi-k2.7-code` / `kimi-k2.6`
- `qwen3.8-max` / `mimo-v2.5-pro` / `seed-2.1-pro` / `minimax-m2.7`

#### 3. 写入配置
读取现有两份 JSON，保留原有所有模型。对于每个要接入的模型 id：
- 若该 `id` 已存在于配置中 → **不新增、不加前缀、不覆盖原渠道，跳过并报告**。
- 若该 `id` 不存在 → 新增一条记录，格式：

```json
{
  "id": "上游真实模型名",
  "name": "渠道显示名（如 tr1、WLAI）",
  "vendor": "tokenrhythm",
  "apiKey": "sk_tr_xxx",
  "url": "https://tokenrhythm.studio/v1/chat/completions",
  "maxInputTokens": 360000,
  "maxOutputTokens": 8192,
  "supportsToolCall": true,
  "supportsImages": true,
  "supportsReasoning": true
}
```

能力字段 `supportsToolCall` / `supportsImages` / `supportsReasoning`：只有确定支持才写 `true`，不确定一律 `false`。

#### 4. 原子替换
- 把完整 JSON 写入临时文件（如 `models.json.tmp`）。
- 校验临时文件是合法 JSON。
- `rename`（原子替换）覆盖原文件。

#### 5. 连通性验证
对新增的至少一个文本模型做最小调用：
```bash
curl -s -X POST https://tokenrhythm.studio/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_tr_xxx" \
  -d '{"model":"glm-5.2","messages":[{"role":"user","content":"ping"}],"max_tokens":8}'
```
期望 `status 200` + 有效 `choices[0].message.content`。

#### 6. 最终验证
- 两份文件都是合法 JSON，模型数量一致。
- 所有新增模型 `id` 与上游 `/v1/models` 返回值一致。
- `id` 全局唯一。
- 已连通性通过。

---

## 三、多账户策略（当用户有多个 tokenrhythm key 时）

### 问题的根源
用户常批量购买多个 tokenrhythm 账户，每个账户都有相同的可用模型（如 `glm-5.2`、`deepseek-v4-flash`）。但 `models.json` 的扁平数组结构要求：
1. **`id` 必须全局唯一** —— 同一个模型名不能出现两次。
2. **`id` 必须等于上游真实模型名** —— 不能通过加后缀（如 `glm-5.2-acct2`）来区分不同账户，因为客户端会把加了后缀的模型名发给上游，导致调用失败。

因此：**同一对模型无法在配置里同时装下多个不同的 tokenrhythm 账号**。

### 推荐策略：一活跃 + 多备用
1. 选其中一个 key 作为「活跃 key」，将其写入 `models.json`（该 key 在线可用）。
2. 其余 key 作为「备用 key」，存一份本地清单文件，不写入配置。
3. 当活跃 key 余额将用完或过期时，手动轮换：编辑 `models.json` 中 `vendor: "tokenrhythm"` 两条记录的 `apiKey`，替换为下一个备用 key 的 `sk_tr_`，重启 WorkBuddy/CodeBuddy 生效。

### 备用清单文件模板
```
# tokenrhythm 备用 Key 清单

| 标签 | 手机 | 余额 | 到期时间 |
|---|---|---|---|
| tr1 | 170xxxxxxx | ¥68.00 | 2026-09-22 |
| tr2 | 170xxxxxxx | ¥68.00 | 2026-09-22 |

- tr1（已激活）
  - sess: sess_xxx
  - sk: sk_tr_xxx
- tr2（备用）
  - sess: sess_xxx
  - sk: sk_tr_xxx
```

清单放在 `E:\codex\niannianai\outputs\` 或用户指定的位置。清单包含完整 sess + sk（本机备份），不对外回显。

### 轮换操作
1. 打开 `%USERPROFILE%\.workbuddy\models.json` 和 `%USERPROFILE%\.codebuddy\models.json`。
2. 找到 `vendor: "tokenrhythm"` 的两条记录（glm-5.2 / deepseek-v4-flash）。
3. 把 `apiKey` 字段替换为下一个备用 key 的 `sk_tr_`。
4. 校验 JSON 合法 + id 唯一。
5. 重启 WorkBuddy / CodeBuddy。

---

## 四、安全与隐私
- 不要把完整 `sess_` / `sk_tr_` 明文回显到外部对话或日志；最终回复最多显示前 4 位 + 后 4 位。
- 临时脚本用完即删。
- 额度查询是只读 GET，无副作用，可放心执行。
- 凭据由用户提供并仅用于本次操作，不持久化保存（除非用户明确要求写入清单文件）。
- 备用清单是本机备份，包含完整凭据，不要上传到外部。