#!/usr/bin/env node
var shell = require('shelljs');

var productName = process.argv[2];
var companyName = process.argv[3];
var versionLabel = process.argv[4];
var yearLabel = process.argv[5];

var command = 'rm -rf ./dist/linux && rm -rf ./dist/GapminderOffline-linux-x64 && ' +
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
  './node_modules/.bin/build "dist/linux/' + productName + '" --platform=linux &&' +
  'cd  "./dist/linux" && zip --symlinks -r "../../Vizabi Offline-linux-x64.zip" "./Vizabi Offline-linux-x64" && ' +
  'rm -rf ../linux && rm -rf ../GapminderOffline-linux-x64';

shell.exec(command);
