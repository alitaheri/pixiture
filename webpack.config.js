module.exports = {
    entry: "./src/app.js",
    output: {
        path: "./build",
        filename: "bundle.js"
    },
    externals: {
        fs: 'undefined',
    },
    devtool: "#inline-source-map",
    module: {
        loaders: [
            {
                test: /\.json$/,
                loader: 'json-loader',
            },
        ],
    },
};
