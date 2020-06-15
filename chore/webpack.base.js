module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
            plugins: [
                "@babel/plugin-transform-runtime",
                ["@babel/plugin-proposal-class-properties", { "loose": false }],
            ]
        }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
};
