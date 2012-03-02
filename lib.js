var lib = (function () {
    var serialize = function(obj) {
        var convertFunction = function (fn) {
            return function (args) {
                return serialize(fn.apply(null, args.map(function(arg){ return arg instanceof Array ? arg : arg.value; })));
            };
        };
        var convertObject = function(obj) {
            for(var i in obj){
                if(!obj.hasOwnProperty(i)) continue;
                obj[i] = serialize(obj[i]);
            }
            return {
                value: obj,
                mutability: 1,
                enumerable: 1
            };
        };
        if(typeof obj === "function") return convertFunction(obj);
        if(typeof obj === "object" && obj !== null && !(obj instanceof Array)) return convertObject(obj);
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
            reduce: function(arr) {
                return function(fn) {
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