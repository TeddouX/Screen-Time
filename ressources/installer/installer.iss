; Script generated by the Inno Setup Script Wizard.
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

#define MyAppName "Screen Time"
#define MyAppVersion "1.0"
#define MyAppPublisher "TeddouX"
#define MyAppURL "https://github.com/TeddouX/Screen-Time"
#define MyAppExeName "Screen Time.exe"
#define MyAppIconPath "C:\Users\Victor\Desktop\Programming\Screen Time\ressources\icon.ico"
#define MyAppOutputDir "C:\Users\Victor\Desktop\Programming\Screen Time\out"
#define MyAppSourceDir "C:\Users\Victor\Desktop\Programming\Screen Time\out\Screen Time-win32-x64"

[Setup]
; NOTE: The value of AppId uniquely identifies this application. Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{28024331-0CA7-4784-97B6-60AF87E3718B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
;AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; Remove the following line to run in administrative install mode (install for all users.)
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir={#MyAppOutputDir}
OutputBaseFilename="Screen Time Installer"
SetupIconFile={#MyAppIconPath}
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Setup]
MissingRunOnceIdsWarning = no

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#MyAppSourceDir}\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#MyAppSourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
; Create desktop icon
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
; Make the exe run on startup
Name: "{autostartup}\Screen Time.exe"; Filename: "{app}\python\Screen Time.exe"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
Filename: "{app}\python\Screen Time.exe"; Flags: nowait

[UninstallRun]
; Kill the python script else the uninstaller won't be able to delete the python exe
Filename: "{cmd}"; Parameters: "/C ""taskkill /im {#MyAppExeName} /f /t" 
