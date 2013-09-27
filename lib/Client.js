module.exports = Client;

var net = require('net');
var msgpack = require('msgpack');
var _ = require('underscore');


function Client(options) {
    this._options = _.extend({
        port: null,
        host: '127.0.0.1',
        socket: null,
        timeout: 5000
    }, options);
    this._msgIdSequence = 1;

    this._requests = {};

    this._connecting = false;
    this._connected = false;

    this._createSocket();
}

Client.prototype._createSocket = function () {
    var socket = new net.Socket();
    var client = this;
    var stream = null;

    socket.on('connect', function () {
        client._connecting = false;
        client._connected = true;

        stream = new msgpack.Stream(socket);
        stream.on('msg', function (msg) {
            if (1 === msg[0]) {
                var msgId = msg[1];
                var err = msg[2];
                var result = msg[3];
                client._response(msgId, err, result);
            }
        });

    }).on('close', function () {
        client._connected = false;
        client._connecting = false;
        client._endRequests(new Error('Socket closed'));
        if (stream) {
            stream.removeAllListeners();
        }
    }).on('error', function (e) {
        client._endRequests(new Error('Socket error: ' + e.message));
    });


    this._socket = socket;
};

Client.prototype.end = function () {
    this._socket.end();
};

Client.prototype._connect = function () {
    if (this._connecting || this._connected) {
        return;
    }
    this._connecting = true;
    this._connected = false;

    var o = this._options;
    var connectOptions = {};
    if (o.socket) {
        connectOptions.path = o.socket;
    } else {
        _.extend(connectOptions, {
            port: o.port,
            host: o.host
        });
    }

    this._socket.connect(connectOptions);
};

Client.prototype._endRequests = function (err, result) {
    for (var msgId in this._requests) {
        if (!this._requests.hasOwnProperty(msgId)) {
            continue;
        }

        this._response(msgId, err, result);
    }
};

Client.prototype.request = function (method) {
    params = Array.prototype.slice.call(arguments, 1, arguments.length - 1);

    callback = arguments[arguments.length - 1];

    if ('function' !== typeof callback) {
        throw new Error('Callback not provided');
    }

    var client = this;

    var msgId = this._msgIdSequence++;
    var data = msgpack.pack([0, msgId, method, params]);

    var timeout = setTimeout(this._response.bind(this, msgId, new Error('Request timeout')), this._options.timeout);

    this._requests[msgId] = {
        callback: callback,
        timeout: timeout
    };

    this._send(data);
};

Client.prototype._response = function (msgId, err, result) {
    if (!this._requests.hasOwnProperty(msgId)) {
        return;
    }
    var request = this._requests[msgId];
    clearTimeout(request.timeout);
    request.callback.call(null, err || null, result);
    delete this._requests[msgId];
};

Client.prototype.notify = function (method) {
    params = Array.prototype.slice.call(arguments, 1, arguments.length - 1);

    var data = msgpack.pack([2, method, params]);

    this._send(data);
};

Client.prototype._send = function (data) {
    this._connect();
    this._socket.write(data);
};
