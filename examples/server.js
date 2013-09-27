var rpc = require('../lib');

var server = new rpc.Server({
    port: 2000
});

server.on('test', function (cb) {
    setTimeout(function () {
        cb(null, 1);
    }, 300);
});

server.start();
