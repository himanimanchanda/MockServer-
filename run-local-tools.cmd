@echo off
setlocal

set "JAVA_HOME=%~dp0.tools\jdk17\jdk-17.0.18+8"
set "MAVEN_HOME=%~dp0.tools\maven\apache-maven-3.9.6"
set "NODE_HOME=%~dp0.tools\node\node-v20.11.1-win-x64"

set "PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%NODE_HOME%;%PATH%"

echo === Java ===
java -version
echo.
echo === Maven ===
mvn -v
echo.
echo === Node ===
node -v
echo.
echo === npm ===
npm -v
echo.

endlocal
