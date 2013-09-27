var rpc = require('../lib');

var client = new rpc.Client({
    port: 2000
});

client.request('test', function () {
    console.log(arguments);
    client.end();
});

