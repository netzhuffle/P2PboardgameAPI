module.exports = function karmaConfig(config) {
  config.set({
    frameworks: ['mocha', 'dirty-chai'],
    files: [
      'test/index.js',
    ],
    preprocessors: {
      'test/index.js': 'webpack',
    },

    webpack: {
      module: {
        noParse: [
          /node_modules\/sinon\//,
        ],
        preLoaders: [
          {
            test: /\.js$/,
            exclude: [
              /src/,
              /node_modules/,
            ],
            loader: 'babel',
          },
          {
            test: /\.js$/,
            include: /src/,
            exclude: /node_modules/,
            loader: 'isparta',
          }],
      },
    },
    reporters: ['progress', 'coverage'],
    coverageReporter: {
      dir: 'tools/coverage/',
    },
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['Chrome', 'Firefox'],
    singleRun: true,
    concurrency: Infinity,
  });
};
