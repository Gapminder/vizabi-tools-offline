#!/usr/bin/env node
var shell = require('shelljs');

var productName = process.argv[2];
var companyName = process.argv[3];
var versionLabel = process.argv[4];
var yearLabel = process.argv[5];

var command = 'npm i && rm -rf ./dist/darwin && rm -rf "./dist/Gapminder Offline-darwin-x64" && ' +
  'IS_ELECTRON_APP=true webpack && ./node_modules/.bin/electron-packager . "' + productName + '" ' +
  '--out=dist/darwin ' +
  '--platform=darwin ' +
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
  'cp ./updater-darwin "./dist/darwin/Gapminder Offline-darwin-x64" && ' +
  'cp ./run-darwin "./dist/darwin/Gapminder Offline-darwin-x64" && ' +
  './node_modules/.bin/build "dist/darwin/' + productName + '" --platform=darwin &&' +
  'rm -rf ./node_modules/* && '+
  'cd  "./dist/darwin" && ' +
  'npm i --production && ' +
  'rm -rf "./Gapminder Offline-darwin-x64/Gapminder Offline.app/Contents/Resources/app/node_modules" && ' +
  'cp -r ../../node_modules "./Gapminder Offline-darwin-x64/Gapminder Offline.app/Contents/Resources/app/" && ' +
  'zip --symlinks -r "../../GapminderOffline-darwin.zip" "./Gapminder Offline-darwin-x64" && ' +
  'rm -rf ../darwin && rm -rf "../GapminderOffline-darwin-x64"';

shell.exec(command);
