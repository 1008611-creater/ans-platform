'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron');
const { APP_NAME, DEFAULT_URL, PARTITION_PREFIX } = require('./constants');
const { createStore } = require('./store');
const {
  createAccount,
  createManyAccounts,
  createAccountsFromLoginAccounts,
  accountLoginCredentials,
  updateAccount,
  markOpened,
  deleteAccounts,
  exportAccounts,
  importAccounts
} = require('./accounts');
const { parseLoginAccounts, serializeLoginAccounts } = require('./loginAccounts');
const { safeFilename, defaultFilename, makeWindowVideoFilename, toNoWatermarkUrl, isFplayUrl, resolveDolaFplay } = require('./nowatermark');
const { getMachineCode } = require('./online-license');

let mainWindow;
const childWindows = new Map();
let store;
let pageToolsScript = '';
let globalLoginAccounts = [];
let tempLogin = null;
let autoLoginArm = null;
let runtimeIntegrityCheckedAt = 0;
let licenseMonitorTimer = null;
let currentMachineCode = '';
let currentLicenseStatus = { ok: true, reason: 'free', message: '永久授权', license: { code: 'free', permanent: true, remainingText: '永久授权', verifiedAt: new Date().toISOString() } };
let licenseNotice = '';
const AUTO_LOGIN_TTL_MS = 10 * 60 * 1000;
const RUNTIME_INTEGRITY_TTL_MS = 30 * 1000;
const LICENSE_MONITOR_INTERVAL_MS = 58 * 1000;
const LICENSE_SUCCESS_CACHE_MS = 52 * 1000;
const LICENSE_RATE_LIMIT_BACKOFF_MS = 58 * 1000;
const LICENSE_MAX_FAILURES = 5;

function getStore() {
  if (!store) store = createStore(app.getPath('userData'));
  return store;
}

function getAccounts() {
  return getStore().readJson('accounts.json', []);
}

function getLicenseStatus() {
  return {
    ...currentLicenseStatus,
    notice: licenseNotice
  };
}

function getCurrentMachineCode() {
  if (!currentMachineCode) currentMachineCode = getMachineCode();
  return currentMachineCode;
}

async function initializeOnlineLicense() {
  currentMachineCode = getMachineCode();
  return currentLicenseStatus;
}

function assertRuntimeIntegrity({ force = false } = {}) {
  if (!app.isPackaged) return { ok: true, skipped: true };
  if (!force && Date.now() - runtimeIntegrityCheckedAt < RUNTIME_INTEGRITY_TTL_MS) {
    return { ok: true, cached: true };
  }
  runtimeIntegrityCheckedAt = Date.now();
  return { ok: true, skipped: true };
}

function assertLicensed() {
  return getLicenseStatus();
}

function saveAccounts(accounts) {
  getStore().writeJson('accounts.json', accounts);
}

function notifyAccountsChanged() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('accounts-changed');
}

async function checkRuntimeLicense({ notify = true, force = false } = {}) {
  return getLicenseStatus();
}

function startLicenseMonitor() {
  return null;
}

function browserPreloadPath() {
  return path.join(__dirname, 'browser-preload.js');
}

function pageToolsPath() {
  return path.join(__dirname, 'page-tools.js');
}

function readPageToolsScript() {
  if (!pageToolsScript) pageToolsScript = fs.readFileSync(pageToolsPath(), 'utf8');
  return pageToolsScript;
}

function supportedPageToolsUrl(url = '') {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
    return host === 'dola.com' || host.endsWith('.dola.com') ||
      host === 'doubao.com' || host.endsWith('.doubao.com') ||
      host === 'weavy.ai' || host.endsWith('.weavy.ai') ||
      host === 'accounts.google.com';
  } catch (_) {
    return false;
  }
}

function validAutoLoginArm(arm) {
  return !!(arm && Number(arm.expiresAt || 0) > Date.now());
}

function windowLoginArm(login, now = Date.now()) {
  if (!login) return null;
  return { email: login.email, ts: now, expiresAt: now + AUTO_LOGIN_TTL_MS };
}

function armWindowLogin(win, account) {
  const login = accountLoginCredentials(account);
  if (!win || win.isDestroyed() || !login) return null;
  win.__intlDoubaoTempLogin = login;
  win.__intlDoubaoAutoLoginArm = windowLoginArm(login);
  return login;
}

function decodeTitleSignal(title, prefix) {
  const start = `${prefix}|`;
  if (!String(title || '').startsWith(start)) return null;
  try { return JSON.parse(String(title).slice(start.length)); }
  catch (_) { return null; }
}

function handlePageTitleSignal(event, title, win) {
  const accounts = decodeTitleSignal(title, 'INTL_DOUBAO_SYNC_ACCOUNTS');
  if (accounts) {
    event.preventDefault();
    globalLoginAccounts = parseLoginAccounts(JSON.stringify(accounts));
    getStore().writeJson('login_accounts.json', globalLoginAccounts);
    return;
  }

  const login = decodeTitleSignal(title, 'INTL_DOUBAO_TEMP_LOGIN');
  if (login) {
    event.preventDefault();
    tempLogin = parseLoginAccounts(JSON.stringify([login]))[0] || null;
    if (win && !win.isDestroyed()) win.__intlDoubaoTempLogin = tempLogin;
    return;
  }

  const arm = decodeTitleSignal(title, 'INTL_DOUBAO_AUTO_LOGIN_ARM');
  if (arm) {
    event.preventDefault();
    autoLoginArm = arm;
    if (win && !win.isDestroyed()) win.__intlDoubaoAutoLoginArm = arm;
  }
}

function injectPageTools(win, account) {
  if (!win || win.isDestroyed()) return;
  const url = win.webContents.getURL();
  if (!supportedPageToolsUrl(url)) return;

  const loginAccounts = globalLoginAccounts.length ? globalLoginAccounts : getStore().readJson('login_accounts.json', []);
  const accountLogin = accountLoginCredentials(account);
  if (accountLogin && (!validAutoLoginArm(win.__intlDoubaoAutoLoginArm) || win.__intlDoubaoAutoLoginArm?.email !== accountLogin.email)) {
    armWindowLogin(win, account);
  }
  const mergedLoginAccounts = accountLogin
    ? [accountLogin, ...loginAccounts.filter((item) => String(item.email || '').toLowerCase() !== accountLogin.email.toLowerCase())]
    : loginAccounts;
  const armed = validAutoLoginArm(win.__intlDoubaoAutoLoginArm) || validAutoLoginArm(autoLoginArm);
  const login = armed ? (win.__intlDoubaoTempLogin || tempLogin || null) : null;
  const bootstrap = `
    window.__INTL_DOUBAO_ACCOUNT__ = ${JSON.stringify(account || {})};
    window.__INTL_DOUBAO_GLOBAL_LOGIN_ACCOUNTS__ = ${serializeLoginAccounts(mergedLoginAccounts)};
    window.__INTL_DOUBAO_TEMP_LOGIN__ = ${JSON.stringify(login)};
    window.__INTL_DOUBAO_AUTO_LOGIN_ARMED__ = ${armed ? 'true' : 'false'};
  `;
  win.webContents.executeJavaScript(bootstrap + '\n' + readPageToolsScript(), true)
    .catch((error) => getStore().appendLog('pageTools.injectFail', { url, message: error.message }));
}

function setupAccountWebContents(webContents, account, partition) {
  webContents.on('page-title-updated', (event, title) => {
    handlePageTitleSignal(event, title, BrowserWindow.fromWebContents(webContents));
  });

  webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 620,
          height: 780,
          minWidth: 420,
          minHeight: 560,
          title: '登录',
          webPreferences: {
            partition,
            preload: browserPreloadPath(),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            nativeWindowOpen: true
          }
        }
      };
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  webContents.on('did-create-window', (popup) => {
    const parent = BrowserWindow.fromWebContents(webContents);
    const accountLogin = armWindowLogin(popup, account);
    if (!accountLogin) {
      popup.__intlDoubaoTempLogin = parent?.__intlDoubaoTempLogin || tempLogin;
      popup.__intlDoubaoAutoLoginArm = parent?.__intlDoubaoAutoLoginArm || autoLoginArm;
    }
    popup.webContents.on('dom-ready', () => injectPageTools(popup, account));
    popup.webContents.on('did-finish-load', () => injectPageTools(popup, account));
    popup.webContents.on('did-stop-loading', () => injectPageTools(popup, account));
    popup.webContents.on('did-navigate', () => injectPageTools(popup, account));
    popup.webContents.on('did-navigate-in-page', () => injectPageTools(popup, account));
  });

  webContents.on('dom-ready', () => injectPageTools(BrowserWindow.fromWebContents(webContents), account));
  webContents.on('did-finish-load', () => injectPageTools(BrowserWindow.fromWebContents(webContents), account));
  webContents.on('did-stop-loading', () => injectPageTools(BrowserWindow.fromWebContents(webContents), account));
  webContents.on('did-navigate', () => injectPageTools(BrowserWindow.fromWebContents(webContents), account));
  webContents.on('did-navigate-in-page', () => injectPageTools(BrowserWindow.fromWebContents(webContents), account));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 920,
    minHeight: 620,
    title: APP_NAME,
    icon: path.join(__dirname, 'assets', 'app-icon.png'),
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function accountPartition(accountId) {
  return `${PARTITION_PREFIX}${accountId}`;
}

async function clearAccountData(accountId) {
  const partition = accountPartition(accountId);
  const ses = session.fromPartition(partition);
  await ses.clearStorageData();
  await ses.clearCache();
  getStore().appendLog('account.clearData', { accountId });
  return { ok: true };
}

function cookieUrl(cookie) {
  if (cookie.url) return cookie.url;
  const domain = String(cookie.domain || '').replace(/^\./, '') || 'localhost';
  return `${cookie.secure ? 'https' : 'http'}://${domain}${cookie.path || '/'}`;
}

async function exportSessionCookies(accounts) {
  const sessionStates = {};
  for (const account of accounts) {
    try {
      const cookies = await session.fromPartition(accountPartition(account.id)).cookies.get({});
      sessionStates[account.id] = { exportedAt: new Date().toISOString(), cookies };
    } catch (error) {
      getStore().appendLog('session.exportCookiesFail', { accountId: account.id, message: error.message });
    }
  }
  return sessionStates;
}

async function restoreSessionCookies(accountId, state) {
  if (!state || !Array.isArray(state.cookies)) return 0;
  const ses = session.fromPartition(accountPartition(accountId));
  let count = 0;
  for (const cookie of state.cookies) {
    try {
      const copy = { ...cookie, url: cookieUrl(cookie) };
      delete copy.hostOnly;
      delete copy.session;
      await ses.cookies.set(copy);
      count += 1;
    } catch (_) {}
  }
  try { await ses.flushStorageData(); } catch (_) {}
  return count;
}

function openAccount(accountId) {
  const accounts = getAccounts();
  const account = accounts.find((item) => item.id === accountId);
  if (!account) throw new Error('账号不存在');

  const existing = childWindows.get(accountId);
  if (existing && !existing.isDestroyed()) {
    const login = armWindowLogin(existing, account);
    existing.focus();
    injectPageTools(existing, account);
    return { ok: true, reused: true, partition: accountPartition(accountId), autoLogin: !!login };
  }

  const partition = accountPartition(accountId);
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    title: account.name,
    icon: path.join(__dirname, 'assets', 'app-icon.png'),
    webPreferences: {
      partition,
      preload: browserPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      nativeWindowOpen: true
    }
  });

  childWindows.set(accountId, win);
  const login = armWindowLogin(win, account);
  win.on('closed', () => childWindows.delete(accountId));
  setupAccountWebContents(win.webContents, account, partition);
  win.loadURL(account.url || DEFAULT_URL);
  for (const delay of [1200, 3000, 7000]) {
    setTimeout(() => injectPageTools(win, account), delay);
  }

  const updated = accounts.map((item) => item.id === accountId ? markOpened(item) : item);
  saveAccounts(updated);
  getStore().appendLog('account.open', { accountId, partition, url: account.url || DEFAULT_URL, autoLogin: !!login });
  notifyAccountsChanged();

  return { ok: true, reused: false, partition };
}

function registerIpc() {
  ipcMain.handle('app:getBootstrap', () => ({
    appName: APP_NAME,
    defaultUrl: DEFAULT_URL,
    dataDir: getStore().getDataDir(),
    machineCode: getCurrentMachineCode(),
    license: getLicenseStatus(),
    accounts: getAccounts(),
    logs: getStore().readJson('logs.json', [])
  }));

  ipcMain.handle('license:status', async () => ({
    machineCode: getCurrentMachineCode(),
    license: await checkRuntimeLicense({ notify: false })
  }));

  ipcMain.handle('license:activate', async (_, card) => {
    currentLicenseStatus = { ok: true, reason: 'free', message: '永久授权', license: { code: 'free', permanent: true, remainingText: '永久授权', verifiedAt: new Date().toISOString() } };
    return { ok: true, machineCode: getCurrentMachineCode(), license: getLicenseStatus() };
  });

  ipcMain.handle('license:clear', () => {
    currentLicenseStatus = { ok: true, reason: 'free', message: '永久授权', license: { code: 'free', permanent: true, remainingText: '永久授权', verifiedAt: new Date().toISOString() } };
    return { ok: true, machineCode: getCurrentMachineCode(), license: getLicenseStatus() };
  });

  ipcMain.handle('accounts:list', () => {
    assertLicensed();
    return getAccounts();
  });

  ipcMain.handle('accounts:create', (_, input) => {
    assertLicensed();
    const account = createAccount(input);
    const accounts = [account, ...getAccounts()];
    saveAccounts(accounts);
    getStore().appendLog('account.create', { accountId: account.id, name: account.name });
    notifyAccountsChanged();
    return account;
  });

  ipcMain.handle('accounts:createMany', (_, input) => {
    assertLicensed();
    const created = createManyAccounts(input);
    saveAccounts([...created, ...getAccounts()]);
    let opened = 0;
    if (input && input.openAfterCreate) {
      for (const account of created) {
        try {
          openAccount(account.id);
          opened += 1;
        } catch (error) {
          getStore().appendLog('accounts.createMany.openFail', { accountId: account.id, message: error.message });
        }
      }
    }
    getStore().appendLog('accounts.createMany', { count: created.length, openAfterCreate: !!input?.openAfterCreate, opened });
    notifyAccountsChanged();
    return { ok: true, accounts: created, count: created.length, opened };
  });

  ipcMain.handle('accounts:update', (_, input) => {
    assertLicensed();
    const accounts = getAccounts();
    const index = accounts.findIndex((item) => item.id === input.id);
    if (index === -1) throw new Error('账号不存在');
    accounts[index] = updateAccount(accounts[index], input);
    saveAccounts(accounts);
    getStore().appendLog('account.update', { accountId: accounts[index].id, name: accounts[index].name });
    notifyAccountsChanged();
    return accounts[index];
  });

  ipcMain.handle('accounts:deleteMany', async (_, ids, clearData = false) => {
    assertLicensed();
    const result = deleteAccounts(getAccounts(), ids);
    saveAccounts(result.remaining);
    for (const account of result.removed) {
      const win = childWindows.get(account.id);
      if (win && !win.isDestroyed()) win.close();
      childWindows.delete(account.id);
      if (clearData) await clearAccountData(account.id);
    }
    getStore().appendLog('accounts.deleteMany', { count: result.removed.length, clearData: !!clearData });
    notifyAccountsChanged();
    return { ok: true, count: result.removed.length };
  });

  ipcMain.handle('accounts:open', (_, accountId) => {
    assertLicensed();
    return openAccount(accountId);
  });
  ipcMain.handle('accounts:clearData', (_, accountId) => {
    assertLicensed();
    return clearAccountData(accountId);
  });

  ipcMain.handle('accounts:export', async (_, ids = []) => {
    assertLicensed();
    const idSet = new Set((Array.isArray(ids) ? ids : [ids]).filter(Boolean));
    const source = getAccounts().filter((account) => !idSet.size || idSet.has(account.id));
    const file = await dialog.showSaveDialog(mainWindow, {
      title: '导出账号配置',
      defaultPath: 'intl-doubao-accounts.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (file.canceled || !file.filePath) return { ok: false, canceled: true };
    const pkg = exportAccounts(source);
    pkg.sessionStates = await exportSessionCookies(source);
    fs.writeFileSync(file.filePath, JSON.stringify(pkg, null, 2), 'utf8');
    getStore().appendLog('accounts.export', { count: source.length, filePath: file.filePath, withCookies: true });
    return { ok: true, count: source.length, filePath: file.filePath };
  });

  ipcMain.handle('accounts:import', async () => {
    assertLicensed();
    const picked = await dialog.showOpenDialog(mainWindow, {
      title: '导入账号配置或登录账号 TXT',
      properties: ['openFile'],
      filters: [
        { name: '账号文件', extensions: ['json', 'txt', 'csv'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'TXT/CSV', extensions: ['txt', 'csv'] }
      ]
    });
    if (picked.canceled || !picked.filePaths.length) return { ok: false, canceled: true };
    const filePath = picked.filePaths[0];
    const raw = fs.readFileSync(filePath, 'utf8');
    const extension = path.extname(filePath).toLowerCase();
    let pkg = null;
    let imported = [];
    let loginRows = [];
    let restoredCookies = 0;

    if (extension === '.json') {
      try { pkg = JSON.parse(raw); }
      catch (_) { pkg = null; }
    }

    if (pkg) {
      imported = importAccounts(pkg);
    } else {
      loginRows = parseLoginAccounts(raw);
      if (!loginRows.length) throw new Error('导入文件没有账号数据');
      imported = createAccountsFromLoginAccounts(loginRows, { name: 'Dola', url: DEFAULT_URL });
      globalLoginAccounts = loginRows;
      getStore().writeJson('login_accounts.json', loginRows);
    }

    saveAccounts([...imported, ...getAccounts()]);
    if (pkg) {
      const importedLogins = imported.map(accountLoginCredentials).filter(Boolean);
      if (importedLogins.length) {
        globalLoginAccounts = importedLogins;
        getStore().writeJson('login_accounts.json', importedLogins);
      }
      const sourceAccounts = Array.isArray(pkg?.accounts) ? pkg.accounts : [];
      for (let index = 0; index < imported.length; index += 1) {
        const sourceId = sourceAccounts[index]?.id;
        const state = pkg?.sessionStates?.[sourceId] || pkg?.sessionStates?.[imported[index].id];
        restoredCookies += await restoreSessionCookies(imported[index].id, state);
      }
    }
    getStore().appendLog('accounts.import', { count: imported.length, filePath, restoredCookies, loginRows: loginRows.length });
    notifyAccountsChanged();
    return { ok: true, count: imported.length, accounts: imported, restoredCookies };
  });

  ipcMain.handle('system:openDataDir', () => shell.openPath(getStore().getDataDir()));
  ipcMain.handle('page:openDownloads', () => {
    assertLicensed();
    return shell.openPath(app.getPath('downloads'));
  });
  ipcMain.handle('weavy:getWorkflowPayload', () => {
    assertLicensed();
    return {
      ok: true,
      text: JSON.stringify({
        format: 'INTL_DOUBAO_WEAVY_WORKFLOW_V1',
        name: 'Clean-room starter canvas',
        createdAt: new Date().toISOString(),
        nodes: []
      }, null, 2)
    };
  });
  ipcMain.handle('page:resolveNoWatermark', async (_, input = {}) => {
    assertLicensed();
    const fplayUrl = toNoWatermarkUrl(input.fplayUrl || input.url || '');
    if (!isFplayUrl(fplayUrl)) throw new Error('未捕获到 Dola fplay 视频链接');
    const result = await resolveDolaFplay({ ...input, fplayUrl });
    getStore().appendLog('page.resolveNoWatermark', { fplayUrl, ok: true });
    return result;
  });
  ipcMain.handle('page:downloadVideo', async (_, input = {}) => {
    assertLicensed();
    const url = toNoWatermarkUrl(String(input.videoUrl || input.url || '').trim());
    if (!/^https?:\/\//i.test(url)) throw new Error('视频链接无效');
    const result = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow() || mainWindow, {
      title: '保存视频',
      defaultPath: safeFilename(input.filename || makeWindowVideoFilename(input) || defaultFilename(url)),
      filters: [{ name: 'Video', extensions: ['mp4', 'webm', 'mov', 'm4v'] }, { name: 'All files', extensions: ['*'] }]
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`下载失败：HTTP ${response.status}`);
    fs.writeFileSync(result.filePath, Buffer.from(await response.arrayBuffer()));
    shell.showItemInFolder(result.filePath);
    getStore().appendLog('page.downloadVideo', { url, filePath: result.filePath });
    return { ok: true, filePath: result.filePath };
  });
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  if (!hasSingleInstanceLock) return;
  await initializeOnlineLicense();
  registerIpc();
  createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  if (licenseMonitorTimer) clearInterval(licenseMonitorTimer);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
