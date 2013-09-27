var rpc = require('../lib');

var client = new rpc.Client({
    port: 2000
});

client.request('test-request', function () {
    console.log('answer!');
    client.end();
});

client.notify('test-notify');
