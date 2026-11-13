; FlyffBind browser test  (AutoHotkey v1.1 — double-click to run)
;
; Checks whether keys sent in the background (ControlSend, the way FlyffBind does it)
; reach Firefox, Chrome, Edge and Brave:
;   side      window visible but another window focused (normal multi-client setup)
;   covered   window completely hidden behind another window
;   minimized window minimized
;   ctrl      whether a Ctrl key you are holding leaks into the background window
; Chromium browsers are tested twice: default, and with the "don't pause hidden windows"
; launch options.
;
; Safety: every browser runs with its own temporary test profile (your normal browsers,
; tabs and logins are not touched). Keys are only ever sent to the test window, and the
; script checks a test window is really in front before it clicks anything.
; Press Esc at any time to stop.
#NoEnv
#SingleInstance Force
SetTitleMatchMode, 2
CoordMode, Mouse, Screen
SetBatchLines, -1

Root := A_Temp "\FlyffBindBrowserTest"
Url := "file:///" StrReplace(A_ScriptDir "\keytest.html", "\", "/")
NoPauseOpts := " --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling --disable-features=CalculateNativeWinOcclusion"
HalfW := A_ScreenWidth // 2
Report := ""

EnvGet, LocalApp, LOCALAPPDATA
EnvGet, Pf86, ProgramFiles(x86)
Browsers := []
AddBrowser("Firefox", "firefox.exe", [A_ProgramFiles "\Mozilla Firefox\firefox.exe", Pf86 "\Mozilla Firefox\firefox.exe"])
AddBrowser("Chrome", "chrome.exe", [LocalApp "\Google\Chrome\Application\chrome.exe", A_ProgramFiles "\Google\Chrome\Application\chrome.exe", Pf86 "\Google\Chrome\Application\chrome.exe"])
AddBrowser("Edge", "msedge.exe", [Pf86 "\Microsoft\Edge\Application\msedge.exe", A_ProgramFiles "\Microsoft\Edge\Application\msedge.exe"])
AddBrowser("Brave", "brave.exe", [A_ProgramFiles "\BraveSoftware\Brave-Browser\Application\brave.exe", LocalApp "\BraveSoftware\Brave-Browser\Application\brave.exe"])

if !FileExist(A_ScriptDir "\keytest.html") {
    MsgBox, 16, FlyffBind browser test, keytest.html must be in the same folder as this script.
    ExitApp
}
names := ""
for i, b in Browsers
    names .= (names ? ", " : "") b.name
runs := 0
for i, b in Browsers
    runs += (b.name = "Firefox") ? 1 : 2
MsgBox, 65, FlyffBind browser test, % "This opens " names " one at a time in temporary test profiles (your normal browsers and logins are not touched) and checks whether background keys reach them.`n`nIt takes about " Ceil(runs * 40 / 60) " minutes. Please don't touch the mouse or keyboard until the results appear.`n`nPress Esc at any time to stop.`n`nClick OK to start."
IfMsgBox, Cancel
    ExitApp

Gui, Cover:+AlwaysOnTop -Caption +ToolWindow
Gui, Cover:Color, 202020
Gui, Cover:Font, s16 cWhite, Segoe UI
Gui, Cover:Add, Text, x40 y40 w600, FlyffBind browser test running...`nPlease don't touch the mouse or keyboard.`n(Esc to stop)

for i, b in Browsers {
    RunOne(b, false)
    if (b.name != "Firefox")
        RunOne(b, true)
}
Finish()
return

Esc::
Report .= "`n(stopped early with Esc)`n"
Finish()
return

; ---------------------------------------------------------------------------

AddBrowser(name, exeName, paths) {
    global Browsers
    for i, p in paths
        if FileExist(p) {
            Browsers.Push({name: name, exe: p, exeName: exeName})
            return
        }
}

RunOne(b, noPause) {
    global Root, Url, NoPauseOpts, HalfW, Report
    tag := b.name (noPause ? " + no-pause options" : "")
    prof := Root "\" b.name (noPause ? "-nopause" : "")
    FileRemoveDir, %prof%, 1
    FileCreateDir, %prof%
    exe := b.exe
    opts := noPause ? NoPauseOpts : ""
    if (b.name = "Firefox")
        Run, "%exe%" -no-remote -profile "%prof%" -new-window "%Url%"
    else
        Run, "%exe%" --user-data-dir="%prof%" --no-first-run --no-default-browser-check --disable-sync --disable-extensions%opts% --new-window "%Url%"
    WinWait, % "KT| ahk_exe " b.exeName, , 30
    if ErrorLevel {
        Line(tag, "could not open the test page")
        Cleanup(prof)
        return
    }
    hwnd := WinExist()
    WinRestore, ahk_id %hwnd%
    WinMove, ahk_id %hwnd%, , 0, 0, %HalfW%, %A_ScreenHeight%
    Sleep, 1500

    ; Give the page keyboard focus with one click, but only if the test window is in front there.
    WinActivate, ahk_id %hwnd%
    WinWaitActive, ahk_id %hwnd%, , 5
    cx := HalfW // 2, cy := A_ScreenHeight // 2
    if (!WinActive("ahk_id " hwnd) || RootAt(cx, cy) != hwnd) {
        Line(tag, "could not bring the test window to the front (skipped)")
        WinClose, ahk_id %hwnd%
        Cleanup(prof)
        return
    }
    MouseGetPos, mx, my
    Click, %cx%, %cy%
    MouseMove, %mx%, %my%, 0
    Sleep, 700

    render := 0
    ControlGet, render, Hwnd, , Chrome_RenderWidgetHostHWND1, ahk_id %hwnd%

    ; Baseline: window focused. If this fails the page itself isn't getting keys.
    base := Visible(hwnd, hwnd)
    if (Received(base) < 3) {
        Line(tag, "page did not receive keys even when focused (got [" base "]) — test invalid for this browser")
        WinClose, ahk_id %hwnd%
        Cleanup(prof)
        return
    }

    ; Side by side: test window visible, our cover window focused on the right half.
    Gui, Cover:Show, x%HalfW% y0 w%HalfW% h%A_ScreenHeight%, FB cover
    WinActivate, FB cover
    WinWaitActive, FB cover, , 3
    Sleep, 1200
    side := Visible(hwnd, hwnd)
    sideR := render ? Visible(hwnd, render) : ""
    ctrl := ""
    if WinActive("FB cover") {
        Send, {Ctrl down}
        ctrl := Visible(hwnd, hwnd)
        Send, {Ctrl up}
    }

    cov := Hidden(hwnd, hwnd, "cover")
    covR := render ? Hidden(hwnd, render, "cover") : ""
    mini := Hidden(hwnd, hwnd, "min")
    miniR := render ? Hidden(hwnd, render, "min") : ""

    Gui, Cover:Hide
    out := "side=" Verdict(side, true)
    if render
        out .= " (inner:" Verdict(sideR, true) ")"
    out .= " | covered=" Verdict(cov, false)
    if render
        out .= " (inner:" Verdict(covR, false) ")"
    out .= " | minimized=" Verdict(mini, false)
    if render
        out .= " (inner:" Verdict(miniR, false) ")"
    out .= " | held Ctrl=" (ctrl = "" ? "not tested" : InStr(ctrl, "^") ? "LEAKS" : "ok")
    Line(tag, out)

    WinClose, ahk_id %hwnd%
    Cleanup(prof)
}

Line(tag, text) {
    global Report
    Report .= Format("{:-28}", tag) " " text "`n"
}

RootAt(x, y) {
    h := DllCall("WindowFromPoint", "Int64", (y << 32) | (x & 0xFFFFFFFF), "Ptr")
    return DllCall("GetAncestor", "Ptr", h, "UInt", 2, "Ptr")
}

KeysOf(h) {
    WinGetTitle, t, ahk_id %h%
    RegExMatch(t, "KT\|([^|]*)\|", m)
    return m1
}

Delta(before, after) {
    return (SubStr(after, 1, StrLen(before)) = before) ? SubStr(after, StrLen(before) + 1) : after
}

Received(got) {
    return StrLen(RegExReplace(got, "[\^!+*]"))
}

SendTest(target) {
    SetKeyDelay, 10
    ControlSend, , {Blind}{2}{8}{z}, ahk_id %target%
}

Visible(hwnd, target) {
    before := KeysOf(hwnd)
    SendTest(target)
    Sleep, 1200
    return Delta(before, KeysOf(hwnd))
}

Hidden(hwnd, target, how) {
    global HalfW
    before := KeysOf(hwnd)
    if (how = "cover") {
        Gui, Cover:Show, x0 y0 w%A_ScreenWidth% h%A_ScreenHeight%, FB cover
        WinActivate, FB cover
    } else {
        WinMinimize, ahk_id %hwnd%
    }
    Sleep, 3000
    SendTest(target)
    Sleep, 1500
    ; Show it again and read what it got. '*' = handled while hidden.
    if (how = "cover") {
        Gui, Cover:Show, x%HalfW% y0 w%HalfW% h%A_ScreenHeight%, FB cover
    } else {
        WinRestore, ahk_id %hwnd%
        WinMove, ahk_id %hwnd%, , 0, 0, %HalfW%, %A_ScreenHeight%
        WinActivate, FB cover
    }
    Sleep, 2000
    return Delta(before, KeysOf(hwnd))
}

; visible tests: OK / MISSING ; hidden tests: OK (works while hidden) / DELAYED (only once shown) / MISSING
Verdict(got, visible) {
    n := Received(got)
    if (n = 0)
        return "MISSING"
    if (n < 3)
        return "PARTIAL"
    if visible
        return "OK"
    StringReplace, got, got, *, *, UseErrorLevel
    return (ErrorLevel >= 3) ? "OK" : "DELAYED"
}

Cleanup(prof) {
    Sleep, 1500
    for p in ComObjGet("winmgmts:").ExecQuery("Select ProcessId, CommandLine from Win32_Process")
        if (p.CommandLine != "" && InStr(p.CommandLine, prof))
            Process, Close, % p.ProcessId
    Sleep, 1000
    FileRemoveDir, %prof%, 1
}

Finish() {
    global Report, Root
    Gui, Cover:Destroy
    for p in ComObjGet("winmgmts:").ExecQuery("Select ProcessId, CommandLine from Win32_Process")
        if (p.CommandLine != "" && InStr(p.CommandLine, "FlyffBindBrowserTest"))
            Process, Close, % p.ProcessId
    Sleep, 1000
    FileRemoveDir, %Root%, 1
    text := "FlyffBind browser test  " A_YYYY "-" A_MM "-" A_DD " " A_Hour ":" A_Min "`n`n" Report
        . "`nside = visible next to another window, covered = fully hidden, minimized = minimized"
        . "`nOK = keys arrived, DELAYED = arrived only once the window was shown again, MISSING = never arrived"
        . "`n(inner) = keys sent to Chrome's inner page window instead of the main window`n"
    FileDelete, %A_ScriptDir%\results.txt
    FileAppend, %text%, %A_ScriptDir%\results.txt, UTF-8
    Clipboard := text
    MsgBox, 64, FlyffBind browser test — done, % text "`nThese results are saved in results.txt and copied to your clipboard — paste them to Claude."
    ExitApp
}
