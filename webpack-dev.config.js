const path = require('path');
const webpack = require('webpack');

const rootPath = path.resolve( __dirname, 'src' );
const destinationPath = path.resolve( __dirname, 'dist' );

module.exports = {
    context: rootPath,

    entry: {
        'main': './main.ts'
    },
    
    output: {
        filename: '[name].bundle.js',
        path: destinationPath
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
            },
            // Require .vert and .frag as raw text.
            {
                test: /\.(vert|frag|glsl)$/i,
                use: 'raw-loader',
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ]
    },

    devtool: 'cheap-module-source-map',
    devServer: {
        disableHostCheck: true, 
        // public: 'localhost:9000'
    }
};

