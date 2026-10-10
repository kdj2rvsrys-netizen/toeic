$ErrorActionPreference = "Continue"
$env:Path = "C:\Users\h9682\AppData\Local\Programs\nodejs\node-v24.20.0-win-x64;" + $env:Path
Set-Location "C:\Users\h9682\OneDrive\桌面\toeic練習"
npm run typecheck *>&1 | Out-File _vlog.txt -Encoding utf8
"TYPECHECK_EXIT=$LASTEXITCODE" | Out-File _vlog.txt -Append -Encoding utf8
npm test *>&1 | Out-File _vlog.txt -Append -Encoding utf8
"TEST_EXIT=$LASTEXITCODE" | Out-File _vlog.txt -Append -Encoding utf8
npm run build *>&1 | Out-File _vlog.txt -Append -Encoding utf8
"BUILD_EXIT=$LASTEXITCODE" | Out-File _vlog.txt -Append -Encoding utf8
Remove-Item _final.ps1 -Force
