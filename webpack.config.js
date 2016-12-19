const path = require('path');

module.exports = {
  entry: './src/bgapi.js',
  output: {
    libraryTarget: 'umd',
    path: `${__dirname}/build`,
    filename: 'bgapi.bundle.js',
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: path.join(__dirname, 'node_modules'),
        loader: 'babel-loader',
      },
      {
        test: /\.json$/,
        loader: 'json',
      },
    ],
  },
  devtool: 'source-map',
};
