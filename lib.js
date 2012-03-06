var lib = (function () {
    var serialize = function(obj) {
        var convertFunction = function (fn) {
            if(typeof fn === "function") return function (args) {
                return convertFunction(fn.apply(null, args.map(function(arg){ return arg instanceof Array ? arg : arg.value; })));
            };
            return fn;
        };
        var convertObject = function(obj) {
            return {
                value: obj,
                mutability: 1,
                enumerable: 1
            };
        };
        if(typeof obj === "function") return convertFunction(obj);
        if(typeof obj === "object" && obj !== null && !(obj instanceof Array)) {
            for(var i in obj){
                if(!obj.hasOwnProperty(i)) continue;
                obj[i] = convertObject(convertFunction(obj[i]));
            }
        }
        return obj;
    };

    var library = {
        alert: function (msg) {
            alert(msg);
            return msg;
        },
        prompt: function (msg, defaultText) {
            return prompt(msg, defaultText);
        },
        array: {
            head: function(arr) {
                return arr[0];
            },
            tail: function(arr) {
                return arr.slice(1);
            },
            foot: function(arr) {
                return arr[arr.length - 1];
            },
            length: function(arr) {
                return arr.length;
            },
            fill: function(arr) {
                var ret = [], i;
                for(i = 1; i < arr.length; i++) {
                    var from = arr[i - 1], to = arr[i], j;
                    if(typeof from !== "number" || typeof to !== "number") throw "Can only fill numeric arrays";
                    if(from < to)
                        for(j = from; j < to; j++) ret.push(j);
                    else
                        for(j = from; j > to; j--) ret.push(j);
                }
                ret.push(arr[arr.length - 1]);
                return ret;
            },
            reduce: function(arr) {
                return function(fn) {
                    if(!arr.length) throw "Cannot reduce empty array.";
                    var start = true, accum;
                    for(var i in arr) {
                        if(!arr.hasOwnProperty(i)) continue;
                        if(start) {
                            start = false;
                            accum = arr[i];
                            continue;
                        }
                        accum = f(fn, [accum, arr[i], i, arr]);
                    }
                    return accum;
                };
            }
        },
        object: {},
        string: {},
        number: {},
        boolean: {},
        "function": {}
    };

    for (var i in library) {
        if(!library.hasOwnProperty(i)) continue;
        library[i] = serialize(library[i]);
    }
    return library;
})();