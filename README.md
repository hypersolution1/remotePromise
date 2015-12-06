# remotepromise

Remote procedure call over stream wrapped into Promises.

It wraps [dnode](https://github.com/substack/dnode), an asynchronous rpc system for node.js that lets you
call remote functions.

It also uses [bluebird](http://bluebirdjs.com/docs/getting-started.html), a fast Promise implementation in javascript.

With this module, a remote call is wrapped as a Promise. If the stream is cutted during a pending Promise, the Promise will then rejects.


# example

server:

``` js
var net = require('net');
var Promise = require('bluebird');
var util = require('util');

var remotepromise = require('remotepromise');

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
```

client:

``` js
var net = require('net');
var Promise = require('bluebird');
var util = require('util');

var remotepromise = require('remotepromise');

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

```

# install

With [npm](http://npmjs.org) do:

```
npm install remotepromise
```
