var lib = (function () {
    var serialize = function(obj) {
        var convertFunction = function (fn) {
            if(typeof fn === "function") return function (args) {
                var a = args.map(function(arg){ return arg instanceof Array ? arg : arg.value; });
                return convertFunction(fn.apply(null, a));
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
    
    var checkFunction = function(fn) {
        if(typeof fn !== "function") throw "Expected function argument";
    };
    
    var type = function(a) {
        if(a instanceof Array) return "array";
        if(typeof a === "undefined" || a === null) return "nil";
        return typeof a;
    };

    var library = {
        "true": true,
        "false": false,
        "nil": null,
        type: function (a) {
            return type(a);
        },
        alert: function (msg) {
            alert(msg);
            return msg;
        },
        prompt: function (msg, defaultText) {
            return prompt(msg, defaultText);
        },
        error: function(err) {
            throw err;
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
            body: function(arr) {
                return arr.slice(0, -1);
            },
            random: function(arr) {
                return arr[(Math.random() * arr.length) | 0];
            },
            length: function(arr) {
                return arr.length;
            },
            prepend: function(arr) {
                return function(value, v2) {
                    if(typeof v2 !== "undefined") {
                        value = [value];
                        for(var i = 1; i < arguments.length; i++) {
                            value.push(arguments[i]);
                        }
                    }
                    return [].concat(value, arr);
                };
            },
            append: function(arr) {
                return function(value, v2) {
                    if(typeof v2 !== "undefined") {
                        value = [value];
                        for(var i = 1; i < arguments.length; i++) {
                            value.push(arguments[i]);
                        }
                    }
                    return arr.concat(value);
                };
            },
            concat: function(arr) {
                return function(arr2) {
                    if(!(arr2 instanceof Array)) throw "Expected array argument";
                    return arr.concat(arr2);
                };
            },
            range: function(arr) {
                return function(start, end) {
                    if(!(start in arr) || !(end in arr)) throw "Index not in array";
                    return arr.slice(start, end);
                };
            },
            remove: function(arr) {
                return function(start, end) {
                    end = end || start;
                    if(!(start in arr) || !(end in arr)) throw "Index not in array";
                    end++;
                    return arr.slice(0, start).concat(arr.slice(end));
                };
            },
            insert: function(arr) {
                return function(index, elems) {
                    if(!(index in arr)) throw "Index not in array";
                    if(!(elems instanceof Array)) throw "Expected array argument";
                    return arr.slice(0, index).concat(elems, arr.slice(index));
                };
            },
            join: function(arr) {
                return function(separator) {
                    if(typeof separator !== "string") throw "Expected string argument.";
                    return arr.split(separator);
                };
            },
            reverse: function(arr) {
                var ret = [];
                for(var i = arr.length - 1; i >= 0; i--) {
                    ret.push(arr[i]);
                }
                return ret;
            },
            sort: function(arr) {
                return function(fn) {
                    if(typeof fn !== "function") fn = function(a, b) {
                        var aT = type(a), bT = type(b);
                        if(aT !== bT) {
                            return parseInt(aT, 36) - parseInt(bT, 36);
                        }
                        if(a > b) return 1;
                        if(a < b) return -1;
                        return 0;
                    };
                    return arr.slice().sort(fn);
                };
            },
            indexOf: function(arr) {
                return function(value) {
                    for(var i = 0; i < arr.length; i++) {
                        if(q(arr[i], value)) return i;
                    }
                    return -1;
                };
            },
            lastIndexOf: function(arr) {
                return function(value) {
                    for(var i = arr.length - 1; i >= 0; i--) {
                        if(q(arr[i], value)) return i;
                    }
                    return -1;
                };
            },
            contains: function(arr) {
                return function(value) {
                    for(var i = 0; i < arr.length; i++) {
                        if(q(arr[i], value)) return true;
                    }
                    return false;
                };
            },
            forEach: function(arr) {
                return function(fn) {
                    checkFunction(fn);
                    for(var i in arr) { 
                        if(!arr.hasOwnProperty(i)) continue;
                        f(fn, [arr[i]]);
                    }
                };
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
            filter: function(arr) {
                return function(fn) {
                    checkFunction(fn);
                    var ret = [];
                    for(var i in arr) {
                        if(!arr.hasOwnProperty(i)) continue;
                        if(f(fn, [arr[i], i, arr]) === true) ret.push(arr[i]);
                    }
                    return ret;
                };
            },
            every: function(arr) {
                return function(fn) {
                    checkFunction(fn);
                    for(var i in arr) {
                        if(!arr.hasOwnProperty(i)) continue;
                        if(f(fn, [arr[i], i, arr]) !== true) return false;
                    }
                    return true;
                };
            },
            some: function(arr) {
                return function(fn) {
                    checkFunction(fn);
                    for(var i in arr) {
                        if(!arr.hasOwnProperty(i)) continue;
                        if(f(fn, [arr[i], i, arr]) === true) return true;
                    }
                    return false;
                };
            },
            map: function(arr){
                return function(fn) {
                    checkFunction(fn);
                    var ret = [];
					for (var i in arr) {
                        if(!arr.hasOwnProperty(i)) continue;
						ret[i] = f(fn, [arr[i], i, arr]);
					}
					return ret;
                };
            },
            fold: function(arr) {
                return function(fn, seed) {
                    var accum, i;
                    if(typeof seed === "undefined") {
                        if(!arr.length) throw "Cannot reduce empty array.";
                        accum = arr[0]; i = 1;
                    } else {
                        accum = seed; i = 0;
                    }
                    while(i < arr.length) {
                        accum = f(fn, [accum, arr[i], i, arr]);
                        i++;
                    }
                    return accum;
                };
            },
            foldBack: function(arr) {
                return function(fn, seed) {
                var accum, i;
                    if(typeof seed === "undefined") {
                        if(!arr.length) throw "Cannot reduce empty array.";
                        accum = arr[arr.length - 1]; i = arr.length - 2;
                    } else {
                        accum = seed; i = arr.length - 1;
                    }
                    while(i >= 0) {
                        accum = f(fn, [accum, arr[i], i, arr]);
                        i--;
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