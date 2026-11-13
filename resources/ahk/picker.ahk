; FlyffBind picker.
; Usage: AutoHotkeyU64.exe picker.ahk window "<Window name>"   -> {"pid":..,"process":..,"title":..}
;        AutoHotkeyU64.exe picker.ahk point  "<Step label>"    -> {"x":..,"y":..}
; A tooltip follows the cursor; the next left click (swallowed, so nothing in the game is
; clicked) picks the window / screen point and prints JSON to stdout. Esc or 60s cancels.
#NoEnv
#SingleInstance Off
#NoTrayIcon
CoordMode, Mouse, Screen
CoordMode, ToolTip, Screen

Mode = %1%
Label = %2%
if (Mode != "point")
    Mode := "window"
if (Label = "")
    Label := (Mode = "point") ? "the spot" : "game"

SetTimer, Follow, 30
SetTimer, Cancel, -60000
return

Follow:
MouseGetPos, mx, my, hwnd
if (Mode = "point") {
    ToolTip, % "Click " Label "   (Esc to cancel)`n> X " mx "  Y " my, mx + 20, my + 20
} else {
    WinGet, proc, ProcessName, ahk_id %hwnd%
    WinGetTitle, title, ahk_id %hwnd%
    ToolTip, % "Click your " Label " window   (Esc to cancel)`n> " proc "  -  " SubStr(title, 1, 70), mx + 20, my + 20
}
return

LButton::
SetTimer, Follow, Off
MouseGetPos, mx, my, hwnd
ToolTip
if (Mode = "point") {
    FileAppend, % "{""x"":" mx ",""y"":" my "}`n", *, UTF-8
} else {
    WinGet, pid, PID, ahk_id %hwnd%
    WinGet, proc, ProcessName, ahk_id %hwnd%
    WinGetTitle, title, ahk_id %hwnd%
    FileAppend, % "{""pid"":" pid ",""process"":" Json(proc) ",""title"":" Json(title) "}`n", *, UTF-8
}
ExitApp

Esc::
Cancel:
ToolTip
FileAppend, {"cancelled":true}`n, *, UTF-8
ExitApp

Json(s) {
    s := StrReplace(s, "\", "\\")
    s := StrReplace(s, """", "\""")
    s := StrReplace(s, "`r", " ")
    s := StrReplace(s, "`n", " ")
    s := StrReplace(s, "`t", " ")
    return """" s """"
}
