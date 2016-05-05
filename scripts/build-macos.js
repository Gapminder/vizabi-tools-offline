#!/usr/bin/env node
var shell = require('shelljs');

var productName = process.argv[2];
var companyName = process.argv[3];
var versionLabel = process.argv[4];
var yearLabel = process.argv[5];

var command = 'rm -rf ./dist/osx && rm -rf ./dist/GapminderOffline-darwin-x64 && ' +
  'IS_ELECTRON_APP=true webpack && ./node_modules/.bin/electron-packager . "' + productName + '" ' +
  '--out=dist/osx ' +
  '--platform=darwin ' +
  '--arch=x64 ' +
  '--version=0.37.5 ' +
  '--icon=build/icon.icns ' +
  '--ignore="(.zip|node_modules/.bin|node_modules/electron-builder|pack.json|README.md)" ' +
  'app-version=' + versionLabel + ' ' +
  '--asar  ' +
  '--version-string.CompanyName="' + companyName + '" ' +
  '--version-string.ProductName="' + productName + '" ' +
  '--version-string.FileVersion="' + versionLabel + '" ' +
  '--version-string.ProductVersion="' + versionLabel + '" ' +
  '--version-string.LegalCopyright="© ' + companyName + ', ' + yearLabel + '" && ' +
  './node_modules/.bin/build "dist/osx/' + productName + '/' + productName + '.app" --platform=osx &&' +
  'cd  "./dist/osx" && zip --symlinks -r "../../Vizabi Offline-darwin-x64.zip" "./Vizabi Offline-darwin-x64" && ' +
  'rm -rf ../osx && rm -rf ../GapminderOffline-darwin-x64';

shell.exec(command);
