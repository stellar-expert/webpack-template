module.exports = function createBabelConfig(additionalPlugins = []) {
    return function (api) {
        api.cache(true)
        return {
            presets: [
                [
                    '@babel/preset-react',
                    {
                        'runtime': 'automatic'
                    }
                ],
                [
                    '@babel/preset-env',
                    {
                        corejs: '3.25',
                        useBuiltIns: 'entry',
                        //modules: false,
                        targets: {
                            browsers: [
                                '> 1%',
                                'not dead',
                                'not op_mini all'
                            ],
                            node: '16'
                        }
                    }
                ]
            ],
            plugins: [
                '@babel/plugin-syntax-dynamic-import',
                ...additionalPlugins
            ]
        }
    }
}