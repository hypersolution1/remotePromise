var net = require('net');
var Promise = require('bluebird');

var remotePromise = require('..');

var clientfns = {}; //or "require('...')"

clientfns.publish = function (data) {
	console.log("message from server: ", data);
}

var c = net.connect(5004);

remotePromise.instantiate(c, clientfns)
.then(function (server) {
	//interact with server Promises
	server.test()
	.then(function (data) {
		console.log("test returned: ", data);
	})
	.catch(function (err) {
		console.log("client err: ", err);
	})
})

