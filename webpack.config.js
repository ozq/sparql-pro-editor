const path = require('path');

module.exports = {
    context: path.resolve(__dirname, 'resources/scripts'),
    entry: './app.js',
    output: {
        path: path.resolve(__dirname, 'public'),
        publicPath: 'public/dist/js/',
        filename: 'js/dist/app.js'
    }
};
