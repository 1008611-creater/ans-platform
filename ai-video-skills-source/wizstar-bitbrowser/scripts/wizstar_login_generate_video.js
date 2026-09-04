#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const http = require('http');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function boolArg(name) {
  return process.argv.includes(`--${name}`);
}

function finish(message, code = 0) {
  if (message) console.log(message);
  process.exit(code);
}

function scriptRoot() {
  return path.resolve(__dirname, '..');
}

function loadAccounts() {
  const explicit = arg('accounts-file');
  const file = explicit || path.join(scriptRoot(), 'data', 'accounts.local.json');
  const raw = fs.readFileSync(file, 'utf8');
  const accounts = JSON.parse(raw);
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error(`No accounts found in ${file}`);
  }
  return accounts;
}

function cacheFile() {
  return path.join(scriptRoot(), 'data', 'window-cdp-cache.json');
}

function readCdpCache() {
  try {
    return JSON.parse(fs.readFileSync(cacheFile(), 'utf8'));
  } catch {
    return {};
  }
}

function writeCdpCache(cache) {
  const file = cacheFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(cache, null, 2));
}

function selectAccount() {
  const email = arg('account-email');
  const index = Number(arg('account-index', '0'));
  const accounts = loadAccounts();
  const account = email
    ? accounts.find(item => String(item.email).toLowerCase() === email.toLowerCase())
    : accounts[index];
  if (!account) throw new Error(`Account not found. email=${email || ''} index=${Number.isFinite(index) ? index : ''}`);
  if (!account.email || !account.password) throw new Error(`Selected account is missing email or password: ${account.email || '(unknown)'}`);
  return account;
}

function httpJson(url, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
      });
    });
    req.setTimeout(timeout, () => req.destroy(new Error(`Timeout ${url}`)));
    req.on('error', reject);
  });
}

function bitbrowserPortsFromPowershell() {
  try {
    const out = execFileSync('powershell', [
      '-NoProfile',
      '-Command',
      'Get-NetTCPConnection -State Listen | Where-Object { $_.LocalAddress -in @("127.0.0.1","0.0.0.0") -and $_.LocalPort -ge 50000 -and ((Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName -like "*BitBrowser*") } | Select-Object -ExpandProperty LocalPort'
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split(/\r?\n/).map(s => Number(s.trim())).filter(Boolean);
  } catch {
    return [];
  }
}

async function resolveCdp() {
  const explicit = arg('cdp');
  if (explicit) return explicit;
  const win = arg('window');
  if (!win) return null;

  const ports = [...new Set(bitbrowserPortsFromPowershell())].sort((a, b) => a - b);
  for (const port of ports) {
    try {
      const tabs = await httpJson(`http://127.0.0.1:${port}/json/list`);
      const matched = tabs.some(tab => String(tab.title || '').trim() === `${win}-工作台`);
      if (matched) {
        const endpoint = `http://127.0.0.1:${port}`;
        const cache = readCdpCache();
        cache[win] = endpoint;
        writeCdpCache(cache);
        return endpoint;
      }
    } catch {}
  }
  const cached = readCdpCache()[win];
  if (cached) {
    try {
      await httpJson(`${cached}/json/version`);
      return cached;
    } catch {}
  }
  throw new Error(`Could not find BitBrowser window ${win}. Open it first or run 00_find_bitbrowser_cdp.ps1 -Window ${win}.`);
}

async function findPage(browser, predicate) {
  for (const ctx of browser.contexts()) {
    for (const page of ctx.pages()) {
      if (!page.isClosed() && predicate(page)) return page;
    }
  }
  return null;
}

async function getUsablePage(browser, ctx) {
  const target = await findPage(browser, p => p.url().includes('wizstar.com/tools/generate_video'));
  if (target) return target;
  const existing = await findPage(browser, p => p.url().includes('wizstar.com') && !p.url().includes('/login'));
  if (existing) return existing;
  return await ctx.newPage();
}

async function ensureLivePage(ctx, page) {
  if (!page || page.isClosed()) return await ctx.newPage();
  return page;
}

async function safeGoto(ctx, page, url, options) {
  page = await ensureLivePage(ctx, page);
  try {
    await page.goto(url, options);
    return page;
  } catch (err) {
    if (/Target page, context or browser has been closed/i.test(err.message || '')) {
      page = await ctx.newPage();
      await page.goto(url, options);
      return page;
    }
    throw err;
  }
}

async function bodyText(page) {
  return await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
}

async function hasWizstarSession(ctx, page, account = null) {
  const cookies = await ctx.cookies('https://wizstar.com').catch(() => []);
  const hasSessionCookie = cookies.some(cookie => ['osduss', 'passOsRefreshTk'].includes(cookie.name) && cookie.value);
  const storage = await page.evaluate(() => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    return data;
  }).catch(() => ({}));
  const hasSessionStorage = Boolean(storage.passOsRefreshTk);
  const accountHint = account?.email ? account.email.split('@')[0].toLowerCase() : null;
  const hasAccountDraft = accountHint
    ? Object.keys(storage).some(key => key.toLowerCase().includes(accountHint))
    : false;
  const text = await bodyText(page);
  const stillLogin = /continue with google|sign in with google|login\s+register/i.test(text);
  return (hasSessionCookie || hasSessionStorage || hasAccountDraft) && !stillLogin;
}

async function looksWizstarAuthenticated(ctx, page, account = null) {
  if (await hasWizstarSession(ctx, page, account)) return true;
  const text = await bodyText(page);
  return /logout|sign out/i.test(text) && !/sign in|log in|continue with google|sign in with google/i.test(text);
}

async function clickByText(page, labels, optional = false) {
  for (const label of labels) {
    const loc = page.getByText(label, { exact: false }).first();
    if (await loc.count().catch(() => 0)) {
      try {
        await loc.click({ timeout: 4000 });
        await page.waitForTimeout(800);
        return true;
      } catch {}
    }
  }
  if (optional) return false;
  throw new Error(`Could not click any label: ${labels.join(', ')}`);
}

async function clickWizstarLogin(page) {
  await acceptWizstarTerms(page);

  const selectorCandidates = [
    'button.login-sdk-form-item:has-text("Continue with Google")',
    'button:has-text("Continue with Google")',
    '.login-overseas-sdk-form-content button:has-text("Google")',
    '.pass-form-wrapper button:has-text("Google")'
  ];
  for (const selector of selectorCandidates) {
    const loc = page.locator(selector).first();
    if (await loc.count().catch(() => 0)) {
      try {
        await loc.scrollIntoViewIfNeeded().catch(() => {});
        const box = await loc.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        } else {
          await loc.click({ timeout: 5000, force: true });
        }
        return true;
      } catch {}
    }
  }

  const candidates = [
    /continue with google/i,
    /sign in with google/i,
    /log in with google/i,
    /login with google/i,
    /google/i
  ];
  for (const name of candidates) {
    const button = page.getByRole('button', { name }).first();
    if (await button.count().catch(() => 0)) {
      try {
        await button.click({ timeout: 4000 });
        return true;
      } catch {}
    }
    const link = page.getByRole('link', { name }).first();
    if (await link.count().catch(() => 0)) {
      try {
        await link.click({ timeout: 4000 });
        return true;
      } catch {}
    }
  }

  const loginClicked = await page.evaluate(() => {
    const labels = ['sign in', 'log in', 'login'];
    const nodes = [...document.querySelectorAll('button, a, [role="button"]')];
    const login = nodes.find(node => {
      const text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return labels.some(label => text.includes(label));
    });
    if (!login) return false;
    login.click();
    return true;
  }).catch(() => false);
  if (loginClicked) {
    await page.waitForTimeout(1200);
    return await clickWizstarLogin(page);
  }

  const googleClicked = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('button, a, [role="button"], div')];
    const target = nodes.find(node => /continue with google|sign in with google|google/i.test((node.innerText || node.textContent || '').trim()));
    if (!target) return false;
    const clickable = target.closest('button, a, [role="button"]') || target;
    clickable.click();
    return true;
  }).catch(() => false);
  return Boolean(googleClicked);
}

async function acceptWizstarTerms(page) {
  const checked = await page.locator('input.agreement-checkbox, input[type="checkbox"]').first().isChecked({ timeout: 1000 }).catch(() => false);
  if (checked) return;

  const checkbox = page.locator('input.agreement-checkbox, input[type="checkbox"]').first();
  const agreement = page.locator('.login-sdk-agreement').first();
  if (await checkbox.count().catch(() => 0)) {
    try {
      await agreement.scrollIntoViewIfNeeded().catch(() => {});
      const box = await agreement.boundingBox();
      if (box) {
        await page.mouse.click(box.x + 8, box.y + 8);
      } else {
        await checkbox.click({ timeout: 3000 });
      }
      await page.waitForTimeout(300);
      if (await checkbox.isChecked({ timeout: 1000 }).catch(() => false)) return;
    } catch {
      try {
        await checkbox.click({ timeout: 3000, force: true });
        await page.waitForTimeout(300);
        if (await checkbox.isChecked({ timeout: 1000 }).catch(() => false)) return;
      } catch {}
    }
  }

  await page.evaluate(() => {
    const box = document.querySelector('input.agreement-checkbox, input[type="checkbox"]');
    if (box && !box.checked) {
      box.click();
      box.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }).catch(() => {});
}

async function waitForGooglePage(browser, fallbackPage) {
  for (let i = 0; i < 90; i++) {
    const google = await findPage(browser, p => p.url().includes('accounts.google.com'));
    if (google) return google;
    if (fallbackPage.url().includes('accounts.google.com')) return fallbackPage;
    await fallbackPage.waitForTimeout(500);
  }
  return null;
}

async function selectGoogleAccount(page, account) {
  const accountChoice = page.getByText(account.email, { exact: false }).first();
  if (await accountChoice.count().catch(() => 0)) {
    try {
      await accountChoice.click({ timeout: 8000 });
      await page.waitForTimeout(3000);
      return true;
    } catch {}
  }

  const useAnother = page.getByText(/Use another account|使用其他账号|添加账号/i).first();
  if (await useAnother.count().catch(() => 0)) {
    try {
      await useAnother.click({ timeout: 8000 });
      await page.waitForTimeout(2500);
      return true;
    } catch {}
  }
  return false;
}

async function clickGoogleButton(page, labels, preferredSelector = null) {
  if (preferredSelector) {
    const preferred = page.locator(preferredSelector).first();
    if (await preferred.count().catch(() => 0)) {
      try {
        await preferred.click({ timeout: 5000 });
        return true;
      } catch {}
    }
  }
  for (const label of labels) {
    const exact = page.getByText(label, { exact: true }).first();
    if (await exact.count().catch(() => 0)) {
      try {
        await exact.click({ timeout: 5000 });
        return true;
      } catch {}
    }
  }
  const clicked = await page.evaluate((buttonLabels) => {
    const nodes = [...document.querySelectorAll('button, [role="button"]')];
    const target = nodes.find(node => buttonLabels.includes((node.innerText || node.textContent || '').trim()));
    if (!target) return false;
    target.click();
    return true;
  }, labels).catch(() => false);
  if (clicked) return true;
  throw new Error(`Could not click Google button: ${labels.join(', ')}`);
}

async function googleCheckpoint(page) {
  const text = await bodyText(page);
  const checks = [
    ['captcha', /captcha|验证码|证明你不是机器人|not a robot/i],
    ['2fa', /两步验证|2-Step Verification|2-factor|verification code|输入验证码|获取验证码|verify it's you/i],
    ['recovery', /恢复邮箱|辅助邮箱|recovery email|confirm your recovery email/i],
    ['phone', /verify.+phone|phone number|输入电话号码|添加电话号码|手机验证|验证手机号/i],
    ['blocked', /couldn.t sign you in|无法登录|This browser or app may not be secure|browser may not be secure/i],
    ['consent', /Sign in with Google|Continue to|Review .*Privacy Policy|允许|Allow|继续|Continue/i]
  ];
  for (const [name, pattern] of checks) {
    if (pattern.test(text)) return name;
  }
  return null;
}

async function fillGoogleEmail(page, email) {
  const emailInput = page.locator('input[type="email"], input#identifierId').first();
  await emailInput.waitFor({ state: 'visible', timeout: 25000 });
  await emailInput.fill(email);
  await clickGoogleButton(page, ['下一步', 'Next'], '#identifierNext button');
  await page.waitForTimeout(2500);
}

async function fillGooglePassword(page, password) {
  const pwdInput = page.locator('input[type="password"]').first();
  await pwdInput.waitFor({ state: 'visible', timeout: 30000 });
  await pwdInput.fill(password);
  await clickGoogleButton(page, ['下一步', 'Next'], '#passwordNext button');
  await page.waitForTimeout(6000);
}

async function finishGoogleConsent(page) {
  for (let i = 0; i < 4; i++) {
    if (page.isClosed()) return;
    const clicked = await clickByText(page, ['继续', 'Continue', '允许', 'Allow'], true);
    if (!clicked) break;
    await page.waitForTimeout(2500).catch(() => {});
    if (page.isClosed()) return;
    if (!page.url().includes('accounts.google.com')) break;
  }
}

async function closeCommonPopups(page) {
  for (let i = 0; i < 4; i++) {
    const clicked = await page.evaluate(() => {
      const selectors = [
        'button[aria-label*="close" i]',
        'button[aria-label*="关闭"]',
        '[role="dialog"] button',
        '.modal button',
        '.popup button'
      ];
      const closeBySelector = selectors
        .map(selector => [...document.querySelectorAll(selector)])
        .flat()
        .find(node => /^(x|×|close|skip|got it|not now|稍后|跳过|知道了)$/i.test((node.innerText || node.textContent || node.getAttribute('aria-label') || '').trim()));
      if (closeBySelector) {
        closeBySelector.click();
        return true;
      }
      return false;
    }).catch(() => false);
    if (!clicked) break;
    await page.waitForTimeout(600);
  }
}

async function main() {
  const cdp = await resolveCdp();
  if (!cdp) {
    console.error('Usage: node wizstar_login_generate_video.js --window 9 --account-index 0');
    console.error('Alternative: pass --cdp <endpoint> instead of --window.');
    process.exit(2);
  }

  const account = selectAccount();
  const startUrl = arg('url', 'https://wizstar.com/');
  const targetUrl = arg('target-url', 'https://wizstar.com/tools/generate_video');
  const dryRun = boolArg('dry-run');

  const { chromium } = require('playwright-core');
  const browser = await chromium.connectOverCDP(cdp);
  const ctx = browser.contexts()[0] || await browser.newContext();
  let page = await getUsablePage(browser, ctx);
  await page.bringToFront().catch(() => {});

  if (dryRun) {
    return finish(`Connected to ${cdp}. Selected account ${account.email}.`);
  }

  page = await safeGoto(ctx, page, startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(async () => page);
  page = await ensureLivePage(ctx, page);
  await page.waitForTimeout(2000);

  if (!await looksWizstarAuthenticated(ctx, page, account)) {
    let google = await findPage(browser, p => p.url().includes('accounts.google.com'));
    if (!google) {
      const clicked = await clickWizstarLogin(page);
      if (!clicked) throw new Error('Could not find Wizstar Google login control.');
      google = await waitForGooglePage(browser, page);
    }
    if (!google) throw new Error('Clicked Wizstar login, but no Google account page appeared.');
    await google.bringToFront().catch(() => {});

    await selectGoogleAccount(google, account);

    const hasEmailInput = await google.locator('input[type="email"], input#identifierId').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (hasEmailInput) {
      await fillGoogleEmail(google, account.email);
      const checkpoint = await googleCheckpoint(google);
      if (checkpoint && !['consent'].includes(checkpoint)) {
        return finish(`Google login stopped at checkpoint: ${checkpoint}. Complete it manually in BitBrowser window ${arg('window', '?')}, then rerun.`);
      }
    }

    const hasPasswordInput = await google.locator('input[type="password"]').first().isVisible({ timeout: 8000 }).catch(() => false);
    if (hasPasswordInput) {
      await fillGooglePassword(google, account.password);
      const checkpoint = await googleCheckpoint(google);
      if (checkpoint && !['consent'].includes(checkpoint)) {
        return finish(`Google login stopped at checkpoint after password: ${checkpoint}. Complete it manually in BitBrowser window ${arg('window', '?')}, then rerun.`);
      }
    }

    await finishGoogleConsent(google);
    if (!google.isClosed()) await google.waitForTimeout(6000).catch(() => {});
  }

  page = await findPage(browser, p => p.url().includes('wizstar.com/tools/generate_video'))
    || await findPage(browser, p => p.url().includes('wizstar.com') && !p.url().includes('/login'))
    || page;
  page = await ensureLivePage(ctx, page);
  await page.bringToFront().catch(() => {});
  await closeCommonPopups(page);
  page = await safeGoto(ctx, page, targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(async () => page);
  page = await ensureLivePage(ctx, page);
  await page.waitForTimeout(3000);
  await closeCommonPopups(page);

  const finalUrl = page.url();
  const authed = await looksWizstarAuthenticated(ctx, page, account);
  return finish(`Wizstar flow finished for ${account.email}. authenticated=${authed}. url=${finalUrl}`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
