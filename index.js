const path = require('path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const createBabelConfig = require('./babel.config')

const defaultProjectRoot = process.cwd()

class WebpackConfigBuilder {
    /**
     * @param {WebpackBuilderParams} params
     * @constructor
     */
    constructor(params) {
        this.params = { //apply default params
            scss: {},
            define: {},
            projectRoot: defaultProjectRoot,
            publicPath: '/',
            hashFileNames: true,
            gatherBundleStats: true,
            ...params
        }
        if (!path.isAbsolute(this.params.outputPath)) {
            this.params.outputPath = path.resolve(this.params.projectRoot, this.params.outputPath)
        }
        Object.freeze(this.params)
    }

    /**
     * @type {WebpackBuilderParams}
     */
    params

    /**
     * @type {{}[]}
     * @private
     */
    plugins

    /**
     * @type {'development'|'production'}
     */
    mode

    get isProduction() {
        return this.mode !== 'development'
    }

    build(env, argv) {
        const mode = this.mode = argv.mode || 'development'
        process.env.NODE_ENV = mode
        console.log('Building webpack project ' + this.params.projectRoot)
        console.log('mode=' + mode)

        //plugins
        this.initPlugins()
        this.prepareLoaderOptionsPlugin()
        this.prepareDefinePlugin()
        this.prepareHtmlPlugin()
        this.prepareCssExtractPlugin()
        this.prepareBundleAnalyzerPlugin()

        const res = {
            mode,
            entry: this.prepareEntries(),
            output: this.prepareOutput(),
            module: {
                rules: this.prepareModuleRules()
            },
            plugins: this.plugins,
            resolve: this.prepareResolveSection(),
            resolveLoader: {
                modules: ['node_modules', path.resolve(__dirname, 'node_modules')]
            },
            optimization: {
                moduleIds: 'deterministic',
                minimizer: this.prepareMinimizerSection()
            },
            devtool: this.prepareSourceMapSection(),
            devServer: this.prepareDevServerSection()
        }
        return res
    }

    /**
     * @private
     */
    prepareModuleRules() {
        const {scss = {}} = this.params
        const rules = [
            {
                test: /\.js?$/,
                loader: 'babel-loader'
            }
        ]
        if (!scss.disabled) {
            const MiniCssExtractPlugin = require('mini-css-extract-plugin')
            rules.push({
                test: /\.scss$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                            url: false,
                            sourceMap: !this.isProduction
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: !this.isProduction,
                            additionalData: scss.additionalData || undefined
                        }
                    }
                ]
            })
        }
        return rules
    }

    /**
     * @private
     */
    prepareMinimizerSection() {
        if (!this.isProduction) return
        const TerserPlugin = require('terser-webpack-plugin')
        const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

        return [
            new TerserPlugin({
                terserOptions: {
                    //warnings: true,
                    toplevel: true
                }
            }),
            new CssMinimizerPlugin()
        ]
    }

    /**
     * @private
     */
    prepareEntries() {
        const {entries} = this.params
        if (entries instanceof Array) return entries
        const res = {}
        Object.entries(entries).map(([key, value]) => {
            const {hashFileName, htmlTemplate, ...entry} = value
            res[key] = entry
        })
        return res
    }

    /**
     * @private
     */
    prepareOutput() {
        const {outputPath, publicPath, entries, hashFileNames} = this.params
        const plainEntries = entries instanceof Array ?
            [] :
            Object.entries(entries)
                .filter(([_, entry]) => entry.hashFileName === false)
                .map(([key]) => key) //store separately entries with non-hashed output filename
        const res = {
            path: path.join(outputPath, publicPath),
            filename: pathData => {
                if (!hashFileNames || plainEntries.includes(pathData.chunk.name))
                    return '[name].js'
                return `${pathData.runtime}.${pathData.hash}.js`
            },
            chunkFilename: ({chunk}) => {
                const name = chunk.name || chunk.id
                if (!hashFileNames)
                    return name + '.js'
                return `${name}.${chunk.hash}.js`
            },
            publicPath,
            clean: true
        }
        return res
    }

    /**
     * @private
     */
    prepareSourceMapSection() {
        if (this.params.sourcemap || !this.isProduction)
            return 'source-map'
    }

    /**
     * @private
     */
    prepareDevServerSection() {
        if (this.isProduction) return
        return Object.assign({
            host: '0.0.0.0',
            port: 8080,
            https: true,
            static: {
                directory: this.params.outputPath
            },
            historyApiFallback: {
                disableDotRule: true
            }
        }, this.params.devServer)
    }

    /**
     * @private
     */
    initPlugins() {
        this.plugins = [
            new webpack.IgnorePlugin({resourceRegExp: /ed25519/}),
            new CopyPlugin({
                patterns: [
                    path.join(this.params.projectRoot, this.params.staticFilesPath)
                ]
            }),
            new webpack.ProvidePlugin({Buffer: ['buffer', 'Buffer']})
        ]
    }

    /**
     * @private
     */
    prepareLoaderOptionsPlugin() {
        if (!this.isProduction) return
        this.plugins.unshift(new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: false,
            sourceMap: false
        }))
    }

    /**
     * @private
     */
    prepareDefinePlugin() {
        const {define = {}} = this.params
        const vars = {'process.env.NODE_ENV': JSON.stringify(this.mode)}
        for (const [key, value] of Object.entries(define)) {
            vars[key] = JSON.stringify(value)
        }
        this.plugins.push(new webpack.DefinePlugin(vars))
    }

    /**
     * @private
     */
    prepareHtmlPlugin() {
        const {projectRoot, entries} = this.params
        for (const [key, entry] of Object.entries(entries)) {
            if (entry.htmlTemplate) {
                const filename = entry.htmlTemplate.split('/').pop()
                this.plugins.push(new HtmlWebpackPlugin({
                    filename,
                    template: path.join(projectRoot, './static-template/index.html'),
                    chunks: [key]
                }))
            }
        }

    }

    /**
     * @private
     */
    prepareBundleAnalyzerPlugin() {
        if (!this.isProduction || !this.params.gatherBundleStats) return
        const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
        this.plugins.push(new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: 'bundle-stats.html',
            openAnalyzer: false
        }))

        try { //optional duplicates analysis
            const inspectpack = require('inspectpack/plugin')
            if (!inspectpack) return
            this.plugins.push(new inspectpack.DuplicatesPlugin({
                emitErrors: false,
                ignoredPackages: []
            }))
        } catch (e) {
        }
    }

    /**
     * @private
     */
    prepareCssExtractPlugin() {
        if (this.params.scss?.disabled) return
        const format = this.params.hashFileNames ? '[name].[contenthash].css' : '[name].css'
        const MiniCssExtractPlugin = require('mini-css-extract-plugin')
        this.plugins.push(new MiniCssExtractPlugin({filename: format}))
    }

    /**
     * @private
     */
    prepareResolveSection() {
        return {
            symlinks: true, //important for PNPM
            modules: [path.resolve(this.params.projectRoot, 'node_modules'), path.resolve(__dirname, 'node_modules'), 'node_modules'],
            fallback: {
                util: false,
                http: false,
                https: false,
                path: false,
                fs: false,
                url: false,
                events: require.resolve('events'),
                buffer: require.resolve('buffer/'),
                stream: require.resolve('stream-browserify')
            }
        }
    }
}

/**
 * Init webpack configuration function
 * @param {WebpackBuilderParams} params
 * @return {Function}
 */
function initWebpackConfig(params) {
    const builder = new WebpackConfigBuilder(params)
    return builder.build.bind(builder)
}

module.exports = {initWebpackConfig, createBabelConfig}

/**
 * @typedef {{}} WebpackBuilderParams
 * @property {WebpackEntries} entries - Input entries
 * @property {String} outputPath - Output base path (absolute path)
 * @property {String} projectRoot - Project root directory
 * @property {String} staticFilesPath - Path to directory containing static files (relative to project root dir)
 * @property {DevServerProps} devServer - DevServer properties
 * @property {ScssProps} scss? - Rules of SCSS files parsing
 * @property {{}} define? - Additional variables to be defined in the execution scope
 * @property {Boolean} sourcemap? - Generate source map (generated only in development mode by default)
 * @property {String} publicPath? - Relative client output path for built bundle ('/' by default)
 * @property {Boolean} hashFileNames? - Include content hash into file name (true by default)
 * @property {Boolean} gatherBundleStats? - Generate bundle stats report on production builds (true by default)
 */

/**
 * @typedef {Object.<String|String[]|WebpackEntryProps>} WebpackEntries
 * Keys - Chunk names
 * Values - Imported file path or array of modules to extract or advanced webpack entry props
 * See https://webpack.js.org/configuration/entry-context/#entry
 */

/**
 * @typedef {{}} WebpackEntryProps
 * @property {String} import - Imported file path
 * @property {String} dependOn? - Name of the chunk on which this chunk depends
 * @property {Boolean} asyncChunks? - Create async chunk that is loaded on demand
 * @property {Boolean} hashFileName? - Include content hash into file name (true by default)
 * @property {String} htmlTemplate? - Path to html template used for the output (relative to the project root dir)
 */

/**
 * @typedef {{}} DevServerProps
 * @property {String} host? - Host address to bind ('0.0.0.0' by default)
 * @property {Number} port? - Port number
 * @property {Boolean} https? - Use HTTPS with self-signed certificate
 */

/**
 * @typedef {{}} ScssProps
 * @property {Boolean} disabled? - Disable SCSS processing and bundling (false by default)
 * @property {String} additionalData? - Optional SCSS data prepended to the parsed SCSS bundle
 */