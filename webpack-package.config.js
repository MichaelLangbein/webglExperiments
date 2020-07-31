const webpack = require('webpack');
const path = require('path');

const rootPath = path.resolve( __dirname, 'src' );
const destinationPath = path.resolve( __dirname, 'dist' );

module.exports = {
    context: rootPath,

    entry: {
        'main': './module.main.ts'
    },
    
    output: {
        filename: 'webgl-utils.bundle.js',
        path: destinationPath,
        library: 'webgl-utils',
        libraryTarget: 'umd',
    },

    resolve: {
        extensions: ['.ts', '.js'],
        modules: [
            rootPath,
            'node_modules'
        ]
    },

    module: {
        rules: [
            /****************
            * PRE-LOADERS
            *****************/
            {
                enforce: 'pre',
                test: /\.js$/,
                use: 'source-map-loader'
            },
            {
                enforce: 'pre',
                test: /\.ts$/,
                exclude: /node_modules/,
                use: 'tslint-loader'
            },

            /****************
            * LOADERS
            *****************/
            {
                test: /\.ts$/,
                exclude: [ /node_modules/ ],
                use: 'awesome-typescript-loader'
            }
        ]
    },
};