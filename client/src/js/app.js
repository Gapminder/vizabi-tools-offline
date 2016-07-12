require('./static-assets');
require('../styles/main.styl');

var angular = require('angular');
var ngRoute = require('angular-route');
var ngTouch = require('angular-touch');

require('vizabi/build/dist/vizabi.css');
var app = angular.module('gapminderTools', [ngRoute, ngTouch], ['$provide', function($provide) {
}]);

require('./app.config')(app);
require('./controller')(app);
