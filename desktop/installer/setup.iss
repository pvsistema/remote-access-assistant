; Inno Setup script for "ПВ-Система Доступ" (PVSDOST-Setup.exe)
; Built by desktop\csharp\build.bat installer
; Params passed from the .bat:
;   /DAppVersion=x.y.z  /DSourceDir=<dist>  /DOutputDir=<out>

#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif
#ifndef SourceDir
  #define SourceDir "..\csharp\dist"
#endif
#ifndef OutputDir
  #define OutputDir "..\csharp\installer-out"
#endif

#define AppName "ПВ-Система Доступ"
#define AppExe "PVSDOST.exe"
#define AppPublisher "ПВ-Система"

[Setup]
AppId={{B7E4B2A1-8C3D-4F1E-9A2B-PVSDOST00001}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName=C:\PVSDOST
DisableDirPage=yes
DisableProgramGroupPage=yes
DefaultGroupName={#AppName}
UninstallDisplayName={#AppName}
UninstallDisplayIcon={app}\{#AppExe}
OutputDir={#OutputDir}
OutputBaseFilename=PVSDOST-Setup-{#AppVersion}
Compression=lzma2/max
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible
PrivilegesRequired=admin
WizardStyle=modern
SetupIconFile={#SourceDir}\pvsdost.ico

[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"

[Tasks]
Name: "desktopicon"; Description: "Создать ярлык на рабочем столе"; GroupDescription: "Дополнительно:"
Name: "autostart"; Description: "Запускать вместе с Windows (доступ к ПК по постоянному паролю)"; GroupDescription: "Дополнительно:"

[Files]
Source: "{#SourceDir}\{#AppExe}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\pvsdost.ico"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "{#SourceDir}\app_version.txt"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "{#SourceDir}\web\*"; DestDir: "{app}\web"; Flags: ignoreversion recursesubdirs createallsubdirs
; WebView2 bootstrapper (installed only if the runtime is missing)
Source: "MicrosoftEdgeWebview2Setup.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall skipifsourcedoesntexist

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"; IconFilename: "{app}\pvsdost.ico"
Name: "{group}\Удалить {#AppName}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; IconFilename: "{app}\pvsdost.ico"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "PVSDOST"; ValueData: """{app}\{#AppExe}"" --autostart"; Flags: uninsdeletevalue; Tasks: autostart

[Run]
Filename: "{tmp}\MicrosoftEdgeWebview2Setup.exe"; Parameters: "/silent /install"; StatusMsg: "Установка компонента WebView2..."; Check: NeedsWebView2; Flags: waituntilterminated skipifdoesntexist
Filename: "{app}\{#AppExe}"; Description: "Запустить {#AppName}"; Flags: nowait postinstall skipifsilent

[Code]
// Detect installed WebView2 Runtime via its registry key (per-machine or per-user).
function WebView2Installed: Boolean;
var
  pv: string;
begin
  Result :=
    RegQueryStringValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', pv) or
    RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', pv) or
    RegQueryStringValue(HKCU, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', pv);
  if Result and (pv = '') then
    Result := False;
end;

function NeedsWebView2: Boolean;
begin
  Result := not WebView2Installed;
end;
