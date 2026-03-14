Option Explicit

Dim shell, fso, scriptDir, psScript, command, i, arg

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
psScript = fso.BuildPath(scriptDir, "start-popebot-silent.ps1")

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & psScript & """"

For i = 0 To WScript.Arguments.Count - 1
  arg = WScript.Arguments(i)
  command = command & " """ & Replace(arg, """", "\""") & """"
Next

shell.Run command, 0, False
