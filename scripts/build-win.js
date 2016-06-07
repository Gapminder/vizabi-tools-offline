#!/usr/bin/env node
var shell = require('shelljs');

var productName = process.argv[2];
var companyName = process.argv[3];
var versionLabel = process.argv[4];
var yearLabel = process.argv[5];

var command = 'npm i && rm -rf ./dist/win32 && rm -rf "./dist/Gapminder Offline-win32-x64" && ' +
  'IS_ELECTRON_APP=true webpack && ./node_modules/.bin/electron-packager . "' + productName + '" ' +
  '--out=dist/win32 ' +
  '--platform=win32 ' +
  '--arch=x64 ' +
  '--version=0.37.5 ' +
  '--icon=build/icon.ico ' +
  '--ignore="(.zip|node_modules/.bin|node_modules/electron-builder|pack.json|README.md)" ' +
  'app-version="' + versionLabel + '" ' +
  '--version-string.CompanyName="' + companyName + '" ' +
  '--version-string.ProductName="' + productName + '" ' +
  '--version-string.FileVersion="' + versionLabel + '" ' +
  '--version-string.ProductVersion="' + versionLabel + '" ' +
  '--version-string.LegalCopyright="© ' + companyName + ', ' + yearLabel + '" && ' +
  'cp ./updater-win32.exe "./dist/win32/Gapminder Offline-win32-x64" && '+
  'cp ./run-win32.bat "./dist/win32/Gapminder Offline-win32-x64" && '+
  './node_modules/.bin/build "dist/win32/' + productName + '" --platform=win32 &&' +
  'rm -rf ./node_modules/* && '+
  'cd "./dist/win32" && '+
  'npm i --production && ' +
  'rm -rf "./Gapminder Offline-win32-x64/resources/app/node_modules" && ' +
  'cp -r ../../node_modules "./Gapminder Offline-win32-x64/resources/app/" && ' +
  'zip --symlinks -r "../../GapminderOffline-win32.zip" "./Gapminder Offline-win32-x64" && ' +
  'rm -rf ../win32 && rm -rf "../GapminderOffline-win32-x64"';

shell.exec(command);
