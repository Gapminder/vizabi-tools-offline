'use strict';
/*eslint no-process-env:0*/
//@todo: app separate config object for ElectronApp
var path = require('path');
var Clean = require('clean-webpack-plugin');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var CompressionPlugin = require('compression-webpack-plugin');

var bourbon = require('node-bourbon').includePaths;
var _ = require('lodash');

var isProduction = process.env.NODE_ENV === 'production';
var isElectronApp = !!process.env.IS_ELECTRON_APP;

var config = {
  template: 'index.html',
  index: 'index.html',
  src: './client/src',
  dest: './client/dist/tools',
  publicPath: isElectronApp ? path.join(__dirname, '/client/dist/tools/') : '/tools/'
};

var chromeAppPaths = _.clone(config);
chromeAppPaths.dest = './chrome-app/tools';

var absSrc = path.join(__dirname, config.src);
var absDest = path.join(__dirname, config.dest);

var baseConfig = {
  debug: true,
  profile: true,
  cache: true,
  devtool: 'sourcemaps',
  context: path.join(__dirname, config.src),
  entry: {
    'vizabi-tools': './js/app.js',
    angular: ['angular', 'angular-route', 'angular-touch', 'd3'],
    ga: './js/ga/ga.js'
  },
  output: {
    path: absDest,
    isElectronApp: isElectronApp,
    publicPath: isElectronApp ? './' : config.publicPath,
    filename: 'components/[name]-[hash:6].js',
    chunkFilename: 'components/[name]-[hash:6].js'
  },
  resolve: {
    root: [absSrc],
    modulesDirectories: ['./components', 'node_modules'],
    extensions: ['', '.js', '.png', '.gif', '.jpg', '.json']
  },
  module: {
    //noParse: new RegExp(require.resolve("vizabi"), 'ig'),
    loaders: [
      {
        test: /vizabi\.js/,
        loader: 'imports?this=>window,d3'
      },
      {test: /\.styl$/, loader: ExtractTextPlugin.extract('style-loader', 'css-loader!stylus-loader')},
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader?sourceMap&root=' + absSrc)
        //loader: 'style!css'//?root=' + absSrc
      },
      {
        test: /.*\.(gif|png|jpe?g)$/i,
        loaders: [
          'file?hash=sha512&digest=hex&name=[path][name].[ext]',
          'image-webpack?{progressive:true, optimizationLevel: 7, interlaced: false, pngquant:{quality: "65-90", speed: 4}}'
        ]
      },
      {
        test: /\.html$/,
        loader: 'html?name=[path][name].[ext]&root=' + absSrc
      },
      {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?name=[path][name].[ext]&limit=10000&mimetype=application/font-woff'
      },
      {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?name=[path][name].[ext]&limit=10000&mimetype=application/font-woff'
      },
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?name=[path][name].[ext]&limit=10000&mimetype=application/octet-stream'
      },
      {test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file?name=[path][name].[ext]'},
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?name=[path][name].[ext]&limit=10000&mimetype=image/svg+xml'
      },
      { test: /\.json$/,
        loader: "file?name=[path][name].[ext]?[hash]"
      }
    ]
  },
  stats: {colors: true, progress: true, children: true},
  target: isElectronApp ? 'atom' : 'web',
  externals: [(function () {
    var IGNORES = ['electron'];
    return function (context, request, callback) {
      if (IGNORES.indexOf(request) >= 0) {
        return callback(null, "require('" + request + "')");
      }
      return callback();
    };
  })()]
};

var wOptions = {
  devtool: isProduction ? 'sourcemaps' : 'eval',
  plugins: [
    new Clean([config.dest]),
    new webpack.DefinePlugin({
      _isDev: !isProduction,
      _isElectronApp: isElectronApp
    }),
    new ExtractTextPlugin('[name]-[hash:6].css'),
    new HtmlWebpackPlugin({
      filename: config.index,
      template: path.join(config.src, config.template),
      chunks: ['angular', 'vizabi-tools', 'ga'],
      minify: true
    }),
    new HtmlWebpackPlugin({
      filename: 'electronIndex.html',
      template: path.join(config.src, 'index.html'),
      chunks: ['angular', 'vizabi-tools', 'ga'],
      minify: true
    }),
    new HtmlWebpackPlugin({
      filename: '404.html',
      template: path.join(config.src, '404.html'),
      chunks: ['angular', 'vizabi-tools', 'ga'],
      minify: true
    }),
  ],
  pushPlugins: function () {
    if (!isProduction) {
      return;
    }

    console.log('Adding production plugins');
    this.plugins.push.apply(this.plugins, [
      // production only
      new webpack.optimize.UglifyJsPlugin(),
      new CompressionPlugin({
        asset: '{file}.gz',
        algorithm: 'gzip',
        regExp: /\.js$|\.html$|\.css$|\.map$|\.woff$|\.woff2$|\.ttf$|\.eot$|\.svg$/,
        threshold: 10240,
        minRatio: 0.8
      })
    ]);
  },
  devServer: {
    contentBase: config.dest,
    publicPath: config.publicPath,
    noInfo: true,
    hot: true,
    inline: true,
    historyApiFallback: {
      index: config.index,
      logger: console.log.bind(console),
      verbose: true,
      rewrites: [
        {
          from: /^\/$|^\/tools.*$/,
          to: function(context) {
            return '/tools/';
          }
        }
      ]
    },
    devtool: 'eval',
    proxy: {
      '*/api/*': 'http://localhost:' + (process.env.PORT || '3001')
    }
  }
};

var chromeAppOptions = {
  output: {
    path: path.join(__dirname, chromeAppPaths.dest),
    publicPath: chromeAppPaths.publicPath,
    filename: 'components/[name]-[hash:6].js',
    chunkFilename: 'components/[name]-[hash:6].js'
  },
  plugins: [
    new Clean([chromeAppPaths.dest]),
    new webpack.DefinePlugin({
      _isDev: !isProduction
    }),
    new ExtractTextPlugin('[name]-[hash:6].css'),
    new HtmlWebpackPlugin({
      filename: config.index,
      template: path.join(config.src, config.template),
      chunks: ['angular', 'vizabi-tools'],
      minify: false
    }),
    new webpack.ProvidePlugin({
      _: 'lodash'
    })
  ]
};

//if you want deep merge - use _.merge please
var wConfig = _.extend({}, baseConfig, wOptions);
var chromeAppConfig = _.extend({}, baseConfig, chromeAppOptions);

wConfig.pushPlugins();

module.exports = [wConfig, chromeAppConfig];
