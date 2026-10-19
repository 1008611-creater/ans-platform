/**
 * macOS / Windows 桌面透明置顶纪念桌宠启动器 (Electron Wrapper)
 *
 * 运行方式：
 *   1. 启动前端服务：npm run dev (默认 http://localhost:5173)
 *   2. 启动透明置顶桌面宠物：npx electron desktop-pet/main.cjs
 */

const { app, BrowserWindow, screen } = require('electron')

function createDesktopPetWindow() {
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize

  const win = new BrowserWindow({
    width: 360,
    height: 480,
    x: width - 384,
    y: height - 510,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    webPreferences: {
      contextIsolation: true,
    },
  })

  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  const targetUrl = process.env.PET_URL || 'http://localhost:5173/?pet=standalone'
  win.loadURL(targetUrl)
}

app.whenReady().then(createDesktopPetWindow)
app.on('window-all-closed', () => {
  app.quit()
})
