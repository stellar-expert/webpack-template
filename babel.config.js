const path = require('path')

function localPackage(packageName){
    return path.join(__dirname, './node_modules/', packageName)
}

module.exports = function createBabelConfig(additionalPlugins = []) {
    return function (api) {
        api.cache(true)
        return {
            presets: [
                [
                    localPackage('@babel/preset-react'),
                    {
                        'runtime': 'automatic'
                    }
                ],
                [
                    localPackage('@babel/preset-env'),
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
                localPackage('@babel/plugin-syntax-dynamic-import'),
                ...additionalPlugins
            ]
        }
    }
}