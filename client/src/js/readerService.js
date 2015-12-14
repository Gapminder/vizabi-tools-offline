//todo: separate this service into two diff readers (for chrome fs and user fs)

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
        },
        //read file from chrome file system
        getChromeFsFile: function(name, isCreate, cb) {
          console.log('getChromeFsFile');
          console.log(config);
          config.fileSystem.root.getFile(name, {create: isCreate}, function (fileEntry) {
            fileEntry.file(function (file) {
              var reader = new FileReader();
              reader.onloadend = function (e) {
                cb(null, this.result);
              };
              reader.readAsText(file);
            }, cb);
          }, cb);
        },
        writeChromeFsFile: function(name, content, cb) {
          config.fileSystem.root.getFile(name, {create: true}, function (fileEntry) {
            // Create a FileWriter object for our FileEntry
            fileEntry.createWriter(function (fileWriter) {
              var truncated = false;
              fileWriter.onwriteend = function (e) {
                if (!truncated) {
                  truncated = true;
                  this.truncate(this.position); //truncate old data in file in order to overwrite all data
                  return cb(false);
                }
                console.log('Write completed.');
              };
              fileWriter.onerror = function (e) {
                cb(e);
              };

              // Create a new Blob and write it
              var bb = new Blob([content], {type: 'application/json'});
              fileWriter.write(bb);
            }, cb);
          }, cb);
        }
      };

    }]);
};
