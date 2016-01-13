var dnode = require('dnode');
var Promise = require('bluebird');

var ClosedStreamError = exports.ClosedStreamError = function (message) {
    this.name = 'ClosedStreamError';
    this.message = message;
    this.stack = (new Error()).stack;
}
ClosedStreamError.prototype = new Error;

var RemoteError = exports.RemoteError = function (err) {
    this.name = 'RemoteError';
    this.message = err.message;
    this.remote = err;
}
RemoteError.prototype = new Error;

var RemoteOperationalError = exports.RemoteOperationalError = function (err) {
    this.name = 'RemoteOperationalError';
    this.message = err.message;
    this.remote = err;
}
RemoteOperationalError.prototype = new Promise.OperationalError;

function getNestedKeys(obj) {
    all_keys = {};
    function get_internal(obj) {
        var keys = Object.keys(obj);
        var k_l = keys.length;
        var value, key;
        for (var i = 0; i < k_l; i++) {      
            key = keys[i];
            all_keys[key] = 1;
            value = obj[key];
            if (value instanceof Object) {
                get_internal(value);
            }         
        }
    }
    get_internal(obj);
    return Object.keys(all_keys);
}

var remotepromise = function (stream, promises) {

    var ended = false;
    var fnrejects = [];

    var promisify = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return new Promise(function(fnresolve, fnreject) {

                if(ended) {
                    fnreject(new ClosedStreamError("Stream Closed!"));
                    return;
                }

                fnrejects.push(fnreject);
                
                args.push(function () {

                    var idx = fnrejects.indexOf(fnreject);
                    if(idx != -1) {
                        fnrejects.splice(idx, 1); 
                    }               

                    var cbargs = Array.prototype.slice.call(arguments);
                    var err = cbargs.shift();
                    if(err) {
                        if(err instanceof Object && typeof err.message == "string" && typeof err.name == "string") {
                            if(err.name == "OperationalError") {
                                err = new RemoteOperationalError(err);
                            } else if (/Error$/.test(err.name)) {
                                err = new RemoteError(err);
                            }
                        }
                        fnreject(err);
                    } else {
                        fnresolve.apply(this, cbargs);
                    }

                })

                fn.apply(this, args);

            });        
        }
    }


    var callbackify = function (pr) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            var cb = args.pop();
            Promise.resolve()
            .then(function () {
                return pr.apply(this, args);
            })
            .then(function (retval) {
                cb(null, retval);
            })
            .catch(function (err) {
                cb((err instanceof Object) ? JSON.parse(JSON.stringify(err, getNestedKeys(err).concat(['name', 'message', 'stack']))) : err);
            })
        }
    }

    return new Promise(function(resolve, reject) {

        var remotefns;
        if(promises instanceof Object) {
            remotefns = {};
            for(var i in promises) {
                remotefns[i] = callbackify(promises[i]);
            }
        }
        var d = dnode(remotefns);
        d.on('remote', function (remote) {
            for(var i in remote) {
                remote[i] = promisify(remote[i]);
            }
            if(resolve) {
                resolve(remote);
                resolve = null;
                reject = null;
            }
        });

        d.on('fail', function (err) {
            console.log('dnode fail',err);
        });
        d.on('error', function (err) {
            console.log('dnode error',err);
        });

        d.on('end', function (err) {
            ended = true;
            fnrejects.forEach(function (fnreject) {
                fnreject(new ClosedStreamError("Stream Closed!"));
            })
            fnrejects = [];
            if(reject) {
                reject(new ClosedStreamError("Stream Closed!"));
                resolve = null;
                reject = null;
            }
        })

        stream.pipe(d).pipe(stream);

    });

}

exports.instantiate = remotepromise;