var d3 = require('d3');
var Vizabi = require('vizabi');

module.exports = function (app) {
  app
    .factory("vizabiFactory", [
      function () {
        return {
          /**
           * Render Vizabi
           * @param {String} tool name of the tool
           * @param {DOMElement} placeholder
           * @return {Object}
           */
          render: function (tool, placeholder, options) {
            return Vizabi(tool, placeholder, options);
          }
        };
      }]);
};

