var lib = ((() => {
	var serialize = obj => {
		var convertFunction = fn => {
			if (typeof fn === "function") return args => {
				var a = args.map(arg => { arg = arg instanceof Array ? arg : arg.value; if (!fn.lazy && typeof arg === "function" && arg.thunk) arg = arg(); return arg; });
				return convertFunction(fn(...a));
			};
			return fn;
		};
		var convertObject = obj => ({
            value: obj,
            mutability: 1,
            enumerable: 1
        });
		if (typeof obj === "function") return convertFunction(obj);
		if (typeof obj === "object" && obj !== null && !(obj instanceof Array)) {
			for (var i in obj) {
				if (!obj.hasOwnProperty(i)) continue;
				obj[i] = convertObject(convertFunction(obj[i]));
			}
		}
		return obj;
	};

	var checkFunction = fn => {
		if (typeof fn !== "function") throw "Expected function argument";
	};

	var type = a => {
		if (a instanceof Array) return "array";
		if (typeof a === "undefined" || a === null) return "nil";
		return typeof a;
	};

	var lazy = fn => {
		fn.lazy = true;
		return fn;
	};

	var library = {
		"true": true,
		"false": false,
		"nil": null,
		"?": lazy((a, b) => {
			var exists = typeof a !== undefined && a !== null;
			if (typeof b !== undefined) {
				//if (typeof b === "function") b = fn(b, []);
				return exists ? a : b;
			}
			return exists;
		}),
		type(a) {
			return type(a);
		},
		alert(msg) {
			msg = p(msg, "toString");
			alert(msg);
			return msg;
		},
		prompt(msg, defaultText) {
			return prompt(msg, defaultText);
		},
		error(err) {
			throw err;
		},
		"while": lazy((cond, fn) => {
			var x;
			while (f(cond, []) === true) {
				x = f(fn, []);
				if (x === "break") break;
			}
			return x;
		}),
		until: lazy((cond, fn) => {
			var x;
			while (f(cond, []) === false) {
				x = f(fn, []);
				if (x === "break") break;
			}
			return x;
		}),
		"if": lazy((cond, result) => {
			if (f(cond, []) === true) return f(result, []);
		}),
		unless: lazy((cond, result) => {
			if (f(cond, []) === false) return f(result, []);
		}),
		array: {
			toString(arr) {
				return "[(" + arr.join(") (") + ")]";
			},
			head(arr) {
				return arr[0];
			},
			tail(arr) {
				return arr.slice(1);
			},
			foot(arr) {
				return arr[arr.length - 1];
			},
			body(arr) {
				return arr.slice(0, -1);
			},
			length(arr) {
				return arr.length;
			},
			isEmpty(arr) {
				return !arr.length;
			},
			prepend(arr) {
				return function (value, v2) {
					if (typeof v2 !== "undefined") {
						value = [value];
						for (var i = 1; i < arguments.length; i++) {
							value.push(arguments[i]);
						}
					}
					return [].concat(value, arr);
				};
			},
			append(arr) {
				return function (value, v2) {
					if (typeof v2 !== "undefined") {
						value = [value];
						for (var i = 1; i < arguments.length; i++) {
							value.push(arguments[i]);
						}
					}
					return arr.concat(value);
				};
			},
			concat(arr) {
				return arr2 => {
					if (!(arr2 instanceof Array)) throw "Expected array argument";
					return arr.concat(arr2);
				};
			},
			range(arr) {
				return (start, end) => arr.slice(start, end);
			},
			remove(arr) {
				return (start, end) => {
					end = end || start;
					end++;
					return arr.slice(0, start).concat(arr.slice(end));
				};
			},
			insert(arr) {
				return (index, elems) => {
					if (!(elems instanceof Array)) throw "Expected array argument";
					return arr.slice(0, index).concat(elems, arr.slice(index));
				};
			},
			replace(arr) {
				return (index, fn) => {
					var x = arr.slice(0, index).concat([f(fn, [arr[index], index, arr])], arr.slice(index + 1));
					return x;
				};
			},
			join(arr) {
				return separator => {
					separator = separator || "";
					if (typeof separator !== "string") throw "Expected string argument.";
					arr = arr.map(v => p(v, "toString"));
					return arr.join(separator);
				};
			},
			reverse(arr) {
				var ret = [];
				for (var i = arr.length - 1; i >= 0; i--) {
					ret.push(arr[i]);
				}
				return ret;
			},
			sort(arr) {
				return fn => {
					if (typeof fn !== "function") fn = (a, b) => {
                        var aT = type(a);
                        var bT = type(b);
                        if (aT !== bT) {
							return parseInt(aT, 36) - parseInt(bT, 36);
						}
                        if (a > b) return 1;
                        if (a < b) return -1;
                        return 0;
                    };
					return arr.slice().sort(fn);
				};
			},
			indexOf(arr) {
				return value => {
					for (var i = 0; i < arr.length; i++) {
						if (q(arr[i], value)) return i;
					}
					return -1;
				};
			},
			lastIndexOf(arr) {
				return value => {
					for (var i = arr.length - 1; i >= 0; i--) {
						if (q(arr[i], value)) return i;
					}
					return -1;
				};
			},
			contains(arr) {
				return value => {
					for (var i = 0; i < arr.length; i++) {
						if (q(arr[i], value)) return true;
					}
					return false;
				};
			},
			forEach(arr) {
				return fn => {
					checkFunction(fn);
					for (var i in arr) {
						if (!arr.hasOwnProperty(i)) continue;
						f(fn, [arr[i], i, arr]);
					}
				};
			},
			fill(arr) {
                var ret = [];
                var i;
                for (i = 1; i < arr.length; i++) {
                    var from = arr[i - 1];
                    var to = arr[i];
                    var j;
                    if (typeof from !== "number" || typeof to !== "number") throw "Can only fill numeric arrays";
                    if (from < to)
						for (j = from; j < to; j++) ret.push(j);
					else
						for (j = from; j > to; j--) ret.push(j);
                }
                ret.push(arr[arr.length - 1]);
                return ret;
            },
			filter(arr) {
				return fn => {
					checkFunction(fn);
					var ret = [];
					for (var i in arr) {
						if (!arr.hasOwnProperty(i)) continue;
						if (f(fn, [arr[i], i, arr]) === true) ret.push(arr[i]);
					}
					return ret;
				};
			},
			every(arr) {
				return fn => {
					checkFunction(fn);
					for (var i in arr) {
						if (!arr.hasOwnProperty(i)) continue;
						if (f(fn, [arr[i], i, arr]) !== true) return false;
					}
					return true;
				};
			},
			some(arr) {
				return fn => {
					checkFunction(fn);
					for (var i in arr) {
						if (!arr.hasOwnProperty(i)) continue;
						if (f(fn, [arr[i], i, arr]) === true) return true;
					}
					return false;
				};
			},
			map(arr) {
				return fn => {
					checkFunction(fn);
					var ret = [];
					for (var i in arr) {
						if (!arr.hasOwnProperty(i)) continue;
						ret[i] = f(fn, [arr[i], i, arr]);
					}
					return ret;
				};
			},
			reduce(arr) {
				return (fn, seed) => {
                    var accum;
                    var i;
                    if (typeof seed === "undefined") {
						if (!arr.length) throw "Cannot reduce empty array.";
						accum = arr[0]; i = 1;
					} else {
						accum = seed; i = 0;
					}
                    while (i < arr.length) {
						accum = f(fn, [accum, arr[i], i, arr]);
						i++;
					}
                    return accum;
                };
			},
			reduceBack(arr) {
				return (fn, seed) => {
                    var accum;
                    var i;
                    if (typeof seed === "undefined") {
						if (!arr.length) throw "Cannot reduce empty array.";
						accum = arr[arr.length - 1]; i = arr.length - 2;
					} else {
						accum = seed; i = arr.length - 1;
					}
                    while (i >= 0) {
						accum = f(fn, [accum, arr[i], i, arr]);
						i--;
					}
                    return accum;
                };
			},
			multiply(arr) {
				return (arr2, fn) => {
					var ret = [];
					for (var i = 0; i < arr.length; i++) {
						for (var j = 0; j < arr2.length; j++) {
							ret.push(f(fn, [arr[i], arr2[j]]));
						}
					}
					return ret;
				};
			},
			sum(arr) {
				var sum = 0;
				for (var i = 0; i < arr.length; i++) {
					if (typeof arr[i] === "number") sum += arr[i];
					else throw "Expected number";
				}
				return sum;
			},
			mean(arr) {
				var sum = 0;
				if (!arr.length) throw "Cannot find mean of empty array";
				for (var i = 0; i < arr.length; i++) {
					if (typeof arr[i] === "number") sum += arr[i];
					else throw "Expected number";
				}
				return sum / arr.length;
			},
			max(arr) {
				var max = Number.MIN_VALUE;
				for (var i = 0; i < arr.length; i++) {
					if (arr[i] > max) max = arr[i];
				}
				return max === Number.MIN_VALUE ? undefined : max;
			},
			min(arr) {
				var min = Number.MAX_VALUE;
				for (var i = 0; i < arr.length; i++) {
					if (arr[i] < min) min = arr[i];
				}
				return min === Number.MAX_VALUE ? undefined : min;
			},
			random(arr) {
				return arr[(Math.random() * arr.length) | 0];
			},
			shuffle(arr) {
                var ret = arr.slice();
                var i = ret.length;
                if (i === 0) throw "cannot shuffle empty array";
                while (--i) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var ti = ret[i];
                    var tj = ret[j];
                    ret[i] = tj;ret[j] = ti;
                }
                return ret;
            }
		},
		object: {
			toString(obj) { return "_object_"; }
		},
		string: {
			toString(str) { return str; },
			split(str) {
				return (sep, lim) => {
					sep = sep || "";
					if (typeof sep !== "string") throw "Expected string argument";
					if (lim && typeof lim !== "number") throw "Expected number argument";
					return str.split(sep, lim);
				};
			},
			reverse(str) {
				return str.split("").reverse().join("");
			},
			format(str) {
				return obj => {
					newStr = "";
					for (var i = 0, j; i < str.length; i++) {
						j = i;
						if (str[i] === "#") {
                            j++;
                            var name = "";
                            var value = "";
                            if (str[j] === "(") {
								while (str[++j] !== ")") name += str[j];
							} else {
								name = str[j];
							}
                            if (!obj.hasOwnProperty(name)) {
								newStr += str[i];
								continue;
							}
                            var match = obj[name];
                            j++;
                            if (str[j] === "{") {
								while (str[++j] !== "}") value += str[j];
								j++;
							}
                            if (typeof match === "function") match = f(match, [value]);
                            newStr += p(match, "toString");
                            i = j - 1;
                            continue;
                        }
						newStr += str[i];
					}
					return newStr;
				};
			}
		},
		number: {
			toString(n) { return n + ""; },
			floor(n) { return Math.floor(n); },
			ceil(n) { return Math.ceil(n); }
		},
		boolean: {
			toString(bl) { return bl.toString(); }
		},
		"function": {
			toString(fn) { return "_function_"; }
		},
		"_nil": {
			toString() { return "nil"; }
		}
	};

	for (var i in library) {
		if (!library.hasOwnProperty(i)) continue;
		library[i] = serialize(library[i]);
	}
	return library;
}))();