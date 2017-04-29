if (!String.prototype.quote) {
    String.prototype.quote = function () {
        var c;
        var i;
        var l = this.length;
        var o = '"';
        for (i = 0; i < l; i += 1) {
			c = this.charAt(i);
			if (c >= ' ') {
				if (c === '\\' || c === '"') {
					o += '\\';
				}
				o += c;
			} else {
				switch (c) {
				case '\b':
					o += '\\b';
					break;
				case '\f':
					o += '\\f';
					break;
				case '\n':
					o += '\\n';
					break;
				case '\r':
					o += '\\r';
					break;
				case '\t':
					o += '\\t';
					break;
				default:
					c = c.charCodeAt();
					o += '\\u00' + Math.floor(c / 16).toString(16) +
						(c % 16).toString(16);
				}
			}
		}
        return o + '"';
    };
}

var compile = (expressions, language, scope) => {
    var counter = -1;
    var fCounter = -1;
    return (function compile(expressions, language, scope) {

		var compose = name => (first, second) => write.compose(name, first, second);

		var codes = {
			javascript: {
				nil() { return "undefined"; },
				compose(name, first, second) { return name + "(" + first + (second ? "," + second : "") + ")"; },
				empty() { return ""; },
				statement(stmt) { return stmt + ";"; },
				identifier(name) { return "n(" + name + ",sc)"; },
				string(value) { return value.quote(); },
				number(number) { return number.toString(); },
				parenthetic(expr) { return "(" + expr + ")"; },
				argName(n) { return "$" + n; },
				"function": function (id, args, body, ret) {
					return "((function(){var " + write.argName(id) + "=scS.slice();return function(args,self){var sc=y(1," + write.argName(id) + ",[" + args.join(",") + "]," + write.string(write.argName(id)) + ",args,self);" + body + "var rt=" + ret + "return y(),rt}})())";
				},
				call(fn, args) { return "f(" + fn + "," + write.array(args) + ")"; },
				array(arr) { return "[" + arr.join(",") + "]"; },
				object(obj, id) { return "((function(){var " + write.argName(id) + "=scS.slice();return (function(){var sc=y(2," + write.argName(id) + ");" + obj + "return y();})()})())"; },
				assign(name, value, settings, properties) { return "z(" + name + ",sc," + value + "," + settings + (properties.length ? "," + properties.join(",") : "") + ")"; },
				compoundAssign(name, value, settings, compound, properties) {
                    var op = write[compound.op];
                    var self = write.identifier(name);
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
				"`": function (first) { return "th(function(){return " + first + ";})"; },
				"=>": function (cond, expr) { return "if(" + cond + "){var rt=" + expr + ";return y(),rt}"; }
			}
		};

		var passThunk = false;
		var expressionWrappers = {
			javascript(x) {
				return "X(" + x + (passThunk ? ",true" : "") + ")";
			}
		};

		var write = codes[language];
		var expressionWrapper = expressionWrappers[language];

		scope = scope || {
			type: "global",
			current: ((() => {
				var obj = {};
				for (var z in lib) {
					if (!lib.hasOwnProperty(z)) continue;
					obj[z] = write.string(z);
				}
				return obj;
			}))(),
			parent: {},
			args: {},
			pArgs: {}
		};
		scope.newScope = (type, args) => {
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
				args.map((arg, i) => { newScope.args[arg] = [write.argName(fCounter), i]; });
			}
			for (var arg in scope.args) newScope.pArgs[arg] = scope.args[arg];
			for (var name in scope.current) {
				if (!scope.current.hasOwnProperty(name)) continue;
				if (newScope.pArgs[name]) delete scope.pArgs[name];
				newScope.parent[name] = scope.current[name];
			}
			return newScope;
		};
		scope.id = fCounter;

		var parseNode = node => {
			var ret;
			if (node.type === "identifier")
				ret = write.identifier(write.string(node.value));
			else if (node.type === "string")
				ret = write.string(node.value);
			else if (node.type === "number")
				ret = write.number(node.value);
			else if (node.type === "parenthetic")
				ret = write.parenthetic(parseNode(node.value));
			else if (node.type === "function") {
                var args = node["arguments"];
                var nsc = scope.newScope("function", args);
                var id = fCounter;
                var statements = compile(node.value, language, nsc);
                var ret = write.nil();
                if (statements.length) {
					ret = statements.slice(-1)[0];
					statements = statements.slice(0, -1);
				}
                args = args.map(arg => write.string(arg));
                ret = write["function"](id, args, statements.join(""), ret);
            }
			else if (node.id === "call") {
				passThunk = true;
				ret = write.call(parseNode(node.value), node.args.map(x => { passThunk = true; return parseNode(x); }));
				passThunk = false;
			}
			else if (node.type === "array")
				ret = write.array(node.value.map(x => parseNode(x)));
			else if (node.type === "object") {
				var nsc = scope.newScope("object");
				var id = fCounter;
				ret = write.object(compile(node.value, language, nsc), fCounter);
			}
			else if (node.assignment) {
                var mutability = node.mutability;
                var local = node.local << 0;
                var enumerable = node.enumerable << 1;
                mutability = (mutability === "mutable" ? 0 : 1) << 2;
                var settings = local | enumerable | mutability;
                var properties = node.properties || [];
                for (var i = 0; i < properties.length; i++) {
					properties[i] = typeof properties[i].value === "string" ? write.string(properties[i].value) : parseNode(properties[i]);
				}

                var name = node.first.value;

                if (node.mutability === "reference") name = node.first.first.value;

                passThunk = true;
                var value = parseNode(node.second);
                if (node.mutability === "reference") value = write["`"](value);
                name = write.string(name);

                if (node.compound)
					ret = write.compoundAssign(name, value, settings, node.compound, properties);
				else ret = write.assign(name, value, settings, properties);
                passThunk = false;
            }
			else if (node.id === ".")
				ret = write["."](parseNode(node.first), (node.second.type === "parenthetic" || node.second.type === "number") ? parseNode(node.second) : write.string(node.second.value.toString()));
			else if (node.second) {
				passThunk = false;
				ret = write[node.id](parseNode(node.first), parseNode(node.second));
			}
			else if (node.first) {
				var shouldPass = passThunk && node.id === "`";
				passThunk = shouldPass;
				ret = write[node.id](parseNode(node.first));
				passThunk = shouldPass;
			}
			else ret = write.nil();
			if (node.id === "=>") return ret;
			return expressionWrapper(ret);
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