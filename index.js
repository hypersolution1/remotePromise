var dnode = require('dnode');
var Promise = require('bluebird');

var CloseStreamError = exports.CloseStreamError = function (message) {
    this.name = 'CloseStreamError';
    this.message = message;
    this.stack = (new Promise.OperationalError()).stack;
}
CloseStreamError.prototype = new Promise.OperationalError;

var remotepromise = function (stream, promises) {

    var ended = false;
    var fnrejects = [];

    var promisify = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return new Promise(function(fnresolve, fnreject) {

                if(ended) {
                    fnreject(new CloseStreamError("Stream Closed!"));
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
                        fnreject(new Promise.OperationalError(err));
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
                //console.log(err);
                cb(err.toString());
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
                fnreject(new CloseStreamError("Stream Closed!"));
            })
            fnrejects = [];
            if(reject) {
                reject(new CloseStreamError("Stream Closed!"));
                resolve = null;
                reject = null;
            }
        })

        stream.pipe(d).pipe(stream);

    });

}

exports.instantiate = remotepromise;