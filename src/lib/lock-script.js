// 内嵌双平台（Windows / macOS）防卸载上锁工具生成器（纯本地生成，零外部依赖）

const STORE_EXT_ID = 'jlojhodaahihefilcenmaiopkkjkekmb';
const UPDATE_URL = 'https://clients2.google.com/service/update2/crx';
const VERSION = '0.6.4';

/** 自动识别当前操作系统：'mac' | 'win' */
export function detectLockOs() {
  if (typeof navigator === 'undefined') return 'win';
  const ua = `${navigator.userAgent || ''} ${navigator.platform || ''}`.toLowerCase();
  if (ua.includes('mac')) return 'mac';
  return 'win';
}

/** 生成 Windows 单文件防卸载上锁脚本 (.bat)，同时覆盖 Chrome / Edge / Brave */
export function buildLockBat() {
  const lines = [
    '@echo off',
    'chcp 65001 >nul',
    'title JAV Speed Bump - Policy Lock',
    'net session >nul 2>&1',
    'if %errorlevel% neq 0 (',
    '  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath \'%~f0\' -Verb RunAs"',
    '  exit /b',
    ')',
    '',
    `set "EXT_ID=${STORE_EXT_ID}"`,
    `set "UPDATE_URL=${UPDATE_URL}"`,
    'set "INSTALL_DIR=%ProgramFiles%\\jav-speed-bump"',
    'set "UNINSTALL_CMD=%INSTALL_DIR%\\uninstall.cmd"',
    'set "CHROME_LIST=HKLM\\SOFTWARE\\Policies\\Google\\Chrome\\ExtensionInstallForcelist"',
    'set "EDGE_LIST=HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge\\ExtensionInstallForcelist"',
    'set "BRAVE_LIST=HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave\\ExtensionInstallForcelist"',
    'set "UNINSTALL_KEY=HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\jav-speed-bump"',
    '',
    'if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"',
    '',
    'call :lock_browser "%CHROME_LIST%"',
    'call :lock_browser "%EDGE_LIST%"',
    'call :lock_browser "%BRAVE_LIST%"',
    '',
    '(',
    '  echo @echo off',
    '  echo for %%%%k in ^("%CHROME_LIST%" "%EDGE_LIST%" "%BRAVE_LIST%"^) do ^(',
    '  echo   for /L %%%%i in ^(1,1,99^) do ^(',
    '  echo     reg query %%%%k /v "%%%%i" 2^>nul ^| findstr /I "%EXT_ID%" ^>nul 2^>^&1 ^&^& reg delete %%%%k /v "%%%%i" /f ^>nul 2^>^&1',
    '  echo   ^)',
    '  echo ^)',
    '  echo reg delete "%UNINSTALL_KEY%" /f ^>nul 2^>^&1',
    '  echo start "" /b cmd /c "ping 127.0.0.1 -n 2 >nul & rmdir /s /q "%INSTALL_DIR%""',
    ') > "%UNINSTALL_CMD%"',
    '',
    'reg add "%UNINSTALL_KEY%" /v "DisplayName" /t REG_SZ /d "JAV Speed Bump Policy Lock" /f >nul',
    `reg add "%UNINSTALL_KEY%" /v "DisplayVersion" /t REG_SZ /d "${VERSION}" /f >nul`,
    'reg add "%UNINSTALL_KEY%" /v "Publisher" /t REG_SZ /d "JAV Speed Bump" /f >nul',
    'reg add "%UNINSTALL_KEY%" /v "InstallLocation" /t REG_SZ /d "%INSTALL_DIR%" /f >nul',
    'reg add "%UNINSTALL_KEY%" /v "UninstallString" /t REG_SZ /d "powershell.exe -NoProfile -WindowStyle Hidden -Command \\"Start-Process cmd.exe -ArgumentList \'/c \\"\\"%UNINSTALL_CMD%\\"\\"\' -Verb RunAs\\"" /f >nul',
    'reg add "%UNINSTALL_KEY%" /v "NoModify" /t REG_DWORD /d 1 /f >nul',
    'reg add "%UNINSTALL_KEY%" /v "NoRepair" /t REG_DWORD /d 1 /f >nul',
    '',
    'echo.',
    'echo ========================================================',
    'echo   [OK] 防卸载策略已写入（Chrome / Edge / Brave）！请完全关闭并重启浏览器生效。',
    'echo   [OK] Policy lock applied (Chrome / Edge / Brave)! Please restart your browser.',
    'echo ========================================================',
    'echo.',
    'timeout /t 4',
    'exit /b 0',
    '',
    ':lock_browser',
    'set "TARGET_LIST=%~1"',
    'set "SLOT="',
    'for /L %%i in (1,1,99) do (',
    '  reg query "%TARGET_LIST%" /v "%%i" 2>nul | findstr /I "%EXT_ID%" >nul 2>&1',
    '  if not errorlevel 1 (',
    '    set "SLOT=%%i"',
    '    goto :write_slot',
    '  )',
    ')',
    'for /L %%i in (1,1,99) do (',
    '  reg query "%TARGET_LIST%" /v "%%i" >nul 2>&1',
    '  if errorlevel 1 (',
    '    set "SLOT=%%i"',
    '    goto :write_slot',
    '  )',
    ')',
    'set "SLOT=1"',
    ':write_slot',
    'reg add "%TARGET_LIST%" /v "%SLOT%" /t REG_SZ /d "%EXT_ID%;%UPDATE_URL%" /f >nul',
    'exit /b 0',
  ];
  return lines.join('\r\n') + '\r\n';
}

/** 生成 macOS 系统配置描述文件 (.mobileconfig)，同时覆盖 Chrome / Edge / Brave */
export function buildLockMobileConfig() {
  const forceEntry = `${STORE_EXT_ID};${UPDATE_URL}`;
  const domains = [
    ['com.google.Chrome', 'Google Chrome', 'B2C3D4E5-1111-4000-8000-000000000001'],
    ['com.microsoft.edgemac', 'Microsoft Edge', 'B2C3D4E5-2222-4000-8000-000000000002'],
    ['com.brave.Browser', 'Brave Browser', 'B2C3D4E5-3333-4000-8000-000000000003'],
  ];

  const payloadItems = domains.map(([domain, label, uuid]) => `    <dict>
      <key>PayloadType</key>
      <string>com.apple.ManagedClient.preferences</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>PayloadIdentifier</key>
      <string>io.github.javspeedbump.lock.${domain}</string>
      <key>PayloadUUID</key>
      <string>${uuid}</string>
      <key>PayloadEnabled</key>
      <true/>
      <key>PayloadDisplayName</key>
      <string>JAV Speed Bump Lock (${label})</string>
      <key>PayloadContent</key>
      <dict>
        <key>${domain}</key>
        <dict>
          <key>Forced</key>
          <array>
            <dict>
              <key>mcx_preference_settings</key>
              <dict>
                <key>ExtensionInstallForcelist</key>
                <array>
                  <string>${forceEntry}</string>
                </array>
              </dict>
            </dict>
          </array>
        </dict>
      </dict>
    </dict>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadIdentifier</key>
  <string>io.github.javspeedbump.lock</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadScope</key>
  <string>System</string>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>A1B2C3D4-0000-4000-8000-000000000000</string>
  <key>PayloadOrganization</key>
  <string>JAV Speed Bump</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadDisplayName</key>
  <string>JAV Speed Bump Policy Lock</string>
  <key>PayloadDescription</key>
  <string>Locks JAV Speed Bump extension in Chrome / Edge / Brave to prevent impulsive removal. Can be removed anytime in macOS System Settings &gt; General &gt; Device Management.</string>
  <key>PayloadContent</key>
  <array>
${payloadItems}
  </array>
</dict>
</plist>
`;
}
