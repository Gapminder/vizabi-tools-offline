require('./static-assets');
require('../styles/main.scss');
require('../styles/ngDialog.css');
require('../styles/ngDialog-theme-default.css');

var angular = require('angular');
var ngRoute = require('angular-route');
var ngTouch = require('angular-touch');
var ngDialog = require('ng-dialog');
// Vizabi stuff

require('./vizabi-ws-reader');
var app = angular.module('gapminderTools', [ngRoute, ngTouch, ngDialog], ['$provide', function($provide) {
  //@see: https://github.com/angular/angular.js/issues/11932

  $provide.decorator('$window', function($delegate) {
    $delegate.history = null;
    return $delegate;
  });
}]);

require('./app.config')(app);
require('./controller')(app);
require('./services')(app);
require('./combineDataService')(app);
require('./readerService')(app);
require('./bookmarksService')(app);
