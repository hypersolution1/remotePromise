var net = require('net');
var Promise = require('bluebird');
var util = require('util');

var remotepromise = require('..');

var clientfns = {}; //or "require('...')"

clientfns.publish = function (data) {
	console.log("message from server: ", data);
}

var c = net.connect(5004);

remotepromise.instantiate(c, clientfns)
.then(function (server) {
	//interact with server Promises
	Promise.resolve() 
	.then(function () {
		return server.testOk();
	})
	.then(function (data) {
		console.log("test returned: ", data);
	})
	.then(function () {
		return server.testError();
	})
	.error(function (err) {
		console.log("client err: ", util.inspect(err));
		console.log("error err instanceof OperationalError", err instanceof Promise.OperationalError);
	})
	.catch(function (err) {
		console.log("client err: ", util.inspect(err));
		console.log("catch err instanceof Error", err instanceof Error);
	})
})

