(function () {
	(function scoping() {
		var scope = {
			parent: {},
			current: {},
			type: "global"
		}, scopeStack = [scope];
		var vars = [];
        var cVar = function(v) {
            return {
                value: v,
                mutability: 1,
                enumerable: 1
            };
        };

		for (var fnc in lib) {
			scope.current[fnc] = cVar(lib[fnc]);
		}

		y = function (type, args, values, self) {
			if (type) {
				var newScope = {
					parent: {},
					current: {},
					type: type
				};
				var i;
				for (i in scope.parent)
					newScope.parent[i] = scope.parent[i];
				for (i in scope.current)
					newScope.parent[i] = scope.current[i];
				if (type === "f") {
					newScope.current["this"] = cVar({
						"arguments": cVar(values || []),
						"function": cVar(self)
					});
					for (i = 0; i < args.length; i++) {
						var name = args[i], value = values[i];
						newScope.current[name] = value;
					}
				}
				scope = newScope;
				scopeStack.push(scope);
			} else {
				var obj = scopeStack.pop();
				scope = scopeStack[scopeStack.length - 1];
				if (obj.type === "o") return obj.current;
			}
		};

		n = function (name) {
			var value;
			if (typeof name === "number") value = vars[name];
			if (name instanceof Array) value = name[0][name[1]];
			else if (name in scope.current) value = scope.current[name];
			else if (name in scope.parent) value = scope.parent[name];
			if (value) {
				if (value.mutability === 2) return value.value();
				return value.value;
			}
			throw "Unrecognized variable: " + name;
		};

		z = function (name, value, settings, properties) {
			var local = settings & 1,
                enumerable = settings & 2,
                mutablility = settings >> 2;
			value = {
				value: value,
				mutability: mutablility,
				enumerable: enumerable
			};
			if (properties) {
				var obj = n(name);
                if(obj instanceof Array) value = value.value;
				if (!(properties instanceof Array)) properties = [properties];
				for (var i = 0; i < properties.length - 1; i++) {
					obj = obj ? obj[properties[i]] : null;
					if (!obj) throw name + "." + properties.slice(0, i).join(".") + " does not exist.";
					if (obj.mutability !== 0) throw properties[i] + " cannot be in the property chain of an assignment because it is an immutable property.";
					obj = obj.value;
				}
				obj[properties[properties.length - 1]] = value;
			}
			else if (typeof name === "number") vars[name] = value;
			else if (name instanceof Array) name[0][name[1]] = value;
			else if (local) scope.current[name] = value;
			else scope.parent[name] = value;
		};

		f = function (fn, args) {
			return fn(args.map(function(value) {
                return {
                    value: value,
                    mutability: 1,
                    enumerable: 1
                };
            }), fn);
		};
	})();

	(function operators() {
		var type = function (a) {
			var t = typeof a;
            if(a === null || t === "undefined") return "nil";
			if (a instanceof Array) return "array";
			return t;
		}, match = function (args, types) {
			for (var i = 0; i < types.length; i++) {
				if (!types[i]) continue;
				if (type(args[i]) !== types[i]) return false;
			}
			return true;
		}, typeError = function (operator, args) {
			throw "Operator '" + operator + "' cannot handle arguments of type '" + args.join(" ") + "'";
		};

		(function concatenation() {
			c = function (a, b) {
				var args = [a, b];
				if (match(args, ["string", "string"])) return a + b;
				if (match(args, ["string", "number"])) return a + b;
				if (match(args, ["number", "string"])) return a + b;
				if (match(args, ["array", "array"])) return a.concat(b);
				if (match(args, ["array", 0])) return a.concat(b);
				if (match(args, [0, "array"])) return [].concat(a, b);
				if (match(args, ["object", "object"])) {
					var c = {};
					for (var i in b) c[i] = b[i];
					for (var i in a) c[i] = a[i];
					return c;
				}
				typeError("&", args);
			};
		})();
		(function arithmetic() {
			a = function (a, b) {
				var args = [a, b];
				if (match(args, ["number", "number"])) return a + b;
				if (match(args, ["array", "function"])) return function (args) { return b(a.concat(args), b); };
				if (match(args, [0, "function"])) return function (args) { return b([].concat(a, args), b); };
				typeError("+", args);
			};

			s = function (a, b) {
				var args = [a, b];
				if (match(args, ["number", "number"])) return a - b;
				if (match(args, ["number"])) return -a;
				typeError("-", args);
			};

			m = function (a, b) {
				var args = [a, b];
				if (match(args, ["number", "number"])) return a * b;
				if (match(args, ["function", "function"])) return function (args) { return f(a, f(b, args));; };
				if (match(args, ["function", "array"])) return f(a, b);
				typeError("*", args);
			};

			d = function (a, b) {
				var args = [a, b];
				if (match(args, ["number", "number"])) return a / b;
				typeError("/", args);
			};

			r = function (a, b) {
				var args = [a, b];
				if (match(args, ["number", "number"])) return a % b;
				typeError("/", args);
			};

			e = function (a, b) {
				var args = [a, b];
				if (match(args, ["number", "number"])) return Math.pow(a, b);
				if (match(args, ["array", "function"])) {
					var arr = [];
					for (var i in a) {
						arr[i] = f(b, [a[i], i, a]);
					}
					return arr;
				}
				if (match(args, ["object", "function"])) {
					var obj = {};
					for (var i in a) {
						obj[i] = f(b, [a[i], i, a]);
					}
					return obj;
				}
				typeError("^", args);
			};
		})();
		(function comparison() {

			q = function (a, b) {
				return a === b;
			};

			nq = function (a, b) {
				return a !== b;
			};

			g = function (a, b) {
				var args = [a, b];
				if (match(args, ["number", "number"])) return a > b;
				if (match(args, ["string", "string"])) return a > b;
				typeError(">", args);
			};

			ge = function (a, b) {
				var args = [a, b];
				if (match(args, ["number", "number"])) return a >= b;
				if (match(args, ["string", "string"])) return a >= b;
				typeError(">=", args);
			};

			l = function (a, b) {
				var args = [a, b];
				if (match(args, ["number", "number"])) return a < b;
				if (match(args, ["string", "string"])) return a < b;
				typeError("<", args);
			};

			le = function (a, b) {
				var args = [a, b];
				if (match(args, ["number", "number"])) return a <= b;
				if (match(args, ["string", "string"])) return a <= b;
				typeError("<=", args);
			};

		})();
		(function logic() {

			b = function (a) {
				if (typeof a !== "boolean") throw "Expected boolean but encountered " + typeof a;
				return a;
			};

		})();

		(function miscellaneous() {

			p = function (a, b) {
				if (a.hasOwnProperty(b)) { 
                    if(type(a) === "object") return a[b].value;
                    return a[b];
				}
                var prototypeFn = lib[type(a)].value[b];
                if(prototypeFn){
                    return prototypeFn([a]);
                }
			};

		})();
	})();
})()