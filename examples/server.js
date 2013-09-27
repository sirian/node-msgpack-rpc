var rpc = require('../lib');

var server = new rpc.Server({
    port: 2000
});

server.on('test-request', function (cb) {
    console.log('requested!');
    setTimeout(function () {
        cb(null, 1);
    }, 300);
});

server.on('test-notify', function () {
    console.log('notified!');
});

server.start();
