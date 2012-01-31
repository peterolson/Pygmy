var concatObjects = function(a, b){
    for(var i in b){
        if(!b.hasOwnProperty(i)) continue;
        a[i] = b[i];
    }
};

var lexer = function (tokens, scope) {
    if(!scope) {
        scope = {
            localScope: {},
            parentScope: {},
            type: "global"
        };
    }
    var scoping = {
        define: function(name, mutable, type) {
            scope.localScope[name] = mutable ? returnTypes.unknown : type;
        },
        isDefined: function(name) {
            return name in scope.localScope || name in scope.parentScope;
        },
        find: function(name) {
            return scope.localScope[name] || scope.parentScope[name];
        },
        newScope: function(scope) {
            var newScope = {
                localScope: {},
                parentScope: {}
            };
            for(var i in scope) {
                for(var j in scope[i]){
                    newScope.parentScope[j] = scope[i][j];
                }
            }
            return newScope;
        },
        newFunction: function(scope) {
            var newScope = scoping.newScope(scope);
            newScope.localScope["this"] = "object";
            newScope.type = "function";
            return newScope;
        },
        newObject: function(scope) {
            var newScope = scoping.newScope(scope);
            newScope.type = "object";
            return newScope;
        },
        isGlobal: function(scope) {
            return scope.type === "global";
        },
        isObject: function(scope) {
            return scope.type === "object";
        },
        isFunction: function(scope) {
            return scope.type === "function";
        }
    };
    
    var contains = function (arr, elem) {
        for (var i = 0; i < arr.length; i++) if (arr[i] === elem) return true;
        return false;
    }, traverseTokens = function (token, fn) {
        if (!(token instanceof Array)) token = [token];
        for (var i = tokens.length - 1; i >= 0; i--) {
            if (contains(token, tokens[i].value)) {
                fn(tokens[i], i);
                if (i >= tokens.length) i = tokens.length - 1;
            }
        }
    },
    findMatchingDelimiter = function (token, match, index) {
        var balance = 1;
        var advancement = 1;
        while (balance > 0) {
            index += advancement;
            if (index >= tokens.length || index < 0) {
                error(token, "Unmatched delimiter: " + token);
            }
            if (tokens[index].value === token) {
                balance++;
            }
            else if (tokens[index].value === match) {
                balance--;
            }
        }
        return index;
    }, createFunction = function(value){
        return function(){
          return value;
        };
    };
    
    var returnTypes = {
        string: "string",
        number: "number",
        array: "array",
        object: "object",
        boolean: "boolean",
        "function": "function",
        nil: "nil",
        unknown: "unknown"
    };
    
    var getType = function (obj) {
        if(returnTypes[obj.type]) return obj.type;
        if(obj.returnType) return obj.returnType;
        return returnTypes.unknown;
    }, typesMatch = function(type, str){
        if(str === "_" || type === returnTypes.unknown) return true;
        return type === str;
    };


    var parseExpressions = function (tokens) {
        var symbols = {}, index = 0, token = tokens[index];
        
        var symbol = function(id, bindingPower) {
            return symbols[id] || (symbols[id] = {
                bindingPower: bindingPower,
                nud: function(){
                    error(tokens[index], "Unrecognized or invalid token: " + tokens[index].value);
                },
                led: function(){
                    error(tokens[index], "Unrecognized or invalid token: " + tokens[index].value);
                }
            });
        };

        var advance = function (expectedToken) {
            if(expectedToken && tokens[index + 1].value !== expectedToken){
                error(tokens[index + 1], "Expected token: " + expectedToken);
            }
            token = tokens[++index];
        };

        var expression = function (bindingPower) {
            var left, t = token;
            advance();
            if(typeof t.nud !== "function") error(token, "Unexpected token: " + t.value);
            left = t.nud();
            while(true){
                if(!token || token.type === "(end)") break;
                if(token.led && token.led.bindingPower){
                    token.bindingPower = token.led.bindingPower;
                }
                if(bindingPower > token.bindingPower) break;
                t = token;
                if(typeof t.led !== "function") break;
                advance();
                left = t.led(left, t.bindingPower);
            }
            return left;
        };
        
        var nfx = function(id, bp, bp2, fn){
            var s = symbol(id, bp);
            s.led = fn || function(left){
                var obj = {
                    id: id,
                    first: left,
                    second: expression(bp2)
                };
                obj.returnType = s.check ? s.check(obj) : returnTypes.unkown;
                return obj;
            };
            s.led.bindingPower = bp;
            return s;    
        }, infixr = function (id, bindingPower, fn) {
            return nfx(id, bindingPower, bindingPower, fn);
        }, infix = function (id, bindingPower, fn) {
            return nfx(id, bindingPower, bindingPower + 1, fn);
        }, suffix = function (id, bindingPower, fn) {
            return infixr(id, bindingPower, (fn ||
                function(left){
                    return {
                        id: id,
                        first: left
                    };
                })
            );
        }, prefix = function (id, fn) {
            var s = symbol(id, 0);
            s.nud = fn || function(){
                var obj = {
                    id: id,
                    first: expression(90)
                };
                obj.returnType = s.check ? s.check(obj) : returnTypes.unkown;
                return obj;
            };
            return s;
        };
        
        var checkType = function(token, id, matches, arr){
            var allUnknown = true;
            for(var i = 0; i < matches.length; i++) {
                matches[i] = getType(matches[i]);
                if(matches[i] !== returnTypes.unknown) allUnknown = false;
            }
            if(allUnknown) return returnTypes.unknown;
            for(i = 0; i < arr.length; i++){
                var allMatch = true;
                for(var j = 0; j < matches.length; j++){
                    if(!typesMatch(matches[j], arr[i][j])){
                        allMatch = false;
                        break;
                    }
                }
                if(allMatch) return arr[i][arr[i].length - 1];
            }
            error(token, "The " + id + " operator does not support operands of type '" + matches.join(" ") + "'");
        }, check = function(arr) {
            if(typeof arr === "function") return function(obj) {
                return arr(obj);
            };
            return function(obj) {
                var matches = [obj.first];
                if(obj.second) matches.push(obj.second);
                var id = obj.id;
                return checkType(obj, id, matches, arr);
            };
        };

        infix(".", 100).check = check(function(obj){
            var right = obj.second;
            if(!(right.type === "identifier" ||
            right.type === "string" ||
            right.type === "number")) {
                error(obj, "Invalid property value");  
            }
            return returnTypes.unknown;
        });
        
        prefix("!").check = check(
            ["boolean", "boolean"]);
        prefix("-").check = check(
            ["number", "number"]);
        prefix("~");
        prefix("`").check = check(
            ["_", "function"]);
        
        infixr("^", 85).check = check(
            [["number", "number", "number"],
            ["array", "function", "array"],
            ["object", "function", "object"]]);
        
        infix("*", 80).check = check(
            [["number", "number", "number"],
            ["function", "function", "function"],
            ["function", "array", "unkown"]]);
        infix("/", 80).check = check(
            [["number", "number", "number"]]);
        infix("%", 80).check = check(
            [["number", "number", "number"]]);
        
        infix("+", 70).check = check(
            [["number", "number", "number"],
            ["array", "function"],
            ["_", "function"]]);
        infix("-", 70).check = check(
            [["number", "number", "number"]]);
        
        infix("&", 60).check = check(
            [["array", "_", "array"],
            ["_", "array", "array"],
            ["string", "string", "string"],
            ["string", "number", "string"],
            ["number", "string", "string"],
            ["object", "object", "object"]]);
        
        suffix("!", 55, function(left) {
            return {
                id: "call",
                value: left,
                args: []
            };
        });
        infix("|", 53, function(left, bp) {
            var args = [expression(bp)];
            while(token.value === ",") {
                advance();
                args.push(expression(bp));
            }
            return {
                id: "call",
                value: left,
                args: args
            };
        });
        
        var infixArgs = function(args) {
             if(token.value === "|") {
                do {
                advance();
                args.push(expression(49));
                } while(token.value === ",");
            }
        };
        
        infixr("\\", 50, function(left) {
            var args = [left];
            var value = expression(54);
            infixArgs(args);
            return {
                id: "call",
                value: value,
                args: args
            };
        });
        
        infix(",", 48, function(left) {
            var args = [left, expression(52)];
            while(token.value === ",") {
                advance();
                args.push(expression(52));
            }
            if(token.value !== "\\") error(token, "Expected token: \\");
            advance();
            var value = expression(54);
            infixArgs(args);
            return {
                id: "call",
                value: value,
                args: args
            };
        });
        
        infix(">", 45).check = check(
            [["number", "number", "boolean"],
            ["string", "string", "boolean"]]);
        infix(">=", 45).check = check(
            [["number", "number", "boolean"],
            ["string", "string", "boolean"]]);
        infix("<", 45).check = check(
            [["number", "number", "boolean"],
            ["string", "string", "boolean"]]);
        infix("<=", 45).check = check(
            [["number", "number", "boolean"],
            ["string", "string", "boolean"]]);
        
        infix("=", 40).check = check(
            [["_", "_", "boolean"]]);
        infix("!=", 40).check = check(
            [["_", "_", "boolean"]]);
        
        infixr("&&", 35).check = check(
            [["boolean", "boolean", "boolean"]]);
        
        infixr("^^", 30).check = check(
            [["boolean", "boolean", "boolean"]]);
        
        infixr("||", 25).check = check(
            [["boolean", "boolean", "boolean"]]);
        
        infixr(":", 15);
        infixr("~:", 15);
        infixr("!:", 15);
        
        infixr("::", 10);
        infixr("!::", 10);
        
        var assigns = [":", "~:"], binaryOps = ["&", "+", "-", "*", "/", "%", "^"];
        for(var i = 0; i < assigns.length; i++){
            var asgn = assigns[i];
            for(var j = 0; j < binaryOps.length; j++){
                var op = binaryOps[j];
                infixr(asgn + op, 20);
                infixr(op + asgn, 20);
            }
        }
        
        infix("=>", 5);
        
        for(i = 0; i < tokens.length; i++){
            var t = tokens[i];
            if(t.type !== "operator") {
                t.bindingPower = 0;
                t.nud = createFunction(t);
            } else {
                concatObjects(t, symbols[t.value]);
            }
        }
        
        for(i = 0; i < tokens.length; i = ++index){
            token = tokens[i];
            var value = expression(tokens[i].bindingPower);
            tokens.splice(i, index - i, value);
            index -= index - i;
        }

        return tokens;
    };

    traverseTokens("{", function (token, index) {
        var match = findMatchingDelimiter("{", "}", index);
        if (tokens[index - 1].value === ")" && tokens[index].line === tokens[index - 1].line) {
            var args = [], j = 1;
            while (tokens[index - ++j].value !== "(") {
                var arg = tokens[index - j];
                if (arg.type !== "identifier") error(tokens[index - j], "Function parameters must be identifiers.");
                args.unshift(arg.value);
            }
            tokens.splice(index - j, j + (match - index) + 1, {
                type: "function",
                literal: true,
                arguments: args,
                value: lexer(tokens.slice(index + 1, match), scoping.newFunction(scope))
            });
        } else {
            tokens.splice(index, (match - index) + 1, {
                type: "object",
                literal: true,
                value: lexer(tokens.slice(index + 1, match), scoping.newObject(scope))
            });
        }
    });

    traverseTokens("[", function (token, index) {
        var match = findMatchingDelimiter("[", "]", index);
        tokens.splice(index, (match - index) + 1, {
            type: "array",
            literal: true,
            value: parseExpressions(tokens.slice(index + 1, match))
        });
    });

    traverseTokens("(", function (token, index) {
        var match = findMatchingDelimiter("(", ")", index);
        var value = parseExpressions(tokens.slice(index + 1, match));
        if (value.length > 1) error(token, "Only one expression allowed inside parentheses.");
        value = value[0];
        tokens.splice(index, (match - index) + 1, {
            type: "parenthetic",
            literal: true,
            value: value,
            returnType: getType(value)
        });
    });

    return parseExpressions(tokens);
};