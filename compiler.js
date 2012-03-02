var compile = function (expressions, language, scope) {
	var counter = -1, fCounter = -1;
	return (function compile(expressions, language, scope) {
		scope = scope || {
			type: "global",
			current: {},
			parent: {},
			args: {},
			pArgs: {}
		};
		scope.assign = function (name, local) {
			if (name in scope.args || (name in scope.pArgs && !local)) return scope.find(name);
			if (name in scope.current) return scope.current[name];
			if (name in scope.parent && !local) return scope.parent[name];
			scope.current[name] = ++counter;
			if (scope.pArgs[name]) delete scope.pArgs[name];
			return counter;
		};
		scope.find = function (name) {
			var v = name in scope.args ? scope.args[name] : name in scope.pArgs ? scope.pArgs[name] : null;
			if (v) return write.array(v);
			v = name in scope.current ? scope.current[name] :
                name in scope.parent ? scope.parent[name] : 
                write.string(name);
			return v;
		};
		scope.newScope = function (type, args) {
			fCounter++;
			var newScope = {};
			for (var i in scope) {
				if (!scope.hasOwnProperty(i)) continue;
				newScope[i] = scope[i];
			}
			newScope.current = {};
			newScope.args = {};
			newScope.type = type;
			newScope.id = fCounter;
			if (args) {
				args.map(function (arg, i) { newScope.args[arg] = [write.argName(fCounter), i]; });
				for (var arg in scope.args) newScope.pArgs[arg] = scope.args[arg];
			}
			for (var name in scope.current) {
				if (!scope.current.hasOwnProperty(name)) continue;
				if (newScope.pArgs[name]) delete scope.pArgs[name];
				newScope.parent[name] = scope.current[name];
			}
			return newScope;
		};
		scope.id = fCounter;

		var compose = function (name) {
			return function (first, second) {
				return write.compose(name, first, second);
			};
		};

		var codes = {
			javascript: {
				nil: function () { return "undefined"; },
				compose: function (name, first, second) { return name + "(" + first + (second ? "," + second : "") + ")"; },
				empty: function () { return ""; },
				statement: function (stmt) { return stmt + ";"; },
				identifier: function (name) { return "n(" + name + ")"; },
				string: function (value) { return '"' + value.replace(/"/g, '\\\"') + '"'; },
				number: function (number) { return number.toString(); },
				parenthetic: function (expr) { return "(" + expr + ")"; },
				argName: function (n) { return "$" + n; },
				argValue: function (n, index) { return write.argName(n) + "[" + index + "]"; },
				"function": function (args, body, ret) {
					return "(function(" + write.argName(fCounter) + ",self){y('f',[" + args.join(",") + "]," + write.argName(fCounter) + ",self);"
                        + body + "var rt=" + ret + "return y(),rt})";
				},
				call: function (fn, args) { return "f(" + fn + "," + write.array(args) + ")"; },
				array: function (arr) { return "[" + arr.join(",") + "]"; },
				object: function (obj) { return "(function(){y('o');" + obj + "return y();})()"; },
				assign: function (name, value, settings, properties) { return "z(" + name + "," + value + "," + settings + (properties.length ? "," + properties.join(",") : "") + ")" },
				compoundAssign: function (name, value, settings, compound, properties) {
					var op = write[compound.op], self = write.identifier(name);
					if (properties.length)
						for (var i = 0; i < properties.length; i++)
							self = write["."](self, properties[i]);
					if (compound.opFirst)
						return write.assign(name, op(self, value), settings, properties);
					return write.assign(name, op(value, self), settings, properties);
				},
				"+": compose("a"),
				"-": compose("s"),
				"*": compose("m"),
				"/": compose("d"),
				"%": compose("r"),
				"^": compose("e"),
				"&": compose("c"),
				".": compose("p"),
				"=": compose("q"),
				"!=": compose("nq"),
				">": compose("g"),
				"<": compose("l"),
				">=": compose("ge"),
				"<=": compose("le"),
				"!": function (a) { return "!b(" + a + ")"; },
				"&&": function (a, b) { return "(b(" + a + ")&&b(" + b + "))"; },
				"||": function (a, b) { return "(b(" + a + ")||b(" + b + "))"; },
				"^^": function (a, b) { return "(b(" + a + ")?!b(" + b + "):b(" + b + "))"; },
				"`": function (first) { return "(function(){return " + first + ";})"; },
				"=>": function (cond, expr) { return "if(" + cond + "){var ret=" + expr + ";return y(),ret}"; }
			}
		};

		var write = codes[language];

		var parseNode = function (node) {
			if (node.type === "identifier")
				return write.identifier(scope.find(node.value));
			if (node.type === "string")
				return write.string(node.value);
			if (node.type === "number")
				return write.number(node.value);
			if (node.type === "parenthetic")
				return write.parenthetic(parseNode(node.value));
			if (node.type === "function") {
				var args = node["arguments"];
				var statements = compile(node.value, language, scope.newScope("function", args)), ret = write.nil();
				if (statements.length) {
					ret = statements.slice(-1)[0];
					statements = statements.slice(0, -1);
				}
				args = args.map(function (arg) { return write.string(arg); });
				return write["function"](args, statements.join(""), ret);
			}
			if (node.id === "call")
				return write.call(parseNode(node.value), node.args.map(function (x) { return parseNode(x); }));
			if (node.type === "array")
				return write.array(node.value.map(function (x) { return parseNode(x); }));
			if (node.type === "object")
				return write.object(compile(node.value, language, scope.newScope("object")));
			if (node.assignment) {
				var mutability = node.mutability,
                local = node.local << 0,
                enumerable = node.enumerable << 1;
				mutability = (mutability === "mutable" ? 0 : mutability === "immutable" ? 1 : 2) << 2;
				var settings = local | enumerable | mutability;
				var properties = node.properties || [];
				for (var i = 0; i < properties.length; i++) {
					properties[i] = typeof properties[i].value === "string" ? write.string(properties[i].value) : parseNode(properties[i]);
				}
                
                var name = node.first.value;
				
				if (node.mutability === "reference") name = node.first.first.value;
                
                var value, isFunction = node.second.type === "function";
                var parseValue = function() {
                    value = parseNode(node.second);
			        if(node.mutability === "reference") value = write["`"](value);
                };
                
				if(!isFunction) parseValue();
				name = scope.assign(name, local);
                if(isFunction) parseValue();
                
				if (node.compound)
					return write.compoundAssign(name, value, settings, node.compound, properties);
				return write.assign(name, value, settings, properties);
			}
			if (node.id === ".")
				return write["."](parseNode(node.first), node.second.type === "parenthetic" ? parseNode(node.second) : write.string(node.second.value.toString()));
			if (node.second)
				return write[node.id](parseNode(node.first), parseNode(node.second));
			if (node.first)
				return write[node.id](parseNode(node.first));
			return write.nil();
		};

		var output = [write.empty()];
		for (var i = 0; i < expressions.length; i++) {
			output.push(write.statement(parseNode(expressions[i])));
		}
		output = output.slice(1);
		if (scope.type === "function") return output;
		return output.join("");
	})(expressions, language, scope);
};