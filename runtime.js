(function () {
	(function scoping() {
		sc = {
		};
		scS = [sc];
		var cVar = function (v) {
			return {
				value: v,
				mutability: 1,
				enumerable: 1
			};
		};

		for (var fnc in lib) {
			sc[fnc] = cVar(lib[fnc]);
		}

		var old, recursion = [];

		y = function (type, stack, args, id, values, self) {
			if (type) {
				old = scS.slice();
				scS = stack;
				var newScope = {};
				if (type === 1) {
					newScope.id = id;
					newScope.arguments = cVar(values || []);
					newScope["this"] = cVar(self);
					for (i = 0; i < args.length; i++) newScope[args[i]] = values[i];
				}
				if (id === scS[scS.length - 1].id) {
					recursion.push(scS[scS.length - 1]);
					scS[scS.length - 1] = newScope;
				}
				else {
					scS.push(newScope);
				}
				return newScope;
			} else {
				var obj;
				if (recursion.length) {
					obj = scS[scS.length - 1];
					scS[scS.length - 1] = recursion.pop();
				}
				else {
					obj = scS.pop();
					scS = old.slice();
				}
				return obj;
			}
		};

		n = function (name, scope) {
			var value;
			if (scope.hasOwnProperty(name)) value = scope[name];
			else {
				for (var i = scS.length - 2; i >= 0; i--) {
					if (scS[i].hasOwnProperty(name)) {
						value = scS[i][name];
						break;
					}
				}
			}
			if (value) {
				if (value.mutability === 2) return value.value();
				return value.value;
			}
			throw "Unrecognized variable: " + name;
		};

		z = function (name, scope, value, settings, properties) {
			var local = settings & 1,
                enumerable = settings >> 1,
                mutablility = settings >> 2;
			value = {
				value: value,
				mutability: mutablility,
				enumerable: enumerable
			};
			if (properties) {
				var obj = n(name, scope);
				if (obj instanceof Array) value = value.value;
				if (!(properties instanceof Array)) properties = [properties];
				for (var i = 0; i < properties.length - 1; i++) {
					obj = obj ? obj[properties[i]] : null;
					if (!obj) throw name + "." + properties.slice(0, i).join(".") + " does not exist.";
					if (obj.mutability !== 0) throw properties[i] + " cannot be in the property chain of an assignment because it is an immutable property.";
					obj = obj.value;
				}
				obj[properties[properties.length - 1]] = value;
			}
			else {
				if (local) scope[name] = value;
				else {
					for (var i = scS.length - 2; i >= 0; i--) {
						if (scS[i].hasOwnProperty(name)) {
							scS[i][name] = value;
							break;
						}
					}
				}
			}
			return value.value;
		};

		f = function (fn, args) {
			return fn(args.map(function (value) {
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
			if (a === null || t === "undefined") return "_nil";
			if (a instanceof Array) return "array";
			return t;
		}, match = function (args, types) {
			for (var i = 0; i < types.length; i++) {
				if (!types[i]) continue;
				if (type(args[i]) !== types[i]) return false;
			}
			return true;
		}, typeError = function (operator, args) {
			throw "Operator '" + operator + "' cannot handle arguments of type '" + args.map(function (arg) { return type(arg); }).join(" ") + "'";
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
				if (match(args, ["function", "function"])) return function (args) { return f(a, f(b, args)); ; };
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
				var args = [a, b];
				if (match(args, ["array", "array"])) {
					if (a.length !== b.length) return false;
					for (var i = 0; i < a.length; i++) {
						if (!q(a[i], b[i])) return false;
					}
					return true;
				};
				return a === b;
			};

			nq = function (a, b) {
				return !q(a, b);
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
				var tA = type(a);
				if (b < 0 && (tA === "array" || tA === "string")) {
					b = a.length + b;
				}
				if (a && a.hasOwnProperty(b)) {
					if (tA === "object") {
						if (a[b].mutability === 2) return a[b].value();
						return a[b].value;
					}
					return a[b];
				}
				if (!lib[type(a)][b]) throw "Property '" + b + "' does not exist";
				var prototypeFn = lib[tA][b].value;
				if (prototypeFn) {
					return f(prototypeFn, [a]);
				}
			};

		})();
	})();
})()