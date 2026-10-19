# ANS 积分接入 SDK

把已有项目的付费入口接到 ANS：用户在 ANS 登录、确认支付积分；你的服务器读取真实回执，再给当前登录用户开通权益。积分价格取自 ANS 中已发布的商品档次，调用方不能传金额或指定 ANS 扣款账号。

这是 Node.js 20+ 服务端 ESM 包，运行时没有第三方依赖，附带 TypeScript 类型与 OpenAPI 3.1。API 固定为 `https://ans.cauai.fun`。仓库代码与演示检查通过，并不代表你的商品已发布或真实买家已经付款。

## 从商品到项目权益

1. 在 ANS 上传真实项目，填写 GitHub、封面、介绍、交付结果、使用地址和积分收费档次，并按平台流程发布。
2. 在该商品的「积分接入」中登记自己的 HTTPS 返回来源，创建项目范围凭据。凭据仅显示一次，只保存到你的服务器环境变量 `ANS_MERCHANT_KEY`。撤销或轮换会使旧凭据失效；新凭据可以查询同商品的已有结算单。
3. 在自己的登录会话中创建本地订单，先持久化用户归属、商品 ID、档次 ID、预期积分价格和唯一 `reference`，再请求 ANS。一个本地购买意图始终使用同一个 reference。
4. 将用户跳转到 API 返回的 `checkoutUrl`。用户在 ANS 自己登录并明确确认支付。创建结算单本身不扣积分，新单 24 小时未支付过期后显示 `cancelled`。
5. 用户返回后，你的服务器查询回执，对照本地订单：`reference`、`listingId`、`tierId`、`pricePoints`、`id` 全部一致，且 `status === 'paid' && entitlementActive === true` 才能授权。将第一次付款的 `orderId` 和稳定的 `ansUserId` 绑定到原本地用户，不得按客户端传来的账号授权。
6. 以本地购买 reference/ANS orderId 做唯一约束，只开通一次。每次访问受保护功能或通过后台定期任务重新查询回执；`refunded`、`disputed` 或 `entitlementActive: false` 时收回或暂停这次购买带来的权益。当前接口没有 webhook。

固定充值规则是 **¥1 = 10 ANS 积分**。市场商品按积分报价，`pricePoints: 10` 表示 10 积分；它不是 10 元或内部百分之一积分单位。SDK 不修改模型 token 单价或模型消耗倍率。

## 安装与调用

从这个仓库获取源码后，可在自己的 Node 项目中安装本地目录：

```sh
npm install /path/to/ans-points-sdk
```

包尚未声明已发布到 npm；不要假设 `npm install ans-points-sdk` 能取得本仓库版本。也可直接复制完整源码包或安装你审核过的 Git commit。

```js
import { createAnsPointsClient, AnsPointsError } from 'ans-points-sdk';

const ans = createAnsPointsClient({
  apiKey: process.env.ANS_MERCHANT_KEY,
  timeoutMs: 15_000,
});

// 以下订单应先在自己的数据库中保存，并归属于当前已认证的用户。
const checkout = await ans.createCheckout({
  reference: localOrder.reference,
  tierId: localOrder.ansTierId,
  returnUrl: localOrder.returnUrl,
}, { maxAttempts: 2 });

await database.bindCheckout(localOrder.id, checkout.id);
// 将当前浏览器跳转到 checkout.checkoutUrl。

// 回跳只触发重新查询，不信任 query 中的 paid、userId、orderId。
const receipt = await ans.getCheckout(localOrder.ansCheckoutId);
const matches = receipt.reference === localOrder.reference
  && receipt.listingId === localOrder.ansListingId
  && receipt.tierId === localOrder.ansTierId
  && receipt.pricePoints === localOrder.expectedPricePoints;
if (!matches) throw new Error('回执与本地订单不一致，禁止授权');
if (receipt.status === 'paid' && receipt.entitlementActive) {
  // 由自己的数据库事务负责：唯一订单、原用户绑定、幂等开通。
  await database.grantOnce(localOrder.id, receipt.orderId, receipt.ansUserId);
} else {
  await database.suspendThisPurchase(localOrder.id);
}
```

上面的 `database` 是你项目自己的持久化接口，完整可运行的 HTTP 演示见 [examples/server.mjs](examples/server.mjs)。有收费档次的商品必须传 `tierId`；兼容没有档次的旧单档商品时省略，回执 `tierId` 为 `null`。档次 ID 为 1–60 位字母、数字、下划线或短横线；返回 URL 最多 1000 字符，必须为 HTTPS，不能带用户名、密码或 fragment（`#` 后内容）。

商品在付款前发布新版或撤回时，尚未建订单的旧结算单会返回 `cancelled`，旧 reference 重试仍返回原单。只有查询确认旧单已取消且没有有效付款后，才为当前版本建立新的本地购买意图与 reference，并保留旧单关联；已经付款的订单继续使用购买时冻结的版本与价格。

## 请求不确定时如何恢复

默认只发送一次；`maxAttempts: 2` 或 `3` 可对网络失败、超时及 5xx 等未知结果进行有界重试。SDK 在一次调用中先冻结并序列化 body，所有重试都复用原 reference、档次和返回地址。已确认的 4xx 业务拒绝不会自动重试。

```js
try {
  const checkout = await ans.createCheckout(savedInput, { maxAttempts: 2 });
  // 保存 checkout.id。
} catch (error) {
  if (error instanceof AnsPointsError && error.uncertain) {
    // 保留原本地订单。已保存 checkout.id 时查询它；否则用原 body/reference 再创建。
    // 不改 reference，不标为付款失败，不向用户承诺未扣款。
  }
  // 可以记录 error.toJSON() 中的安全诊断；不要记录配置、Authorization 或原始响应。
}
```

`AnsPointsError` 提供 `code`、`httpStatus`、安全 UUID `requestId`、`uncertain` 和 `retryable`。服务端报错正文、底层 fetch 错误和私密 URL 不放入错误消息。SDK 不跟随 API 重定向，密钥只发到固定 ANS HTTPS 来源，不支持自定义 API 地址。`fetch` 注入仅用于受控服务端传输/本地检查；传入的实现同样能接触密钥，必须可信。

HTTP 408、429、5xx、超时、无法读取有效回执等都按未知结果处理。取消请求也不能证明服务器没执行；收到错误后仍要核对原单。重复同 reference 但不同 body 会被后端拒绝，不能用于改价格或换档次。

## 完整 HTTP 演示

```sh
node --test
node examples/server.mjs
```

未配置环境时，打开本地端口 3000 只显示说明，不会调用 ANS。远程联调需要将示例放在你的 HTTPS 反向代理后，并配置：

- `ANS_MERCHANT_KEY`：已发布商品的服务端接入凭据，格式为 `ansm_` 后跟 43 位字母、数字、下划线或短横线。
- `ANS_LISTING_ID`：真实商品 ID。
- `ANS_TIER_ID`：真实档次 ID；旧单档才可留空。
- `ANS_EXPECTED_PRICE_POINTS`：该发布档次的积分价格，如 `10`。
- `APP_ORIGIN`：你已登记在 ANS 的 HTTPS 来源，如 `https://your-project.example`，不带路径或末尾 `/`。
- `PORT`：服务器本地端口，默认 3000。示例仅监听 loopback，由反向代理转发。

`.env.example` 仅是字段模板，示例不会自动加载 `.env`；用部署平台的服务端环境注入，或 Node 的 `--env-file` 加载你本地的私有文件。不要把凭据写进命令参数、前端代码、`NEXT_PUBLIC_*`、Git、日志或返回给浏览器。

演示提供：服务端本地会话绑定、同源/CSRF 校验、创建/继续原结算单、ANS 跳转、服务端回执复核、幂等权益写入、每次访问重新查询及退款暂停。**演示会话不是你的真实登录，订单/会话/权益都在内存中；重启会丢失，不能直接当生产数据库方案。**生产接入必须替换为自己的身份认证、持久事务、订单唯一约束与权益系统，持续查询的频率按项目实际需求安排。

ANS 原生执行型工作流使用站内运行入口、预算和实际算力积分结算；不能作为普通付费商品调用本 SDK 收银台。误用时接口返回 WORKFLOW_RUN_REQUIRED，应引导用户回工作流页面。

## 接口与回执

[openapi.json](openapi.json) 是公开接口契约；[docs/integration-checklist.md](docs/integration-checklist.md) 给出生产接入核对项。

| 方法 | 地址 | 用途 |
|---|---|---|
| POST | `/api/integrations/market/v1/checkouts` | 以项目凭据幂等创建结算单 |
| GET | `/api/integrations/market/v1/checkouts/{id}` | 查询该商品结算单的权威回执 |

两者使用 `Authorization: Bearer <server-only-key>`，返回信封 `{ ok: true, data, requestId }` 或 `{ ok: false, error: { code, message }, requestId }`。SDK 只保留公开回执字段，不透传未知字段或买家个人资料。

| 回执字段 | 含义 |
|---|---|
| `id` / `reference` | ANS 结算单 / 商户本地购买意图 |
| `checkoutUrl` | ANS 登录确认支付页面 |
| `listingId` / `listingVersion` / `tierId` | 已发布商品、固定发布版本、档次 |
| `pricePoints` | 服务端读取的固定积分价格 |
| `status` | `pending`、`paid`、`refunded`、`disputed`、`cancelled` |
| `orderId` / `paidAt` | 权威订单 ID 可能在付款前存在；`paidAt` 未付款时为 `null`，不能单凭订单 ID 授权 |
| `entitlementActive` | 此刻是否仍有可授权权益；争议/退款为 `false` |
| `ansUserId` | 稳定、不透明的 ANS 账号标识；未绑定时为 `null`，无姓名/邮箱/手机 |

## 检查与许可

`npm test` 或 `node --test` 执行本地隔离协议/安全/示例检查，无生产付款、模型调用或真实商品创建。`npm run check` 检查源码语法。TypeScript 声明见 `src/index.d.ts`，MIT 许可见 [LICENSE](LICENSE)。

## 发布状态

ANS 市场、商品积分接入管理及上述生产接口已于 2026-10-12 部署。平台迁移、隔离数据库交易、权限与幂等检查，以及生产页面只读核对已完成。真实作者仍需在自己的项目中完成身份认证、持久化订单和权益接入；本仓库没有完成真实买家付款与交付验证，也没有发布到 npm registry。
