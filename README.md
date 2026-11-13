# FlyffBind

Control several Flyff Universe accounts (one Firefox profile each) from one keyboard. FlyffBind sends key presses to background Firefox windows by PID (AutoHotkey `ControlSend`), so you never have to switch windows. It can also play back mouse moves and clicks.

## Using it
1. **Profiles** (left sidebar): **Default** is a scratch space. Click **Save as…** to keep a setup as its own named profile. Named profiles show an amber dot when they have unsaved changes; use **Save** (Ctrl+S) or **Discard**. Each profile's ⋯ menu has rename, duplicate, **Export / share** and delete. Friends load a shared `.flyffbind` file with **Import** (folder icon).
2. **Windows**: add one per account (e.g. Templar, Seraph, DPS), click **Link** and then click that Firefox window. Its PID is captured automatically. PIDs change whenever Firefox restarts, so **Re-link** when a tile turns red.
3. **Macros**: **Add macro**, then:
   1. **Trigger**: press the key. Mouse 4/5 and middle click work too.
   2. **Name** the macro.
   3. **Action**:
      - **Keystrokes**: keys sent to your game windows in the background.
      - **Recorded Path**: record your mouse moves and clicks (press Esc to finish).
      - **Click Points**: pick spots on screen to click one after another.
   4. **Behavior**: **No Repeat**, **Repeat While Holding** or **Toggle**.
4. **Start / Stop**: press **Start**, or set a **Start / Stop key** and press it in game. Both do the same thing. Edits apply live, even before you save.

Where profiles are stored
- Saved profiles are stored as one file each in **`Documents\FlyffBind\Profiles\<Name>.flyffbind`**. Every file in that folder appears in the app automatically, even while it's running. The folder icon in the sidebar opens it.
- These files are shareable as-is. Linked-window PIDs are kept separately in `%APPDATA%\FlyffBind\window-links.json`, so a friend never receives your PIDs.
- The scratch **Default** profile lives in `%APPDATA%\FlyffBind\default.flyffbind`.

Notes
- Each account needs its **own Firefox profile** (`firefox -P`). Windows from the same profile share one PID.
- Keystroke macros use AHK `{Blind}` mode, so holding Ctrl/Alt/Shift for your own skill bars isn't broken while a loop runs.
- Mouse macros move your real cursor and click whatever is under it.

## Supported browsers
**Firefox only.** Chrome, Edge and Brave ignore keys sent to a window that isn't focused, so they can't be controlled in the background. You can check this on your own PC with `tools/browser-test/BrowserTest.ahk`.

## License
MIT, see `LICENSE`. The bundled AutoHotkey runtime is GPL v2.

## Development
```
npm install
npm run dev       # run the app
npm test          # AHK generator unit tests
npm run dist      # build dist/FlyffBind Setup x.y.z.exe and the portable exe
```
`resources/ahk/AutoHotkeyU64.exe` (AutoHotkey v1.1.36.01, GPL v2, see `license.txt`; source at https://github.com/AutoHotkey/AutoHotkey) is bundled together with `picker.ahk` (window/point picker) and `recorder.ahk` (mouse recorder). Generated engine scripts are written to `%APPDATA%\FlyffBind\engine\`.
