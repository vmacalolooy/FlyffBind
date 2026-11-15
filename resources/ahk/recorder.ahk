; BINDit mouse recorder.
; Records cursor movement and button presses (which still go through to the screen)
; until Esc is pressed, then prints one step per line to stdout:
;   <type>,<button>,<x>,<y>,<ms since previous step>
; type = m (move), d (down), u (up); button = L / R / M (or - for moves).
; Output "CANCEL" if nothing was recorded. Stops by itself after 5 minutes.
#NoEnv
#SingleInstance Off
#NoTrayIcon
#UseHook On
SetBatchLines, -1
CoordMode, Mouse, Screen
CoordMode, ToolTip, Screen

MaxSteps := 6000
Count := 0
Out := ""
Last := A_TickCount
MouseGetPos, LX, LY
ToolTip, % "Recording mouse...  move and click as needed, then press Esc to finish", A_ScreenWidth // 2 - 220, 8
SetTimer, Sample, 10
SetTimer, Timeout, -300000
return

Add(type, btn, x, y) {
    global
    if (Count >= MaxSteps)
        return
    now := A_TickCount
    dt := (Count = 0) ? 0 : now - Last
    Last := now
    Out .= type "," btn "," x "," y "," dt "`n"
    Count++
}

Sample:
MouseGetPos, x, y
if (x != LX || y != LY) {
    Add("m", "-", x, y)
    LX := x, LY := y
}
return

~*LButton::Btn("d", "L")
~*LButton Up::Btn("u", "L")
~*RButton::Btn("d", "R")
~*RButton Up::Btn("u", "R")
~*MButton::Btn("d", "M")
~*MButton Up::Btn("u", "M")

Btn(type, btn) {
    global
    MouseGetPos, x, y
    if (x != LX || y != LY) {
        Add("m", "-", x, y)
        LX := x, LY := y
    }
    Add(type, btn, x, y)
}

Esc::
Timeout:
ToolTip
FileAppend, % (Count ? Out : "CANCEL`n"), *, UTF-8
ExitApp
