# Gapminder Tools Offline App
> This is the gapminder tools offline app

### How to build the Chrome app

  * Just run `npm run build`

### How to run packed (builded) Chrome app:

  * Open chrome://extensions/ page
  * drag and drop the CRX (chrome-app.crx) file onto the Extensions page to install it.

### How to run unpacked Chrome app:
  * make build of the app
  * open `chrome://extensions/ page`
  * ensure that the `Developer mode` checkbox in the top right-hand corner is checked
  * click `Load unpacked extension…` to pop up a file-selection dialog.
  * Navigate to the directory in which your the unzipped files live, and select it(edited)

### How to run the Electron app for development

  * `npm run electron-dev`

### How to build the Electron app

  * install `electron-packager`
  * `npm run build`
  * `electron-packager PATH_TO_SRC tools-vizabi --platform=all  --arch=x64 --version=0.34.1`


