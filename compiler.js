var compile = function (expressions, language) {


    var compose = function (name) {
        return function (first, second) {
            return write.compose(name, first, second);
        };
    };

    var codes = {
        javascript: {
            compose: function (name, first, second) { return name + "(" + first + (second ? "," + second : "") + ")"; },
            empty: function () { return ""; },
            statement: function (stmt) { return stmt + ";"; },
            identifier: function (name) { return "i(" + write.string(name) + ")"; },
            string: function (value) { return '"' + value.replace(/"/g, '\\\"') + '"'; },
            number: function (number) { return number.toString(); },
            parenthetic: function (expr) { return "(" + expr + ")"; },
            "function": function (args, body, ret) { return "(function(" + args.map(function (x) { return x.value; }).join(",") + "){y('f');" + body + "return y()," + ret + ";})"; },
            call: function (fn, args) { return "f(" + fn + ",[" + args.join(",") + "])"; },
            array: function (arr) { return "[" + arr.join(",") + "]"; },
            object: function (obj) { return "(function(){y('o');" + obj + "y();})"; },
            assign: function (name, value, settings, properties) { return "z(" + write.string(name) + "," + value + "," + settings + (properties.length ? "," + properties.join(",") : "") + ")" },
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
            "!": compose("n"),
            "&&": compose("nd"),
            "||": compose("or"),
            "^^": compose("xo"),
            "`": function (first) { return "(function(){return " + first + ";})"; },
            "=>": function (cond, expr) { return "if(" + cond + ")return " + expr; }
        }
    };

    var write = codes[language];

    var parseNode = function (node) {
        if (node.type === "identifier")
            return write.identifier(node.value);
        if (node.type === "string")
            return write.string(node.value);
        if (node.type === "number")
            return write.number(node.value);
        if (node.type === "parenthetic")
            return write.parenthetic(parseNode(node.value));
        if (node.type === "function") {
            var statements = compile(node.value, language), ret = "null";
            if (statements.length) {
                ret = statements.splice(-1);
                statements = statements.splice(0, -1);
            }
            return write["function"](node["arguments"], statements, ret);
        }
        if (node.id === "call")
            return write.call(parseNode(node.value), node.args.map(function (x) { return parseNode(x); }));
        if (node.type === "array")
            return write.array(node.value.map(function (x) { return parseNode(x); }));
        if (node.type === "object")
            return write.object(compile(node.value, language));
        if (node.assignment) {
            var mutability = node.mutability,
                local = node.local << 0,
                enumerable = node.enumerable << 1;
            mutability = (mutability === "mutable" ? 0 : mutability === "immutable" ? 1 : 2) << 2;
            var settings = local | enumerable | mutability;
            var name = node.first.value;
            var value = parseNode(node.second);
            if (node.mutability === "reference") {
                name = node.first.first.value;
                value = write["`"](value);
            }
            var properties = node.properties || [];
            for (var i = 0; i < properties.length; i++) {
                properties[i] = parseNode(properties[i]);
            }
            if (node.compound)
                return write.compoundAssign(name, value, settings, node.compound, properties);
            return write.assign(name, value, settings, properties);
        }
        if (node.id === ".")
            return write["."](parseNode(node.first), node.second.value);
        if (node.second)
            return write[node.id](parseNode(node.first), parseNode(node.second));
        if (node.first)
            return write[node.id](parseNode(node.first));
    };

    var output = [write.empty()];
    for (var i = 0; i < expressions.length; i++) {
        output.push(write.statement(parseNode(expressions[i])));
    }
    return output.slice(1).join("");
};