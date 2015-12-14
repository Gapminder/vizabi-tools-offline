module.exports = function (app) {
  app
    .factory('BookmarksService', ['config', 'readerService', function (config) {
      function Bookmarks(reader) {
        this.bookmarks = null;
        this.reader = reader;
        this.name = 'bookmarks.json';
      }

      Bookmarks.prototype.getAll = function(cb) {
        if (this.bookmarks) {
          return cb(null, this.bookmarks);
        }
        console.log('get all');
        this.reader.getChromeFsFile(this.name, true, function(err, bookmarks) {
          if (err) {
            return cb(err);
          }
          //todo: parse json?
          if (bookmarks !== '') {
            this.bookmarks = JSON.parse(bookmarks);
          } else {
            this.bookmarks = {};
          }
          cb(err, this.bookmarks);
        });
      };

      Bookmarks.prototype.add = function(bookmark) {
        if (!this.bookmarks) {
          this.bookmarks = {};
        }
        this.bookmarks[bookmark.name] = bookmark;
        this.reader.writeChromeFsFile(this.name, JSON.stringify(this.bookmarks), function(err) {
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
