# @stellar-expert/webpack-template

> Webpack+Babel building system for StellarExpert React-based UI projects

### Installation

```shell
npm i -D github:stellar-expert/webpack-template webpack-cli webpack-dev-server
```

### Usage

#### Babel configuration

Create file `babel.config.js` in the project root.

```js
const {createBabelConfig} = require('@stellar-expert/webpack-template')

module.exports = createBabelConfig()
//or add additional plugins (only if needed)
module.exports = createBabelConfig([
    ['@babel/plugin-proposal-class-properties', {loose: true}]
])
```

#### Webpack configuration

Create file `webpack-config.js` in the project root.

```js
const path = require('path')
const {initWebpackConfig} = require('@stellar-expert/webpack-template')

module.exports = initWebpackConfig({
    entries: {
        app: {
            import: path.join(__dirname, './app.js'),
            htmlTemplate: './static-template/index.html'
        }
    },
    outputPath: './public/',
    staticFilesPath: './static/',
    scss: {
        additionalData: '@import "~@stellar-expert/ui-framework/basic-styles/variables.scss";'
    },
    define: {
        appVersion: pkgInfo.version
    },
    devServer: {
        host: '0.0.0.0',
        https: true,
        port: 9001
    }
})

```

#### Build scripts

Add the following two script entries to the project's `package.json`

```json
{
  "scripts": {
    "build": "node ./node_modules/@stellar-expert/webpack-template/node_modules/webpack/bin/webpack.js --mode=production --config ./webpack-config.js",
    "dev-server": "node ./node_modules/@stellar-expert/webpack-template/node_modules/webpack/bin/webpack.js serve --mode development --config ./webpack-config.js",
  }
}
```

### Finding duplicates (optional)

```shell
npm i -D inspectpack
```

If you have `inspectpack` package installed, duplicates will be detected
automatically.