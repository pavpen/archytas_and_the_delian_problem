const ESLintPlugin = require('eslint-webpack-plugin');
const path = require('path');

const webConfig = {
    entry: './src/ts/main.tsx',
    output: {
        path: path.resolve(__dirname, 'build', 'dist'),
        filename: 'bundle.js'
    },
    devtool: 'inline-source-map',
    plugins: [new ESLintPlugin()],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.m?js$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }
                ]
            },
            {
                test: /\.s[ac]ss$/,
                exclude: /node_modules/,
                use: [
                    { loader: 'style-loader' },
                    {
                        // https://github.com/NativeScript/nativescript-dev-webpack/issues/1148#issuecomment-704591372:
                        loader: 'css-loader',
                        options: {
                            url: false,
                            modules: {
                                auto: (resourcePath) => resourcePath.endsWith('variables.scss')
                            }
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: { implementation: require('sass') }
                    }
                ]
            }
        ]
    }
};

const cogeGenConfig = {
    target: 'node',
    entry: {
        pre_render_html: './src/ts/code_gen/pre_render_html.tsx'
    },
    output: {
        path: path.resolve(__dirname, 'build', 'code_gen'),
        filename: '[name].js'
    },
    devtool: 'inline-source-map',
    plugins: [new ESLintPlugin()],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.m?js$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }
                ]
            },
            {
                test: /\.s[ac]ss$/,
                exclude: /node_modules/,
                use: [
                    'style-loader',
                    {
                        // https://github.com/NativeScript/nativescript-dev-webpack/issues/1148#issuecomment-704591372:
                        loader: 'css-loader',
                        options: {
                            url: false,
                            modules: {
                                auto: (resourcePath) => resourcePath.endsWith('variables.scss')
                            }
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: { implementation: require('sass') }
                    }
                ]
            }
        ]
    }
};

module.exports = [webConfig, cogeGenConfig];
