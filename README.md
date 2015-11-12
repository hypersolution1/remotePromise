# remotePromise

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

var remotePromise = require('remotePromise');

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
```

client:

``` js
var net = require('net');
var Promise = require('bluebird');

var remotePromise = require('remotePromise');

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
```

# install

With [npm](http://npmjs.org) do:

```
npm install remotePromise
```
