var compile = function(expressions, language) {
    
    
    var compose  = function(name) {
        return function(first, second) {
            return write.compose(name, first, second);
        };
    };
    
    var codes = {
        javascript: {
            compose: function(name, first, second) { return name + "(" + first + (second ? "," + second : "") + ")"; },
            empty: function() { return ""; },
            statement: function(stmt) { return stmt + ";"; },
            identifier: function(name){ return "i('" + name + "')";  },
            string: function(value){ return '"' + value.replace(/"/g, '\\\"') + '"'; },
            number: function(number) { return number.toString(); },
            parenthetic: function(expr) { return "(" + expr + ")"; },
            "function": function(args, body) { return "(function(" + args.map(function(x){ return x.value; }).join(",") + "){" + body + "})"; },
            call: function(fn, args) { return "f(" + fn + ",[" + args.join(",") + "])"; },
            array: function(arr) { return "[" + arr.join(",") + "]"; },
            object: function(obj) { return "(function(){" + obj + "})"; },
            assign: function(name, value) { return "z('" + name + "'," + value + ")" },
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
            "^^": compose("xo")
        }
    };
    
    var write = codes[language];

    var parseNode = function(node) {
        if(node.type === "identifier")
            return write.identifier(node.value);
        if(node.type === "string")
            return write.string(node.value);
        if(node.type === "number")
            return write.number(node.value);
        if(node.type === "parenthetic")
            return write.parenthetic(parseNode(node.value));
        if(node.type === "function")
            return write["function"](node["arguments"], compile(node.value, language));
        if(node.id === "call")
            return write.call(parseNode(node.value), node.args.map(function(x){ return parseNode(x); }));
        if(node.type === "array")
            return write.array(node.value.map(function(x){ return parseNode(x); }));
        if(node.type === "object")
            return write.object(compile(node.value, language));
        if(node.assignment) {
            return write.assign(node.first.value, parseNode(node.second));
        }
        if(node.second)
            return write[node.id](parseNode(node.first), parseNode(node.second));
        if(node.first)
            return write[node.id](parseNode(node.first));
    };
    
    var output = [write.empty()];
    for(var i = 0; i < expressions.length; i++) {
        output.push(write.statement(parseNode(expressions[i])));
    }
    return output.slice(1).join("");
};