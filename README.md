# Draco CGRU

![Screenshot](/screenshot.png)

## Installation
* Install CGRU (http://cgru.info/installation).
* Delete the folder ***/afanasy/browser*** containing the CGRU web interface.
* Copy the folder 'browser' to the same location in CGRU.

## Compilation
* Generate the general CSS file from the sources:
`sass --update afanasy/browser/css/src/main.scss afanasy/browser/css/main.min.css --style compressed`
* Generate the general JS file from the sources:
`uglifyjs afanasy/browser/js/src/*.js afanasy/browser/js/src/interface/*.js afanasy/browser/js/src/nodes/*.js -c -m -o afanasy/browser/js/scripts.min.js --source-map`

## Notes
* Windows: To integrate a window in the grid (once it is unlocked), use the CTRL key.
