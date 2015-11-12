var net = require('net');
var Promise = require('bluebird');

var remotePromise = require('..');

var serverfns = {}; //or "require('...')"

serverfns.test = function () {
	console.log("test called");
	//Either return a Promise:
	return Promise.delay(2000)
	.then(function () {
		return "Hello";
	})
	//or a Value (resolve)
	return "Hello";
	//or throw an error, the remote Promise will be rejected.
	throw "error!";
}

var server = net.createServer(function (c) {
	remotePromise.instantiate(c, serverfns)
	.then(function (client) {
		//interact with client Promises
		function broadcast() {
			return Promise.delay(5000)
			.then(function () {
				return client.publish("Foobar!");
			})
			.then(function () {
				return broadcast();
			})
			.catch(function (err) {
				console.log("broadcast err: ", err);
			})
		}
		broadcast();
	})
});

server.listen(5004);