const path = require('path')
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')

module.exports = {
  entry: './main/index.js',
  output: {
    filename: 'bundle.js',
    path: path.join(__dirname, "./dist"),
    publicPath: './dist/',
    // 异步 chunk 文件名（React.lazy 分割出来的文件）
    chunkFilename: '[name].[contenthash:8].chunk.js',
    clean: true, // 每次构建自动清空 dist
  },
  mode: 'production',
  // Chrome 扩展属本地资源，忽略 244KB 阈値警告
  performance: {
    hints: false,
  },
  optimization: {
    splitChunks: {
      // 只对异步 chunk 分割（React.lazy import() 调用）
      // 同步 chunk 不分割，避免多个 <script> 并行加载导致纾件间题题
      chunks: 'async',
      cacheGroups: {
        // monaco 异步 chunk 单独命名，便于识别
        monaco: {
          test: /[\\/]node_modules[\\/]monaco-editor[\\/]/,
          name: 'monaco',
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
          },
        ],
      },
      {
        test: /\.less$/,
        include: path.resolve(__dirname, './main'),
        use: [{
          loader: 'style-loader'
        }, {
          loader: 'css-loader',
        }, {
          loader: 'less-loader',
          options: {
            lessOptions: {
              javascriptEnabled: true,
            },
          },
        }],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
      },
      {
        test: /\.ttf$/,
        type: 'asset/resource',
      }]
  },
  resolve: {
    extensions: [".js", ".json"],
  },
  devServer: {
    static: __dirname,
    compress: true,
    port: 9001,
    host: 'localhost',
    hot: true,
  },
  plugins: [
    new MonacoWebpackPlugin({
      languages: ["json", "javascript"],
    }),
  ]
}
