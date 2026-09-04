/**
 * MXAI 适配器 - 通过 Playwright 自动化操作 MXAI 生图页面
 * 
 * 功能：
 * - 启动持久化浏览器（保存登录态）
 * - 检查登录状态
 * - 粘贴提示词 + 设置参数 + 点击生成
 * - 轮询等待生成完成
 * - 下载生成的图片
 * 
 * 不绕过验证码/风控，遇到时抛出异常通知用户手动处理
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

class MxaiAdapter {
  constructor(options = {}) {
    // 环境变量可覆盖（便于团队成员指向各自账号/环境）：
    //   MXAI_URL      生图页地址（含各自邀请链接）
    //   MXAI_HEADLESS true/false，是否无头运行（默认 false，需本机桌面）
    //   MXAI_PROFILE  浏览器 profile 目录（默认 ./ 下的 .browser-profile）
    const envUrl = process.env.MXAI_URL;
    const envHeadless = process.env.MXAI_HEADLESS;
    const envProfile = process.env.MXAI_PROFILE;
    this.userDataDir = options.userDataDir || envProfile || path.join(__dirname, '.browser-profile');
    this.headless = options.headless !== undefined ? options.headless
      : (envHeadless === 'true' || envHeadless === '1' || envHeadless === 'yes');
    this.viewport = options.viewport || { width: 1280, height: 960 };
    this.mxaiUrl = options.mxaiUrl || envUrl
      || 'https://www.mxai.cn/home/?mp=mjdrawai&from=invite&invite_id=100595351#/mj';
    this.browser = null;
    this.context = null;
    this.page = null;
    this.lastResultId = null;
  }

  /**
   * 启动浏览器（持久化上下文，保存登录态）
   */
  async launch() {
    if (this.browser) return;

    // 清理陈旧锁文件：脚本被强杀（/F）后 msedge 留下的 Default/LOCK 会导致
    // 新实例以 exitCode=21（profile in use）启动失败。删除 LOCK 不会丢失登录态。
    try {
      const lockFile = path.join(this.userDataDir, 'Default', 'LOCK');
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
        console.log('[MXAI] 已清理陈旧 profile 锁文件 LOCK');
      }
    } catch (e) { /* 忽略 */ }

    // 确保用户数据目录存在
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }

    this.context = await chromium.launchPersistentContext(this.userDataDir, {
      headless: this.headless,
      viewport: this.viewport,
      channel: 'msedge',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
      ],
    });

    // 移除 webdriver 标记
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    this.page = this.context.pages()[0] || await this.context.newPage();
    this.browser = this.context; // 与 context 保持一致，供守卫判重（persistent context 无独立 browser 对象）

    // 监听对话框
    this.page.on('dialog', async (dialog) => {
      console.log(`[MXAI] 页面对话框: ${dialog.type()} - ${dialog.message()}`);
      await dialog.dismiss();
    });

    console.log('[MXAI] 浏览器已启动');
  }

  /**
   * 关闭浏览器
   */
  async close() {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.browser = null;
      this.page = null;
      console.log('[MXAI] 浏览器已关闭');
    }
  }

  /**
   * 导航到 MXAI 生图页并等待加载
   */
  async navigate() {
    if (!this.page) await this.launch();

    console.log('[MXAI] 导航到生图页...');
    await this.page.goto(this.mxaiUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 等待 SPA 真正挂载出 MJ 创作面板（不是仅 DOMContentLoaded，也不是别的 tab 的隐藏 textarea）。
    // 必须等到「可见」的 .mj-left-tool 或「可见」的提示词文本域，否则后续交互会落空。
    let ready = false;
    for (let attempt = 0; attempt < 2 && !ready; attempt++) {
      try {
        await this.page.waitForFunction(() => {
          const panel = document.querySelector('.mj-left-tool');
          if (panel && panel.offsetParent !== null) return true;
          const tas = Array.from(document.querySelectorAll('textarea'));
          return tas.some(t => /输入绘画描述词/.test(t.placeholder || '') && t.offsetParent !== null);
        }, { timeout: 45000 });
        ready = true;
      } catch (e) {
        console.log('[MXAI] 创作面板未按时出现，重载重试...');
        await this.page.goto(this.mxaiUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      }
    }
    if (!ready) {
      console.log('[MXAI] 警告: 创作面板仍未加载，继续尝试（可能页面异常）');
    }

    // 关闭可能弹出的广告/签到弹窗（首次清理）
    await this.page.waitForTimeout(1500);
    await this._dismissPopups();

    // 部分广告弹窗在加载数秒后才延迟弹出，等待后做二次清理
    await this.page.waitForTimeout(3000);
    await this._dismissPopups();

    // 再等待一轮，兜底极晚出现的弹窗
    await this.page.waitForTimeout(2000);
    await this._dismissPopups();

    // 最后再留一点沉淀时间，避免面板动画/懒加载还没完成
    await this.page.waitForTimeout(2000);

    console.log('[MXAI] 页面加载完成，弹窗已清理');
  }

  /**
   * 关闭页面上的广告/活动/签到等弹窗
   * 覆盖：活动横幅(Seedance)、el-dialog 的 X、el-drawer 的 X、各类 close 按钮、遮罩层点击关闭
   * 多轮扫描，直到没有可见弹窗为止（一个弹窗关闭后可能暴露下一个）
   */
  async _dismissPopups(maxRounds = 5) {
    if (!this.page) return { dismissed: 0 };
    const closeSelectors = [
      '.global-seedance-promo__close',          // Seedance 活动横幅关闭
      '.el-dialog__headerbtn',                  // Element UI 对话框 X
      '.el-drawer__close-btn',                  // Element UI 抽屉 X
      '[class*="promo"] [class*="close"]',
      '[class*="modal"] [class*="close"]',
      '[class*="dialog"] [class*="close"]',
      '[class*="popup"] [class*="close"]',
      '[class*="notice"] [class*="close"]',
      '[class*="close-btn"]',
      '[class*="closeBtn"]',
      'button[class*="close"]',
      'span[class*="close"]',
      'a[class*="close"]',
      'i[class*="close"]',
      '[aria-label="关闭"]',
      '[aria-label="Close"]',
      '[aria-label="close"]',
    ];
    // 仅作为兜底：文本明确的关闭动作
    const closeTexts = ['关闭', '知道了', '不再提醒', '稍后', '暂不', '×', 'Close'];
    let totalDismissed = 0;

    for (let round = 0; round < maxRounds; round++) {
      let dismissedAny = false;

      // 1) 选择器命中的可见关闭按钮
      for (const sel of closeSelectors) {
        try {
          const nodes = await this.page.locator(sel).all();
          for (const n of nodes) {
            if (await n.isVisible().catch(() => false)) {
              const tag = await n.evaluate(el => el.tagName).catch(() => '');
              // 避免误点面积巨大的容器（可能是整个遮罩而非关闭按钮）
              const box = await n.boundingBox().catch(() => null);
              const tooBig = box && (box.width > 600 || box.height > 600);
              if (tooBig) continue;
              await n.click({ timeout: 2500, force: true }).catch(() => {});
              dismissedAny = true;
              totalDismissed++;
              await this.page.waitForTimeout(450);
            }
          }
        } catch (e) { /* 忽略单条异常 */ }
      }

      // 2) 文本命中的可见关闭按钮（兜底）
      try {
        for (const t of closeTexts) {
          const nodes = await this.page.getByText(t, { exact: false }).all();
          for (const n of nodes) {
            if (await n.isVisible().catch(() => false)) {
              const tag = await n.evaluate(el => el.tagName).catch(() => '');
              if (['BUTTON', 'A', 'SPAN', 'DIV', 'I'].includes(tag)) {
                const box = await n.boundingBox().catch(() => null);
                const tooBig = box && (box.width > 600 || box.height > 600);
                if (tooBig) continue;
                await n.click({ timeout: 2500, force: true }).catch(() => {});
                dismissedAny = true;
                totalDismissed++;
                await this.page.waitForTimeout(450);
              }
            }
          }
        }
      } catch (e) { /* 忽略 */ }

      if (!dismissedAny) break;
      await this.page.waitForTimeout(600);
    }

    // 3) 点击真正的遮罩层角落（close-on-click-modal 的弹窗）。
    //    注意：排除装饰用背景图（class 含 "mask" 的 IMG，如 var(--mx-bg-mask)），避免误点。
    try {
      const backdrops = await this.page.locator('.el-overlay, [class*="overlay"]').all();
      for (const bd of backdrops) {
        const tag = await bd.evaluate(el => el.tagName).catch(() => '');
        const cls = await bd.evaluate(el => (el.className && el.className.toString ? el.className.toString() : '')).catch(() => '');
        if (/mask/i.test(cls) && !/overlay/i.test(cls)) continue; // 跳过纯装饰背景
        if (await bd.isVisible().catch(() => false)) {
          const box = await bd.boundingBox().catch(() => null);
          if (box) {
            await this.page.mouse.click(box.x + 6, box.y + 6).catch(() => {});
            totalDismissed++;
            await this.page.waitForTimeout(450);
          }
        }
      }
    } catch (e) { /* 忽略 */ }

    console.log(`[MXAI] 弹窗清理完成，共关闭 ${totalDismissed} 个`);
    return { dismissed: totalDismissed };
  }

  /**
   * 对外暴露：关闭广告弹窗（可在任意时刻调用）
   */
  async dismissAds() {
    if (!this.page) return { error: '浏览器未启动' };
    return this._dismissPopups();
  }

  /**
   * 检查是否已登录
   * @returns {boolean}
   */
  async isLoggedIn() {
    try {
      // 获取页面文本，用多个标志判断
      const pageText = await this.page.evaluate(() => document.body.innerText).catch(() => '');
      
      // 已登录标志：有积分数字、已签到、头像等
      const hasPoints = /\d+\s*积分/.test(pageText) || /已签到/.test(pageText) || /积分/.test(pageText);
      // 未登录标志
      const hasNotLogin = /未登录/.test(pageText);
      
      if (hasPoints && !hasNotLogin) return true;
      if (hasNotLogin && !hasPoints) return false;
      // 模糊情况：再检查右上角区域
      try {
        const headerText = await this.page.evaluate(() => {
          const header = document.querySelector('header') || document.querySelector('.header') || document.body;
          return header ? header.innerText : '';
        });
        if (/已签到|积分|\d{3,}/.test(headerText) && !/未登录/.test(headerText)) return true;
      } catch (e) { /* 忽略 */ }
      
      // 默认返回 true（避免误判）
      return !hasNotLogin;
    } catch (e) {
      return true;
    }
  }

  /**
   * 确保已登录，未登录则抛出异常
   */
  async ensureLoggedIn() {
    const loggedIn = await this.isLoggedIn();
    if (!loggedIn) {
      throw new Error(
        'MXAI 未登录。请在打开的浏览器窗口中手动登录，登录完成后重新调用。'
      );
    }
  }

  /**
   * 在输入框中粘贴提示词
   * @param {string} prompt - 提示词文本（可包含参数）
   */
  async fillPrompt(prompt) {
    // 页面文本域较多（含隐藏的「视频创意描述」等），用页内 evaluate 精确定位
    // 「可见」且 placeholder 含「输入绘画描述词」的那一个创作文本框。
    const handle = await this.page.evaluateHandle(() => {
      const tas = Array.from(document.querySelectorAll('textarea'));
      const hit = tas.find(t =>
        /输入绘画描述词/.test(t.placeholder || '') && t.offsetParent !== null);
      return hit || null;
    });
    const el = handle.asElement();
    if (!el) {
      // 诊断：存截图，dump 文本域数量
      const n = await this.page.evaluate(() => document.querySelectorAll('textarea').length).catch(() => -1);
      const hasPanel = await this.page.evaluate(() => !!document.querySelector('.mj-left-tool')).catch(() => false);
      console.error(`[MXAI] 未找到创作提示词文本域（textarea 总数=${n}, mj-left-tool=${hasPanel}）`);
      try { await this.page.screenshot({ path: path.join(__dirname, '.automation', 'debug_no_prompt.png'), fullPage: false }); } catch (e) {}
      throw new Error('未找到创作提示词文本域（页面可能未完全加载或被弹窗遮挡）');
    }

    await el.scrollIntoViewIfNeeded().catch(() => {});
    await el.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await this.page.waitForTimeout(150);
    await el.fill(prompt);

    // 校验：Vue 的 v-model 偶尔吞掉 .fill() 的输入，确认值已真正写入，否则重试
    const verify = async () => this.page.evaluate(() => {
      const tas = Array.from(document.querySelectorAll('textarea'));
      const hit = tas.find(t => /输入绘画描述词/.test(t.placeholder || '') && t.offsetParent !== null);
      return hit ? (hit.value || '').length : -1;
    });
    let vlen = await verify();
    for (let retry = 0; retry < 3 && vlen < Math.min(prompt.length, 20); retry++) {
      console.log(`[MXAI] 提示词疑似未写入(value=${vlen})，重试 ${retry + 1}/3`);
      await el.click();
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.press('Backspace');
      await this.page.waitForTimeout(120);
      await el.fill(prompt);
      await this.page.waitForTimeout(200);
      vlen = await verify();
    }
    if (vlen < Math.min(prompt.length, 20)) {
      throw new Error('提示词填写后校验失败（v-model 未捕获输入），放弃本次生成');
    }
    console.log(`[MXAI] 提示词已输入(value=${vlen})`);
  }

  /**
   * 选择模型版本
   * @param {string} version - 如 'v8.2', 'v8.1', 'v7.0'
   */
  async selectVersion(version = 'v8.2') {
    // mxai 模型选择器是「家族」选择：Midjourney / 写实想象 / Niji / 卡通。
    // 选 Midjourney 家族即默认 v8.2（项目资产规范要的）；Niji 家族默认 NJ7.0。
    // 页面渲染文本可能被编码（如 "Mid`J"），用页内 evaluate 精确点选最稳。
    const wantNiji = /niji|nijie|尼吉|尼采/i.test(version || '');
    const kw = wantNiji ? ['niji', 'nijie', '尼吉', '尼采', 'nid`j'] : ['midjourney', 'mid`j', 'mid j', 'mj'];
    const clicked = await this.page.evaluate((kws) => {
      const els = Array.from(document.querySelectorAll('*'));
      const hit = els.find(e => {
        const t = (e.innerText || '').trim().toLowerCase();
        const ok = kws.some(k => t === k || t.startsWith(k + ' ') || t.includes(' ' + k + ' ') || t.includes(k));
        // 关键：限定在创作面板内（.mj-left-tool），避免误点侧边栏的 "Midjourney绘画" 导航链接
        const inPanel = !!(e.closest('.mj-left-tool') || e.closest('.mj-theme-page'));
        const small = e.children.length <= 3 && e.offsetParent !== null &&
          e.getBoundingClientRect().width < 300 && e.getBoundingClientRect().height < 80;
        return ok && small && inPanel;
      });
      if (hit) { hit.click(); return true; }
      return false;
    }, kw);
    if (clicked) {
      console.log(`[MXAI] 已选择模型家族: ${wantNiji ? 'Niji' : 'Midjourney'}`);
    } else {
      console.log(`[MXAI] 警告: 未找到模型家族按钮（${wantNiji ? 'Niji' : 'Midjourney'}），使用站点当前默认版本继续生成`);
    }

    // 显式点选版本芯片（如 v8.2 / v7.0 / NJ7.0），不依赖站点默认。
    // 版本芯片类为 tile-selector-item，当前选中项带 is-selected。
    const verNorm = (version || '').toString().trim().toLowerCase().replace(/^v/, '');
    const wantVer = wantNiji
      ? (verNorm && /^\d/.test(verNorm) ? verNorm : '7.0')   // Niji 家族默认 NJ7.0
      : (verNorm && /^\d/.test(verNorm) ? verNorm : '8.2');  // Midjourney 家族默认 v8.2
    const verClicked = await this.page.evaluate((wv) => {
      const items = Array.from(document.querySelectorAll('.tile-selector-item'));
      const match = items.find(e => {
        const t = (e.innerText || '').trim().toLowerCase().replace(/^v/, '');
        return t === wv;
      });
      if (match && !match.className.includes('is-selected')) { match.click(); return true; }
      if (match) return 'already'; // 已是选中态
      return false;
    }, wantVer);
    if (verClicked === true) console.log(`[MXAI] 已显式选择版本芯片: v${wantVer}`);
    else if (verClicked === 'already') console.log(`[MXAI] 版本芯片 v${wantVer} 已是选中态`);
    else console.log(`[MXAI] 警告: 未找到版本芯片 v${wantVer}，使用默认`);
  }

  /**
   * 选择模式（普通/快速）
   * @param {string} mode - 'normal' | 'fast'
   */
  async selectMode(mode = 'normal') {
    const modeText = mode === 'fast' ? '快速' : '普通';
    const modeBtn = this.page.locator(`div:has-text("模式选择") ~ div >> text="${modeText}"`).first();
    
    try {
      await modeBtn.waitFor({ state: 'visible', timeout: 5000 });
      await modeBtn.click();
      console.log(`[MXAI] 已选择模式: ${modeText}`);
    } catch (e) {
      // 备用
      const btns = await this.page.locator(`text="${modeText}"`).all();
      for (const btn of btns) {
        try {
          if (await btn.isVisible()) {
            await btn.click();
            return;
          }
        } catch (e2) { /* 继续 */ }
      }
      console.log(`[MXAI] 警告: 无法切换模式到 ${modeText}`);
    }
  }

  /**
   * 选择生成尺寸
   * @param {string} aspect - 如 '9:16', '1:1', '16:9'
   */
  async selectAspect(aspect = '9:16') {
    const aspectBtn = this.page.locator(`div:has-text("生成尺寸") ~ div >> text="${aspect}"`).first();
    
    try {
      await aspectBtn.waitFor({ state: 'visible', timeout: 5000 });
      await aspectBtn.click();
      console.log(`[MXAI] 已选择尺寸: ${aspect}`);
    } catch (e) {
      // 备用
      const btns = await this.page.locator(`text="${aspect}"`).all();
      for (const btn of btns) {
        try {
          if (await btn.isVisible()) {
            // 排除历史记录中的尺寸文本
            const box = await btn.boundingBox();
            if (box && box.x < 700) { // 创作区在左侧
              await btn.click();
              return;
            }
          }
        } catch (e2) { /* 继续 */ }
      }
      console.log(`[MXAI] 警告: 无法选择尺寸 ${aspect}`);
    }
  }

  /**
   * 设置高级参数（通过点击 +/- 按钮调整数值）
   * 由于滑块没有输入框，用点击 +/- 的方式
   * @param {string} param - 'stylize' | 'chaos' | 'quality'
   * @param {number} value - 目标值
   */
  async setAdvancedParam(param, value) {
    const paramMap = {
      stylize: { label: '风格化等级', default: 100 },
      chaos: { label: '多样化等级', default: 0 },
      quality: { label: '质量化等级', default: 100 },
    };
    
    const config = paramMap[param];
    if (!config) {
      console.log(`[MXAI] 未知参数: ${param}`);
      return;
    }

    // 找到参数区域
    const paramArea = this.page.locator(`div:has-text("${config.label}")`).first();
    
    try {
      await paramArea.waitFor({ state: 'visible', timeout: 5000 });
      
      // 获取当前值（在参数区域内找数字）
      // 由于没有稳定的选择器，这里简化处理：如果目标值等于默认值则不操作
      // 实际使用中，提示词里直接写 --stylize 250 --chaos 5 更可靠
      console.log(`[MXAI] 参数 ${param} 建议通过提示词参数设置（--${param} ${value}），而非页面滑块`);
    } catch (e) {
      console.log(`[MXAI] 参数 ${param} 设置跳过: ${e.message}`);
    }
  }

  /**
   * 点击立即生成按钮
   */
  async clickGenerate() {
    const genBtn = this.page.locator('div:has-text("立即生成")').filter({ hasText: '立即生成' }).first();
    
    // 更精确：找紫色的立即生成按钮
    const buttons = await this.page.locator('text=立即生成').all();
    let clicked = false;
    
    for (const btn of buttons) {
      try {
        if (await btn.isVisible()) {
          const box = await btn.boundingBox();
          if (box && box.x < 700) { // 左侧创作区
            await btn.click();
            clicked = true;
            console.log('[MXAI] 已点击立即生成');
            break;
          }
        }
      } catch (e) { /* 继续 */ }
    }
    
    if (!clicked) {
      throw new Error('无法找到并点击立即生成按钮');
    }
  }

  /**
   * 记录当前最新的生成记录ID（用于后续判断新生成是否完成）
   */
  async _recordLatestResult() {
    try {
      // 创作中心的第一条记录（最新的）
      const firstRecord = this.page.locator('#创作中心 ~ div >> div[id*="serial-"]').first();
      const id = await firstRecord.getAttribute('id').catch(() => null);
      this.lastResultId = id;
      console.log(`[MXAI] 当前最新记录ID: ${id}`);
    } catch (e) {
      this.lastResultId = null;
    }
  }

  /**
   * 采集当前页面所有图片 src（含懒加载的 currentSrc）
   * @returns {Promise<Set<string>>}
   */
  async _collectImageSrcs() {
    try {
      const srcs = await this.page.evaluate(() =>
        Array.from(document.querySelectorAll('img'))
          .map(i => i.currentSrc || i.src || '')
          .filter(s => s && s.startsWith('http'))
      ).catch(() => []);
      return new Set(srcs);
    } catch (e) {
      return new Set();
    }
  }

  async _collectSerialIds() {
    try {
      const ids = await this.page.evaluate(() =>
        Array.from(document.querySelectorAll('div[id*="serial-"]')).map(d => d.id)
      ).catch(() => []);
      return new Set(ids);
    } catch (e) {
      return new Set();
    }
  }

  // 等待指定 serial 的图像真正渲染完成（缩略图为 qihuiai CDN 真实地址，而非 loading 占位）
  async _waitSerialRendered(id, timeout = 150000) {
    const start = Date.now();
    let lastLog = 0;
    let lastSrc = '';
    while (Date.now() - start < timeout) {
      const info = await this.page.evaluate((i) => {
        const el = document.getElementById(i);
        if (!el) return { ok: false, src: '', nw: 0, nh: 0, why: 'no el' };
        const imgs = Array.from(el.querySelectorAll('img'));
        // 取最大的那张（避免命中 logo/icon）
        const im = imgs.map(x => ({ x, s: x.currentSrc || x.src || '', w: x.naturalWidth || 0, h: x.naturalHeight || 0 }))
                       .sort((a, b) => (b.w * b.h) - (a.w * a.h))[0] || { s: '', w: 0, h: 0 };
        const ok = im.s && im.s.includes('qihuiai') && !im.s.includes('loading') && im.w > 100;
        return { ok, src: im.s, nw: im.w, nh: im.h, imgCount: imgs.length, why: ok ? '' : (im.s ? (im.s.includes('loading') ? 'loading' : 'small') : 'no img') };
      }, id).catch(() => ({ ok: false, src: '', nw: 0, nh: 0, why: 'eval err' }));
      if (info.src !== lastSrc) { lastSrc = info.src; lastLog = Date.now(); }
      if (info.ok) return { ok: true, src: info.src, w: info.nw, h: info.nh };
      // 每 20s 打一次进度
      if (Date.now() - lastLog > 20000) {
        lastLog = Date.now();
        const el = Math.round((Date.now() - start) / 1000);
        console.log(`[MXAI] 等待 serial ${id} 渲染... ${el}s src=${(info.src||'').slice(0,80)} nw=${info.nw} (${info.why})`);
      }
      await this.page.waitForTimeout(3000);
    }
    return { ok: false, src: lastSrc };
  }

  /**
   * 等待生成完成
   * 完成判定：与点击生成前基线相比出现 >=4 张新图；或出现明确的完成/失败文案。
   * @param {number} timeout - 超时时间（毫秒），默认120秒
   * @returns {object} - { success: boolean, message: string, recordId: string }
   */
  async waitForResult(timeout = 120000) {
    console.log('[MXAI] 等待生成完成...');
    const startTime = Date.now();
    const baseline = this._baselineSrcs || new Set();
    const baselineSerials = this._baselineSerials || new Set();
    const requiredNew = this._requiredNewImages || 4;

    while (Date.now() - startTime < timeout) {
      await this.page.waitForTimeout(3000);

      try {
        const srcs = await this._collectImageSrcs();
        const newSrcs = [...srcs].filter(s => !baseline.has(s));
        const serials = await this._collectSerialIds();
        const newSerials = [...serials].filter(s => !baselineSerials.has(s));
        const pageText = await this.page.evaluate(() => document.body ? document.body.innerText : '').catch(() => '');

        // 失败判定：只看「本次新 serial 卡片」内的失败文案。
        // 禁止扫全页 —— 列表里会残留历史失败卡片的旧文案，全页扫描必然误判。
        if (newSerials.length > 0) {
          const newestTmp = newSerials.slice().sort((a, b) => {
            const x = BigInt(b.split('-')[1] || '0');
            const y = BigInt(a.split('-')[1] || '0');
            return x < y ? -1 : (x > y ? 1 : 0);
          })[0];
          const ownFail = await this.page.evaluate((id) => {
            const el = document.getElementById(id);
            const t = el ? (el.innerText || '') : '';
            return t.match(/(绘图失败|生成失败|出图失败)[：:：]?\s*([^\n]{0,60})/);
          }, newestTmp).catch(() => null);
          if (ownFail) {
            const reason = (ownFail[2] || '未知原因').trim();
            console.log(`[MXAI] 生成失败（serial ${newestTmp}）: ${reason}`);
            return { success: false, message: `绘图失败：${reason}`, recordId: newestTmp };
          }
        }

        const elapsed = Math.round((Date.now() - startTime) / 1000);

        // 完成判定：出现新 serial（最可靠，mxai 4宫格常共用同一 src，按图数判定会漏）
        if (newSerials.length > 0) {
          // 选最大数值 serial（最新一条）。
          const newest = newSerials.slice().sort((a, b) => {
            const x = BigInt(b.split('-')[1] || '0');
            const y = BigInt(a.split('-')[1] || '0');
            return x < y ? -1 : (x > y ? 1 : 0);
          })[0];
          // 任务已受理（已扣费），但 MJ 出图需 1-2 分钟；serial 卡片的「下载」按钮
          // 只在出图完成后才出现 —— 它是比缩略图渲染更可靠的完成信号。
          // 轮询等待「下载」span 或失败文案，超时仍返回供下载阶段兜底。
          const waitStart = Date.now();
          const finishWait = Math.max(60000, timeout); // 至少再给等额时间让 MJ 出完图
          while (Date.now() - waitStart < finishWait) {
            await this.page.waitForTimeout(5000);
            const st = await this.page.evaluate((id) => {
              const el = document.getElementById(id);
              if (!el) return { done: false, failed: false };
              const hasDl = [...el.querySelectorAll('span')].some(s => (s.textContent || '').trim() === '下载');
              return { done: hasDl, failed: /绘图失败|生成失败/.test(el.innerText || '') };
            }, newest).catch(() => ({ done: false, failed: false }));
            if (st.failed) {
              console.log(`[MXAI] 生成失败（serial ${newest} 卡片含失败文案）`);
              return { success: false, message: `生成失败`, recordId: newest };
            }
            if (st.done) {
              console.log(`[MXAI] 生成完成！serial=${newest} 已出现「下载」按钮（共等待 ${Math.round((Date.now() - startTime) / 1000)}s）`);
              return { success: true, message: '生成完成', recordId: newest };
            }
          }
          console.log(`[MXAI] 警告: serial ${newest} 长时间未出「下载」按钮，交由下载阶段重试`);
          return { success: true, message: '生成完成（任务完成信号未出现，下载阶段将重试）', recordId: newest, warn: 'finish_timeout' };
        }

        // 完成判定：新增图片达到阈值，或新增图 + 完成文案
        if (newSrcs.length >= requiredNew) {
          console.log(`[MXAI] 生成完成！新增图片: ${newSrcs.length}（已等待 ${elapsed}s）`);
          return { success: true, message: '生成完成', recordId: null };
        }
        if (newSrcs.length > 0 && /绘制完成|生成成功|已生成|出图完成/.test(pageText)) {
          console.log(`[MXAI] 生成完成（文案确认）！新增图片: ${newSrcs.length}（已等待 ${elapsed}s）`);
          return { success: true, message: '生成完成', recordId: null };
        }

        // 仍处于进行中
        if (/生成中|排队中|等待|正在生成/.test(pageText)) {
          console.log(`[MXAI] 生成中... 已等待 ${elapsed}s（新增图 ${newSrcs.length}）`);
        }
      } catch (e) {
        console.log(`[MXAI] 等待中检查异常: ${e.message}`);
      }
    }

    return { success: false, message: `等待超时（${timeout / 1000}秒）`, recordId: null };
  }

  /**
   * 下载最新生成的图片
   * 逻辑：优先下载「与基线相比新增」的图片；无基线时下载当前页面全部图片的前 4 张。
   * @param {string} outputDir - 输出目录
   * @param {string} prefix - 文件名前缀（如 task_id）
   * @returns {string[]} - 下载的文件路径列表
   */
  async downloadLatestImages(outputDir, prefix = 'result') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const downloaded = [];
    let srcs = [];

    // 优先：最新 serial 记录容器内的图片（避免抓取页面图标/导航图）
    try {
      const firstRecord = this.page.locator('div[id*="serial-"]').first();
      if (await firstRecord.count()) {
        srcs = await firstRecord.locator('img').evaluateAll(imgs =>
          imgs.map(i => i.currentSrc || i.src || '').filter(s => s.startsWith('http'))
        );
      }
    } catch (e) { /* 忽略 */ }

    // 生成流程中已有基线：用「新增」的图片更可靠
    if (this._baselineSrcs && this._baselineSrcs.size) {
      const all = [...(await this._collectImageSrcs())];
      const newSrcs = all.filter(s => !this._baselineSrcs.has(s));
      if (newSrcs.length) srcs = newSrcs;
    }

    // 兜底：全部图片
    if (!srcs.length) {
      srcs = [...(await this._collectImageSrcs())];
    }

    // 最多下载前 4 张
    const targets = srcs.slice(0, 4);
    console.log(`[MXAI] 待下载图片: ${targets.length} 张`);

    for (let i = 0; i < targets.length; i++) {
      try {
        const src = targets[i];
        const ext = (src.split('?')[0].match(/\.(png|jpe?g|webp|gif)/i) || [])[1] || 'png';
        const filename = `${prefix}_${i + 1}.${ext}`;
        const filepath = path.join(outputDir, filename);

        const response = await this.page.request.get(src, {
          headers: {
            Referer: this.mxaiUrl,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          },
        });
        if (response.ok()) {
          const buffer = await response.body();
          fs.writeFileSync(filepath, buffer);
          downloaded.push(filepath);
          console.log(`[MXAI] 已下载: ${filename} (${buffer.length} bytes)`);
        } else {
          console.log(`[MXAI] 下载失败 HTTP ${response.status()}: ${src.slice(0, 80)}`);
        }
      } catch (e) {
        console.log(`[MXAI] 第 ${i + 1} 张图片下载失败: ${e.message}`);
      }
    }

    return downloaded;
  }

  /**
   * 通过页面上的「下载」按钮下载图片（捕获浏览器原生下载事件）
   * 流程：清理弹窗 → 点开最新记录详情 → 在详情视图找下载按钮 → 点击 → 捕获 download 事件 → 保存
   * @param {string} outputDir - 输出目录
   * @param {string} prefix - 文件名前缀
   * @param {number} timeout - 等待下载事件超时(ms)
   * @returns {object} - { success, downloaded:[...], error? }
   */
  async downloadLatestViaButton(outputDir, prefix = 'latest', timeout = 30000) {
    if (!this.page) return { error: '浏览器未启动' };
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const downloaded = [];

    try {
      // 1) 清弹窗，确保从列表页开始
      await this._dismissPopups();
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(800);

      // 2) 定位最新一条生成记录（按 serial id 数值取最大，避免 DOM 顺序歧义）
      const newestId = await this.page.evaluate(() => {
        const divs = Array.from(document.querySelectorAll('div[id*="serial-"]'));
        if (!divs.length) return null;
        divs.sort((a, b) => {
          const x = BigInt(b.id.split('-')[1] || '0');
          const y = BigInt(a.id.split('-')[1] || '0');
          return x < y ? -1 : (x > y ? 1 : 0);
        });
        return divs[0].id;
      });
      if (!newestId) return { error: '页面无生成记录' };
      const record = this.page.locator(`#${newestId}`);

      // ===== 主路径：点 serial 卡片操作栏的「下载」span，捕获原生 download 事件 =====
      // 站点原生下载按钮（data-v-8712fdb0 ml-2），直接吐高清原图（MJ v8.2 实测 1792x2688 PNG / 7.7MB），
      // 且不依赖缩略图是否已渲染（即使 <img> 仍卡 loading-new.gif，真实图已存在服务端）。
      try {
        // 「下载」span 只在 MJ 出图完成后才出现，先轮询等它（最多 3 分钟）
        let spanVisible = false;
        const dlSpanStart = Date.now();
        while (Date.now() - dlSpanStart < 180000) {
          spanVisible = await this.page.evaluate((id) => {
            const el = document.getElementById(id);
            return !!el && [...el.querySelectorAll('span')].some(s => (s.textContent || '').trim() === '下载');
          }, newestId).catch(() => false);
          if (spanVisible) break;
          if (/绘图失败|生成失败/.test(await this.page.evaluate(() => document.body ? document.body.innerText : '').catch(() => ''))) {
            return { error: '生成失败（页面含失败文案），无法下载' };
          }
          await this.page.waitForTimeout(5000);
        }
        if (!spanVisible) console.log('[MXAI] 等待「下载」按钮超时（3分钟），回退预览器');

        const dlSpan = this.page.locator(`#${newestId} span`).filter({ hasText: /^下载$/ }).first();
        if (await dlSpan.count()) {
          await dlSpan.scrollIntoViewIfNeeded().catch(() => {});
          await this.page.waitForTimeout(400);
          const [dl] = await Promise.all([
            this.page.waitForEvent('download', { timeout: Math.max(15000, timeout) }).catch(() => null),
            dlSpan.click({ timeout: 5000, force: true }),
          ]).catch(() => [null]);
          if (dl) {
            const suggested = dl.suggestedFilename() || '';
            const m = suggested.match(/\.(png|jpe?g|webp)$/i);
            const ext = m ? m[1].toLowerCase() : 'png';
            const fp = path.join(outputDir, `${prefix}_1.${ext}`);
            await dl.saveAs(fp);
            downloaded.push(fp);
            console.log(`[MXAI] 高清原图(下载按钮): ${fp} (${fs.statSync(fp).size} bytes)`);
            return { success: true, downloaded, note: '已通过下载按钮获取高清原图' };
          } else {
            console.log('[MXAI] 主路径「下载」按钮未触发 download 事件，回退预览器');
          }
        } else {
          console.log('[MXAI] 未找到 serial 内「下载」span，回退预览器');
        }
      } catch (e) {
        console.log(`[MXAI] 主路径「下载」失败: ${e.message}，回退预览器`);
      }

      // ===== 兜底：灯箱（.el-image-viewer__img → outputs 高清） =====
      // 等最新 serial 图像渲染完（不再 loading 占位），否则灯箱打不开也取不到原图
      const rendered = await this._waitSerialRendered(newestId, 180000);
      if (!rendered || !rendered.ok) console.log('[MXAI] 警告: 最新 serial 图像仍处加载中，将尝试直接打开灯箱');

      // 打开大图预览器（站点会给出正确签名的高清 outputs URL），带重试
      let opened = false;
      for (let attempt = 0; attempt < 4 && !opened; attempt++) {
        await this.page.locator(`#${newestId} .el-image`).first().click({ timeout: 5000 }).catch(() => {});
        await this.page.waitForTimeout(1200);
        opened = await this.page.waitForSelector('.el-image-viewer__img', { timeout: 5000 })
          .then(() => true).catch(() => false);
        if (!opened) {
          // 可能已跳详情页：点详情主图
          await this.page.locator('.el-image').first().click({ timeout: 5000 }).catch(() => {});
          await this.page.waitForTimeout(1200);
          opened = await this.page.waitForSelector('.el-image-viewer__img', { timeout: 5000 })
            .then(() => true).catch(() => false);
        }
        if (!opened) { await this.page.keyboard.press('Escape').catch(() => {}); await this.page.waitForTimeout(400); }
      }
      if (!opened) {
        const fb = await this._downloadFromDetailDom(this.page, outputDir, prefix);
        if (fb.length) return { success: true, downloaded: fb, note: '预览器未打开，已回退详情页' };
        return { error: '预览器未能打开' };
      }

      // 等待高清 outputs URL 就绪
      await this.page.waitForFunction(() => {
        const v = document.querySelector('.el-image-viewer__img');
        const s = v ? (v.currentSrc || v.src || '') : '';
        return s.includes('outputs');
      }, { timeout: 10000 }).catch(() => {});

      // 抓取预览器 outputs URL
      const src = await this.page.evaluate(() => {
        const v = document.querySelector('.el-image-viewer__img');
        const s = v ? (v.currentSrc || v.src || '') : '';
        return s.includes('outputs') ? s : '';
      });
      if (src) {
        const buf = await this.page.request.get(src, {
          headers: { Referer: this.mxaiUrl }, timeout: 30000,
        }).catch(() => null);
        if (buf && buf.ok()) {
          const body = await buf.body();
          const fp = path.join(outputDir, `${prefix}_1.webp`);
          fs.writeFileSync(fp, body);
          downloaded.push(fp);
          console.log(`[MXAI] 高清原图(预览器): ${fp} (${body.length} bytes)`);
        }
      }

      // 预览器内下载按钮兜底
      if (!downloaded.length) {
        const vBtn = this.page.locator('.el-image-viewer__actions')
          .locator('i.el-icon-download, [title="下载"], button, span:has-text("下载")').first();
        if (await vBtn.count()) {
          const [dl] = await Promise.all([
            this.page.waitForEvent('download', { timeout: timeout / 2 }).catch(() => null),
            vBtn.click({ timeout: 5000, force: true }),
          ]).catch(() => [null]);
          if (dl) {
            let ext = 'png';
            const m = (dl.suggestedFilename() || '').match(/\.(png|jpe?g|webp)$/i);
            if (m) ext = m[1].toLowerCase();
            const fp = path.join(outputDir, `${prefix}_1.${ext}`);
            await dl.saveAs(fp);
            downloaded.push(fp);
            console.log(`[MXAI] 预览器下载按钮(原生): ${fp}`);
          }
        }
      }

      await this.page.keyboard.press('Escape').catch(() => {});

      if (downloaded.length) return { success: true, downloaded, note: '已获取高清原图(预览器)' };
      const fb = await this._downloadFromDetailDom(this.page, outputDir, prefix);
      if (fb.length) return { success: true, downloaded: fb, note: '已回退详情页(仅缩略图)' };
      return { error: '未能获取高清原图' };
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * 兜底：从详情页 DOM 中抓取高清图片 URL 下载（不依赖按钮触发）
   */
  async _downloadFromDetailDom(targetPage, outputDir, prefix) {
    const downloaded = [];
    try {
      const candidates = await targetPage.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        const out = [];
        for (const i of imgs) {
          const s = i.currentSrc || i.src || '';
          if (!s.startsWith('http')) continue;
          if (s.includes('icon') || s.includes('/images/')) continue;
          if (!s.includes('qihuiai.com')) continue;
          // 排除缩略图路径，优先高清原图
          if (s.includes('/thumbnail/')) continue;
          out.push({ s, w: i.naturalWidth || 0, h: i.naturalHeight || 0 });
        }
        // 按尺寸降序，取最大者
        out.sort((a, b) => (b.w * b.h) - (a.w * a.h));
        return out.slice(0, 4).map(x => x.s);
      });
      if (!candidates.length) {
        // 实在没有非缩略图，再退回包含缩略图（保底）
        const all = await targetPage.evaluate(() => Array.from(document.querySelectorAll('img'))
          .map(i => i.currentSrc || i.src || '')
          .filter(s => s.startsWith('http') && s.includes('qihuiai.com') && !s.includes('icon') && !s.includes('/images/')));
        candidates.push(...all.slice(0, 4));
      }
      for (let i = 0; i < candidates.length; i++) {
        try {
          const ext = (candidates[i].split('?')[0].match(/\.(png|jpe?g|webp|gif)/i) || [])[1] || 'png';
          const buf = await targetPage.request.get(candidates[i], { headers: { Referer: this.mxaiUrl } });
          if (buf.ok()) {
            const fp = path.join(outputDir, `${prefix}_${i + 1}.${ext}`);
            fs.writeFileSync(fp, await buf.body());
            downloaded.push(fp);
          }
        } catch (e) { /* 忽略 */ }
      }
    } catch (e) { /* 忽略 */ }
    return downloaded;
  }

  /**
   * 安全的诊断（不抛错）
   */
  async _safeDiagnose(page) {
    try { return await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a[role="button"], [role="button"], span, div')).map(b => ({
        t: (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 24),
        c: ((b.className && b.className.toString ? b.className.toString() : '') || '').slice(0, 50),
      })).filter(x => x.t);
      return { url: location.href, buttons: btns.slice(0, 40) };
    }); } catch (e) { return { error: e.message }; }
  }

  /**
   * 诊断：输出当前页面 DOM 结构关键信息（记录容器 id、图片数量与 src、页面文本片段）
   */
  async diagnose() {
    if (!this.page) return { error: '浏览器未启动' };
    try {
      const info = await this.page.evaluate(() => {
        const serials = Array.from(document.querySelectorAll('div[id*="serial-"]')).map(d => d.id);
        const imgs = Array.from(document.querySelectorAll('img')).map(i => i.currentSrc || i.src || '').filter(Boolean);
        // 弹窗/遮罩/对话框：找常见 class 关键词 或 role=dialog
        const overlayKeywords = ['modal', 'dialog', 'popup', 'pop-up', 'overlay', 'mask', 'ad-', '-ad', 'advert', 'coupon', 'banner', 'notice', 'tip', 'guide', 'welcome'];
        const overlayCandidates = [];
        document.querySelectorAll('*').forEach(el => {
          const cls = (el.className && el.className.toString ? el.className.toString() : '') || '';
          const id = el.id || '';
          const role = el.getAttribute && el.getAttribute('role');
          const hit = overlayKeywords.some(k => cls.toLowerCase().includes(k) || id.toLowerCase().includes(k) || (role && role.toLowerCase().includes(k)));
          if (hit) {
            const rect = el.getBoundingClientRect();
            const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
            if (visible) {
              // 直接子元素里的关闭/取消按钮
              const closeSel = el.querySelector('button, a, [role="button"], span, div');
              const btnTexts = Array.from(el.querySelectorAll('button, a, [role="button"]')).map(b => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 12);
              overlayCandidates.push({
                tag: el.tagName,
                id,
                cls: cls.slice(0, 80),
                role,
                rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
                btnTexts,
              });
            }
          }
        });
        // 页面上所有按钮（含 a[role=button]）
        const allButtons = Array.from(document.querySelectorAll('button, a[role="button"], [role="button"]')).map(b => {
          const rect = b.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(b).display !== 'none';
          return {
            text: (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 30),
            cls: ((b.className && b.className.toString ? b.className.toString() : '') || '').slice(0, 60),
            visible,
          };
        }).filter(b => b.text).slice(0, 40);
        return {
          serialIds: serials.slice(0, 15),
          serialCount: serials.length,
          imgCount: imgs.length,
          imgSrcs: imgs.slice(0, 15),
          overlayCandidates: overlayCandidates.slice(0, 20),
          allButtons,
          bodySample: (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').slice(0, 600),
        };
      }).catch(e => ({ error: e.message }));
      return { url: this.page.url(), ...info };
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * 点开最新一条生成记录（打开详情/大图预览），等待加载后返回诊断信息
   * 用于在 mxai 详情视图中定位高清原图 URL。
   */
  async openLatestDetail() {
    if (!this.page) return { error: '浏览器未启动' };
    try {
      const record = this.page.locator('div[id*="serial-"]').first();
      if (!(await record.count())) return { error: '页面无生成记录' };
      const img = record.locator('img').first();
      await img.click({ timeout: 5000 }).catch(async () => {
        await record.click({ timeout: 5000 });
      });
      // 等待详情/预览加载（可能弹新窗口，用 context 事件捕获）
      const popupPromise = this.context.waitForEvent('page', { timeout: 3000 }).catch(() => null);
      await this.page.waitForTimeout(3000);
      const popup = await popupPromise;
      if (popup) {
        await popup.waitForLoadState('domcontentloaded').catch(() => {});
        await popup.waitForTimeout(2500);
        this.page = popup;
      }
      return await this.diagnose();
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * 只下载当前页面已有图片（不触发新生成）
   */
  async downloadLatest(outputDir, prefix = 'latest') {
    return this.downloadLatestImages(outputDir, prefix);
  }

  /**
   * 完整的生成流程
   * @param {string} prompt - 提示词（可包含参数，如 --v 8.2 --ar 9:16）
   * @param {object} options - { version, aspect, mode, stylize, chaos, outputDir, filePrefix, timeout }
   * @returns {object} - { success, message, images, recordId }
   */
  async generate(prompt, options = {}) {
    const {
      version = 'v8.2',
      aspect = '9:16',
      mode = 'normal',
      outputDir = path.join(__dirname, '.automation', 'results'),
      filePrefix = 'mxai_result',
      timeout = 240000,
    } = options;

    try {
      // 1. 确保浏览器已启动（session 持久化在 userDataDir，重复 navigate 不丢登录）
      // 注意：launch() 设置的是 this.context / this.page，不是 this.browser，故以 context 判重
      if (!this.context) {
        await this.launch();
      }
      // 每次生成都重新导航到干净的创作页：上一资产下载时可能开过灯箱/进过详情页，
      // 页面状态残留会导致 fillPrompt 找不到可见文本框 → 提示词填不进去 → 点生成无效。
      await this.navigate();

      // 2. 检查登录
      await this.ensureLoggedIn();

      // 3. 关闭弹窗
      await this._dismissPopups();

      // 4. 输入提示词
      await this.fillPrompt(prompt);

      // 5. 选择参数（提示词中已包含参数时，页面选择作为双保险）
      await this.selectVersion(version);
      await this.selectMode(mode);
      await this.selectAspect(aspect);

      // 6. 点击生成前记录基线（用于判断新增图片 / 新 serial）
      this._baselineSrcs = await this._collectImageSrcs();
      this._baselineSerials = await this._collectSerialIds();
      await this.clickGenerate();

      // 7. 等待结果
      const result = await this.waitForResult(timeout);

      // 8. 如果成功，通过页面「下载」按钮获取高清原图
      if (result.success) {
        const dl = await this.downloadLatestViaButton(outputDir, filePrefix, 30000).catch(e => ({ error: e.message }));
        const images = dl.downloaded || [];
        if (!images.length) {
          // 兜底：退回 URL 抓取（缩略图）
          const fallback = await this.downloadLatestImages(outputDir, filePrefix);
          console.log('[MXAI] 按钮下载无结果，已回退 URL 抓取');
          return { ...result, images: fallback };
        }
        return { ...result, images };
      }

      return result;
    } catch (e) {
      console.error(`[MXAI] 生成流程异常: ${e.message}`);
      return { success: false, message: e.message, images: [], recordId: null };
    }
  }
}

module.exports = MxaiAdapter;

// 命令行测试入口
if (require.main === module) {
  const adapter = new MxaiAdapter({ headless: false });
  
  (async () => {
    try {
      await adapter.launch();
      await adapter.navigate();
      
      const loggedIn = await adapter.isLoggedIn();
      console.log(`已登录: ${loggedIn}`);
      
      if (loggedIn) {
        // 测试：输入一个简单提示词但不点击生成
        await adapter.fillPrompt('测试提示词，一只可爱的猫咪 --v 8.2 --ar 9:16');
        await adapter.selectVersion('v8.2');
        await adapter.selectAspect('9:16');
        console.log('测试完成，未点击生成按钮');
      }
      
      // 保持浏览器打开供用户操作
      console.log('浏览器保持打开，按 Ctrl+C 退出');
    } catch (e) {
      console.error('测试失败:', e);
      await adapter.close();
    }
  })();
}
