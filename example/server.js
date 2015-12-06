var net = require('net');
var Promise = require('bluebird');
var util = require('util');

var remotepromise = require('..');

var serverfns = {}; //or "require('...')"

serverfns.testOk = function () {
	console.log("testOk called");
	//Either return a Promise:
	return Promise.delay(2000)
	.then(function () {
		return "Hello";
	})
	//or a Value (resolve)
	//return "Hello";
}

serverfns.testError = function () {
	console.log("testError called");
	//Throw an error, the remote Promise will be rejected with a RemoteError, trapped with .catch()
	//RemoteError.remote contains the remote error object
	throw new Error("err!");
	//or an OperationalError, rejected with a RemoteOperationalError, trapped with .error()
	//throw new Promise.OperationalError("err!");
}

var server = net.createServer(function (c) {
	remotepromise.instantiate(c, serverfns)
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
				console.log("broadcast err: ", util.inspect(err));
			})
		}
		broadcast();
	})
});

server.listen(5004);