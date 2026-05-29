@echo off
:: Configura la codificación a UTF-8 para ver los caracteres correctamente
chcp 65001 > nul
title Servidor de Impresión Cloud - Zebra ZD230
echo =======================================================
echo    Iniciando Servidor de Impresión Cloud (Firebase)
echo =======================================================
echo.
cd /d "%~dp0"
node servidor-impresion-nube.js
echo.
echo =======================================================
echo El servidor se ha detenido o ha ocurrido un error.
echo Presiona cualquier tecla para salir.
echo =======================================================
pause > nul
