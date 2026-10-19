// ============================================================================
// 无限画布 · 邮件发送（注册验证码）
// 文件：canvas-api/email.js
// 模块制式：**ESM**（与 canvas-api/package.json 的 "type": "module" 一致）
// 依赖：nodemailer（**纯 JS**，无原生模块；Dockerfile 用 npm install 构建时装）
//
// 配置全部走环境变量，**权威值只在服务器 api.env，绝不进仓库**：
//   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
//   QQ 邮箱：host=smtp.qq.com  port=465  user=完整邮箱  pass=**授权码**（不是 QQ 登录密码）
//
// 设计约束
//   1. **未配置 SMTP 时 sendMail 直接抛错**，调用方必须 fail-closed。
//      理由：配置缺失却静默放行 = 验证码形同虚设，比明确报错危险得多。
//   2. 端口 465 默认隐式 TLS（secure=true）；587 走 STARTTLS（secure=false），
//      用 SMTP_SECURE=0/1 可强制覆盖。QQ 邮箱用 465。
// ============================================================================

import nodemailer from 'nodemailer';

/** 复用同一个 transporter：nodemailer 内部会维护连接池，每次新建会耗尽连接。 */
let cached = null;

/**
 * SMTP 是否已配置。
 * 调用方（注册发码）必须先用它做 fail-closed 判断。
 */
export function smtpConfigured() {
    return Boolean(
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
    );
}

function transport() {
    if (cached) return cached;

    const host = String(process.env.SMTP_HOST || '').trim();
    const port = Number(process.env.SMTP_PORT || 465);
    const user = String(process.env.SMTP_USER || '').trim();
    const pass = String(process.env.SMTP_PASS || '');

    if (!host || !user || !pass) {
        throw new Error('SMTP 未配置：缺少 SMTP_HOST / SMTP_USER / SMTP_PASS');
    }

    // 465 = 隐式 TLS；其余端口默认走 STARTTLS。SMTP_SECURE 可强制指定。
    const secure = process.env.SMTP_SECURE === '0'
        ? false
        : (process.env.SMTP_SECURE === '1' ? true : port === 465);

    cached = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        // 服务器在 NAT 后面，名字解析慢；给足超时避免请求挂死
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        // QQ 邮箱证书链在某些基础镜像里校验失败，仅在明确要求时才放宽
        tls: { rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== '0' },
    });

    return cached;
}

/**
 * 发一封纯文本/HTML 邮件。
 * @returns {Promise<{messageId:string}>}
 * @throws SMTP 未配置或上游拒绝时抛错 —— **调用方必须处理**
 */
export async function sendMail({ to, subject, text, html }) {
    const from = String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
    if (!from) throw new Error('SMTP 未配置：缺少 SMTP_FROM / SMTP_USER');

    const info = await transport().sendMail({
        from,
        to,
        subject,
        text,
        ...(html ? { html } : {}),
    });

    return { messageId: info?.messageId || '' };
}

/**
 * 启动自检用：验证 SMTP 凭据是否真的能连上。
 * 只在 selftest / 管理员主动调用时用，**不要放在启动路径上**——
 * 邮件服务挂了不应该让整个 API 起不来。
 */
export async function verifySmtp() {
    if (!smtpConfigured()) return { ok: false, error: 'smtp_not_configured' };
    try {
        await transport().verify();
        return { ok: true };
    } catch (error) {
        return { ok: false, error: error?.message || String(error) };
    }
}

export { transport as _transport };
