# ANS 人民币收付款接入

2026-10-11：用户已确认同时拥有微信支付和支付宝商户后台。本地双渠道适配代码已实现；正式站尚无商户配置，真实收款、退款和卖家分账仍未验收。不能把离线签名检查记为资金到账。

## 当前范围

支持微信 Native 扫码及支付宝电脑网站支付；订单付款以验签回调或已签名的查询结果确认。退款分为审批、发送和查询，只有供应商确认成功才记为退回。人民币价格独立于平台算力积分，不自动换算旧积分报价。

当前仅允许配置中列出的官方卖家及明确核准的商品版本收费。第三方创作者分账尚未接通，不将账本中的待结算额当作已提现余额。

## 平台配置

- `ANS_MARKET_CASH_ENABLED=true`：完成商户配置并批准真实价格后启用。
- `ANS_MARKET_CASH_ORIGIN=https://ans.cauai.fun`：固定公开 HTTPS 回调来源。
- `ANS_MARKET_CASH_OFFICIAL_SELLER_IDS`：允许收款的官方卖家用户 ID，逗号分隔。
- `ANS_MARKET_CASH_OFFERS`：按商品 ID 配置 `{ "version": 已批准的版本号, "priceMinor": 人民币分 }`。
- `ANS_MARKET_CASH_COMMISSION_BPS`：平台抽成，0—10000 基点，需明确核准。
- `ANS_MARKET_CASH_DEFAULT_PROVIDER`：默认支付渠道。

## 微信支付

- `ANS_WECHAT_MCH_ID`、`ANS_WECHAT_APP_ID`：商户号及绑定的公众号或应用 APPID。
- `ANS_WECHAT_CERT_SERIAL`：商户 API 证书序列号。
- `ANS_WECHAT_API_V3_KEY`：APIv3 密钥，仅安全注入。
- `ANS_WECHAT_PRIVATE_KEY_FILE`：商户 API 私钥 PEM 文件路径。
- `ANS_WECHAT_PUBLIC_KEY_ID`、`ANS_WECHAT_PUBLIC_KEY_FILE`：微信支付公钥 ID 及 PEM 文件路径。

当前适配为微信支付公钥模式，实际商户需确认 Native 产品权限及 APPID 与商户的绑定。不要重置仍供其他业务使用的密钥或证书。用户先登录商户平台，读取真实配置状态后逐步完成。

## 支付宝

- `ANS_ALIPAY_APP_ID`、`ANS_ALIPAY_SELLER_ID`：开放平台应用 ID 及商户 UID。
- `ANS_ALIPAY_PRIVATE_KEY_FILE`：RSA2 应用私钥 PEM 文件路径。
- `ANS_ALIPAY_PUBLIC_KEY_FILE`：支付宝公钥 PEM 文件路径。

当前适配公钥模式，需要电脑网站支付能力。证书模式未实现，不能直接把证书当成支付宝公钥配置。

## 接口与密钥

- POST `/api/market/orders/[id]/checkout`：获取微信二维码或支付宝跳转地址。
- POST `/api/market/orders/[id]/reconcile`：从支付渠道查询并核对付款。
- POST `/api/market/payments/wechat/webhook`：验证签名并解密 APIv3 回调。
- POST `/api/market/payments/alipay/webhook`：验证 RSA2 回调与商户、金额及订单归属。
- POST `/api/admin/market/orders/[id]/refund`：审批、发送或查询退款；管理员权限及同源校验。

密钥仅保存于服务器受限文件或受控运行环境，私钥只读挂载。不写进 Git、聊天、网页、命令参数或报告。准备就绪、真实付款成功、真实退款到账分别记录。

## 当前核验

本地相关组件及签名、金额、账号隔离、重复回调等 77 项检查通过；完整类型与 ESLint 检查通过。全量检查初次发现英文账号提示缺失，已补齐并复验对应 11 项。仍需精确版本 Linux 构建、数据库隔离验证及实际商户配置；不新建生产虚构订单或调用付费模型。

官方参考：微信 Native 下单 https://pay.wechatpay.cn/doc/v3/merchant/4012791877 ；APIv3 密钥设置 https://pay.wechatpay.cn/doc/v3/merchant/4012072195 ；支付宝开放平台 https://open.alipay.com/ 。
