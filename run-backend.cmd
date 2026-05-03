@echo off
setlocal

set "JAVA_HOME=%~dp0.tools\jdk17\jdk-17.0.18+8"
set "MAVEN_HOME=%~dp0.tools\maven\apache-maven-3.9.6"
set "PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%"

cd /d "%~dp0mock-server-backend"

echo Building backend...
call mvn -q -DskipTests clean install
if errorlevel 1 (
  echo Backend build failed.
  exit /b 1
)

echo Starting backend on http://localhost:8080 ...
call mvn spring-boot:run

endlocal
