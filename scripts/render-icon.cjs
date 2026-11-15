// Renders the BINDit app icon (the silver "B" from the logo on a dark rounded tile)
// to build/icon.png at 1024x1024. electron-builder turns it into the Windows .ico.
//
//   node_modules/electron/dist/electron.exe scripts/render-icon.cjs
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
// embedded as a data URL: a data: page can't load file:// fonts
const font = 'data:font/woff2;base64,' + fs.readFileSync(path.join(root, 'node_modules/@fontsource/russo-one/files/russo-one-latin-400-normal.woff2')).toString('base64')
const out = path.join(root, 'build', 'icon.png')
const SIZE = 1024

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Russo One'; src: url('${font}') format('woff2'); }
html, body { margin: 0; width: ${SIZE}px; height: ${SIZE}px; background: transparent; overflow: hidden; }
.tile {
  position: absolute; inset: 56px; border-radius: 210px;
  background: radial-gradient(120% 100% at 30% 0%, #2b2b2b 0%, #111 55%, #000 100%);
  box-shadow: inset 0 0 0 9px rgba(255,255,255,.16), inset 0 18px 30px rgba(255,255,255,.05);
  display: flex; align-items: center; justify-content: center;
}
.b {
  font-family: 'Russo One'; font-size: 640px; line-height: 1; margin-top: 18px; padding: 0 .04em;
  background: linear-gradient(100deg, #8a8a8a 0%, #d9d9d9 18%, #ffffff 30%, #a8a8a8 46%, #e6e6e6 62%, #ffffff 72%, #9a9a9a 88%, #cfcfcf 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
</style></head><body><div class="tile"><span class="b">B</span></div></body></html>`

app.disableHardwareAcceleration()
app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    useContentSize: true,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true }
  })
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  await win.webContents.executeJavaScript('document.fonts.ready.then(() => document.fonts.check("640px \\"Russo One\\""))')
  await new Promise((r) => setTimeout(r, 300))
  const img = await win.webContents.capturePage()
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, img.resize({ width: SIZE, height: SIZE }).toPNG())
  console.log(`wrote ${out} (${img.getSize().width}x${img.getSize().height})`)
  app.quit()
})
