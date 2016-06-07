#!/usr/bin/env node
var shell = require('shelljs');

var productName = process.argv[2];
var companyName = process.argv[3];
var versionLabel = process.argv[4];
var yearLabel = process.argv[5];

var command = 'npm i && rm -rf ./dist/linux && rm -rf "./dist/Gapminder Offline-linux-x64" && ' +
  'IS_ELECTRON_APP=true webpack && ./node_modules/.bin/electron-packager . "' + productName + '" ' +
  '--out=dist/linux ' +
  '--platform=linux ' +
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
  'cp ./updater-linux "./dist/linux/Gapminder Offline-linux-x64" && '+
  'cp ./run-linux "./dist/linux/Gapminder Offline-linux-x64" && '+
  './node_modules/.bin/build "dist/linux/' + productName + '" --platform=linux && ' +
  'rm -rf ./node_modules/* && '+
  'cd  "./dist/linux" && ' +
  'npm i --production && ' +
  'rm -rf "./Gapminder Offline-linux-x64/resources/app/node_modules" && ' +
  'cp -r ../../node_modules "./Gapminder Offline-linux-x64/resources/app/" && ' +
  'zip --symlinks -r "../../GapminderOffline-linux.zip" "./Gapminder Offline-linux-x64" && ' +
  'rm -rf ../linux && rm -rf "../GapminderOffline-linux-x64"';

shell.exec(command);
