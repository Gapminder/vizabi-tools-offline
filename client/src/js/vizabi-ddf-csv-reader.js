var Vizabi = require('vizabi');
var DDFCSVReader = require('vizabi-ddfcsv-reader').DDFCSVReader;
var readerName = 'ddf1-csv-new';
var ddfCsvReader = new DDFCSVReader(readerName).getReaderObject();

Vizabi.Reader.extend(readerName, ddfCsvReader);

require('vizabi/build/dist/vizabi.css');
