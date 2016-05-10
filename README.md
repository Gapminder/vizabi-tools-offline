# Gapminder Tools Offline App
> This is the gapminder tools offline app

## User guide

User guide for this solution is [here](doc/user-guide.md)

### How to run packed (builded) Chrome app:

  * Open chrome://extensions/ page
  * drag and drop the CRX (chrome-app.crx) file onto the Extensions page to install it.

### How to run unpacked Chrome app:
  * make build of the app
  * open `chrome://extensions/ page`
  * ensure that the `Developer mode` checkbox in the top right-hand corner is checked
  * click `Load unpacked extension…` to pop up a file-selection dialog.
  * Navigate to the directory in which your the unzipped files live, and select it(edited)

### How to build the Chrome app
 * `npm run build-chrome`

### How to build the Electron app
  * `npm run build`

Zip archives with expected versions will be placed to root folder of the project.
