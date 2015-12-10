module.exports = function (app) {
  app
    .factory('bookmarksService', ['config', 'readerService', function (config) {
      function Bookmarks(reader) {
        this.bookmarks = null;
        this.reader = reader;
        this.name = 'bookmarks.json';
      }

      Bookmarks.prototype.getAll = function(cb) {
        if (this.bookmarks) {
          return cb(null, this.bookmarks);
        }

        this.reader.getChromeFsFile(this.name, true, function(err, bookmarks) {
          if (err) {
            return cb(err);
          }
          //todo: parse json?
          this.bookmarks = bookmarks;
          cb(err, this.bookmarks);
        });
      };

      Bookmarks.prototype.add = function(bookmark) {
        this.bookmarks.push(bookmark);
        this.reader.writeChromeFsFile(this.name, this.bookmarks, function(err) {
          if (err) {
            console.log('add bookmark error');
          }
        });
      };

      Bookmarks.prototype.delete = function(bookmark) {
        //todo: delete by criteria
        this.bookmarks = _.reject(this.bookmarks, {});
      };

      return Bookmarks;
    }]);
};
