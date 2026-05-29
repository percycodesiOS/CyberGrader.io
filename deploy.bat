@echo off
setlocal EnableDelayedExpansion
cd /d "C:\Users\Administrator\OneDrive\Documents\cyberGraderX"
set "LOG=%~dp0deploy.log"
> "%LOG%" echo === Deploy started %DATE% %TIME% ===

echo --- where gh --- >> "%LOG%"
where gh >> "%LOG%" 2>&1
if errorlevel 1 (
  echo STATUS=GH_NOT_FOUND >> "%LOG%"
  goto :END
)

echo --- gh auth status --- >> "%LOG%"
gh auth status >> "%LOG%" 2>&1
if errorlevel 1 (
  echo STATUS=GH_NOT_AUTHED >> "%LOG%"
  goto :END
)

echo --- git init --- >> "%LOG%"
git init -b main >> "%LOG%" 2>&1
git config user.email "kmacek715@gmail.com" >> "%LOG%" 2>&1
git config user.name "Kenny Macek" >> "%LOG%" 2>&1
echo deploy.log>.gitignore
echo deploy.bat>>.gitignore
git add . >> "%LOG%" 2>&1
git commit -m "Initial commit: PercyCodes / CyberGraderX design system" >> "%LOG%" 2>&1

echo --- gh repo create + push --- >> "%LOG%"
gh repo create cyberGraderX --public --source=. --push >> "%LOG%" 2>&1
if errorlevel 1 (
  echo STATUS=REPO_CREATE_FAILED >> "%LOG%"
  goto :END
)

echo --- gh api enable pages --- >> "%LOG%"
gh api -X POST repos/percycodesiOS/cyberGraderX/pages -f "source[branch]=main" -f "source[path]=/" >> "%LOG%" 2>&1
if errorlevel 1 (
  echo PAGES_ENABLE_RC=%ERRORLEVEL% >> "%LOG%"
)

echo --- pages info --- >> "%LOG%"
gh api repos/percycodesiOS/cyberGraderX/pages >> "%LOG%" 2>&1

echo STATUS=DONE >> "%LOG%"

:END
echo === Finished %DATE% %TIME% === >> "%LOG%"
endlocal
