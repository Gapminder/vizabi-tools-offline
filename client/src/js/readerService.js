module.exports = function (app) {
  app
    .factory('readerService', ['$http', 'config', function ($http, config) {
      //todo: use http
      return {
        //relative path
        getFile: function (fileData, cb) {
          if (config.isChromeApp) {
            getChromeAppFile(fileData, cb);
          }

          if (config.isElectronApp) {
            getElectronAppFile(fileData, cb);
          }

          function getChromeAppFile(fileData, cb) {
            //todo: use $http
            var xhr = new XMLHttpRequest();
            xhr.responseType = fileData.type;
            xhr.open('GET', fileData.path, true);
            xhr.onreadystatechange = function () {
              if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
                cb(null, xhr.response);
              } else if (xhr.readyState == XMLHttpRequest.DONE) {
                console.log('can\'t load file');
                cb(true);
              }
            };
            xhr.send();
          }

          function getElectronAppFile(fileData, cb) {
            var fs = require('fs');
            fs.readFile(fileData.path, 'utf8', cb);
          }
        },
        getDataFilePath: function() {
          //@todo: get data file path based on config.platform(electron or chrome)
        },
        parseCsvFile: function(path, cb) {
          var self = this;
          this.getFile({path: path, type: 'text'}, function(err, fileContent) {
            if (err) {
              console.log('parse csv file error');
              return cb(err);
            }
            return self.parseCsvData(fileContent, cb)
          });
          //todo: use this.readFile
        },
        parseCsvData: function(csvString, cb) {
          var result = CSVToArray(csvString);
          return cb(false, result);

          function CSVToArray( csv ){
            var lines=csv.split("\n");
            var result = [];
            var headers=lines[0].split(",");

            for(var i=1;i<lines.length;i++){
              var obj = {};
              var currentline=lines[i].split(",");
              for(var j=0;j<headers.length;j++){
                obj[headers[j]] = currentline[j];
              }
              result.push(obj);
            }

            //return result; //JavaScript object
            return JSON.stringify(result); //JSON
          }
        }
      };

    }]);
};
