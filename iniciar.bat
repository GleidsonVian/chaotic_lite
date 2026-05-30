@echo off
:: Se nao foi chamado com /K, relanca a si mesmo em janela persistente
if "%~1"=="ABERTO" goto PRINCIPAL
cmd /K ""%~f0" ABERTO"
exit

:PRINCIPAL
cd /d "%~dp0"
title Chaotic Lite

echo.
echo ============================================
echo  CHAOTIC LITE - Iniciando servidor...
echo ============================================
echo.
echo Pasta: %cd%
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Instale em: https://nodejs.org
    goto FIM
)
echo Node.js OK

ngrok version >nul 2>&1
if %errorlevel% neq 0 (
    echo ngrok: nao encontrado - apenas acesso local
    set NGROK=0
) else (
    echo ngrok OK
    set NGROK=1
)
echo.

if not exist "node_modules\express" (
    echo Instalando dependencias...
    npm install
    if %errorlevel% neq 0 (
        echo [ERRO] npm install falhou!
        goto FIM
    )
    echo Dependencias instaladas!
) else (
    echo Dependencias: OK
)
echo.

echo Iniciando servidor Node.js...
start "SERVIDOR" cmd /k "cd /d "%~dp0" && node server.js"
timeout /t 2 /nobreak >nul
echo Servidor iniciado na porta 3000!
echo Acesse: http://localhost:3000/
echo.

if %NGROK%==1 (
    echo Iniciando ngrok...
    start "NGROK" cmd /k "ngrok http 3000"
    timeout /t 4 /nobreak >nul
    echo.
    echo Buscando link publico...
    powershell -NoProfile -Command "try{$t=(Invoke-WebRequest http://localhost:4040/api/tunnels -UseBasicParsing|ConvertFrom-Json).tunnels;$u=($t|?{$_.proto-eq'https'}).public_url;if($u){Write-Host '';Write-Host '>>> Link para o amigo: '$u;Write-Host ''}else{Write-Host 'Veja a janela do ngrok para o link.'}}catch{Write-Host 'Veja a janela do ngrok para o link.'}"
)

:FIM
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
