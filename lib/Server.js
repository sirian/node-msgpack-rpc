module.exports = Server;

var net = require('net');
var _ = require('underscore');
var msgpack = require('msgpack');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Server(options) {
    EventEmitter.call(this);

    this._connected = false;
    this._retryTimeout = null;

    this._options = _.extend({
        socket: null,
        port: null,
        host: '0.0.0.0'
    }, options);

    this._createSocket();
}
util.inherits(Server, EventEmitter);

Server.prototype._createSocket = function () {
    var server = this;

    var socket = net.createServer(this._connectionListener.bind(this))

    socket.on('listening', function () {
        server._connected = true;
    }).on('close', function (e) {
        server._connected = false;
    }).on('error', function (e) {
        try {
            socket.close();
        } catch (ignored) {
        }

        clearTimeout(server._retryTimeout);
        server._retryTimeout = setTimeout(server._listen.bind(server), 1000);
    });

    this._socket = socket;
};

Server.prototype._connectionListener = function (conn) {
    var stream = new msgpack.Stream(conn);

    var server = this;

    stream.on('msg', function (msg) {
        switch (msg[0]) {
            case 0:
                var msgId = msg[1];
                var method = msg[2];
                var params = msg[3];
                var respCallback = function(err, result) {
                    if (err && err.constructor == Error) {
                        err = err.message;
                    }
                    var response = [1, msgId, err, result || null];
                    var packed = msgpack.pack(response);
                    conn.write(packed);
                };

                if (server.listeners(method).length === 0) {
                    return respCallback(new Error("no listener for method " + method));
                }

                params.push(respCallback);
                params.splice(0, 0, method);
                server.emit.apply(server, params);

                break;
            case 2:
                var method = msg[1];
                var params = msg[2];
                params.unshift(method);

                server.emit.apply(server, params);
                break;
        }
    });

    conn.on('error', function (e) {
        conn.end();
    });

    conn.on('end', function () {
        stream.removeAllListeners();
    });
};

Server.prototype.start = function () {
    this._listen();
};

Server.prototype._listen = function () {
    clearTimeout(this._retryTimeout);

    var socket = this._socket;

    var listen = [];
    var o = this._options;
    if (o.socket) {
        listen.push(o.socket);
    } else {
        listen.push(o.port);
        listen.push(o.host);
    }

    if (this._connected) {
        socket.close();
    }

    socket.listen.apply(socket, listen)
};
