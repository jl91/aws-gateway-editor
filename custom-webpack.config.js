const webpack = require('webpack');

module.exports = {
  resolve: {
    fallback: {
      "fs": false,
      "path": require.resolve("path-browserify"),
      "util": require.resolve("util/"),
      "buffer": require.resolve("buffer/"),
      "process": require.resolve("process/browser"),
      "stream": false,
      "crypto": false,
      "http": false,
      "https": false,
      "zlib": false,
      "url": false,
      "os": false
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({})
    })
  ]
};