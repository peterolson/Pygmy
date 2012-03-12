var concatObjects = function(a, b){
    for(var i in b){
        if(!b.hasOwnProperty(i)) continue;
        a[i] = b[i];
    }
};

var parse = function (tokens, scope) {
    if (!scope) {
        scope = {
            localScope: {},
            parentScope: {},
            type: "global"
        };
        for (var z in lib) {
            if (!lib.hasOwnProperty(z)) continue;
            var type = typeof lib[z];
            scope.localScope[z] = {
                type: type,
                mutability: type === "function" ? "immutable" : "mutable"
            };
        }
    }
    var scoping = {
        define: function (name, mutability, type) {
            scope.localScope[name] = {
                type: mutability === "immutable" ? type : returnTypes.unknown,
                mutability: mutability
            };
        },
        isDefined: function (name) {
            return name in scope.localScope || name in scope.parentScope;
        },
        find: function (name) {
            return scope.localScope[name] || scope.parentScope[name];
        },
        scopeType: function (name) {
            if (name in scope.localScope) return "local";
            if (name in scope.parentScope) return "parent";
        },
        newScope: function (scope) {
            var newScope = {
                localScope: {},
                parentScope: {}
            };
            for (var i in scope) {
                for (var j in scope[i]) {
                    newScope.parentScope[j] = scope[i][j];
                }
            }
            return newScope;
        },
        newFunction: function (scope, args) {
            var newScope = scoping.newScope(scope);
            newScope.localScope["this"] = {
                type: "object",
                mutablility: "immutable"
            };
            for (var i = 0; i < args.length; i++) {
                newScope.localScope[args[i]] = {
                    type: "unknown",
                    mutability: "mutable"
                };
            }
            newScope.type = "function";
            return newScope;
        },
        newObject: function (scope) {
            var newScope = scoping.newScope(scope);
            newScope.type = "object";
            return newScope;
        },
        isGlobal: function (scope) {
            return scope.type === "global";
        },
        isObject: function (scope) {
            return scope.type === "object";
        },
        isFunction: function (scope) {
            return scope.type === "function";
        }
    };

    var createFunction = function (value) {
        return function () {
            return value;
        };
    };

    var returnTypes = {
        string: "string",
        number: "number",
        array: "array",
        object: "object",
        "boolean": "boolean",
        "function": "function",
        nil: "nil",
        unknown: "unknown"
    };

    var getType = function (obj) {
        if (obj.id === "~") error(obj, "References can only be used as l-values");
        if (obj.id === "=>") error(obj, "Return statements cannot be used inside of an expression");
        if (obj.type === "identifier") {
            var value = scoping.find(obj.value);
            if (!value) error(obj, "'" + obj.value + "': undeclared variable");
            else {
                return value.type;
            }
        }
        if (returnTypes[obj.type]) return obj.type;
        if (obj.returnType) return obj.returnType;
        return returnTypes.unknown;
    }, typesMatch = function (type, str) {
        if (str === "_" || type === returnTypes.unknown) return true;
        return type === str;
    };


    var parseExpressions = function (tokens) {
        tokens.push({ type: "(end)" });
        var symbols = {}, index = 0, token = tokens[index];

        var symbol = function (id, bindingPower) {
            return symbols[id] || (symbols[id] = {
                bindingPower: bindingPower
            });
        };

        var advance = function (expectedToken) {
            if (expectedToken && tokens[index + 1].value !== expectedToken) {
                error(tokens[index + 1], "Expected token: " + expectedToken);
            }
            token = tokens[++index];
        };

        var expression = function (bindingPower, stop) {
            var left, t = token;
            advance();
            if (typeof t.nud !== "function") error(token, "Unexpected token: " + t.value);
            left = t.nud();
            while (true) {
                if (!token || token.type === "(end)") break;
                if (token.led && token.led.bindingPower) {
                    token.bindingPower = token.led.bindingPower;
                }
                if (bindingPower > token.bindingPower || token.value === stop) break;
                t = token;
                if (typeof t.led !== "function") break;
                advance();
                left = t.led(left, t.bindingPower);
            }
            return left;
        };

        var nfx = function (id, bp, bp2, fn) {
            var s = symbol(id, bp);
            s.led = fn || function (left) {
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
                function (left) {
                    return {
                        id: id,
                        first: left
                    };
                })
            );
        }, prefix = function (id, bp, fn) {
            var s = symbol(id, 0);
            s.nud = fn || function () {
                var obj = {
                    id: id,
                    first: expression(bp || 90)
                };
                obj.returnType = s.check ? s.check(obj) : returnTypes.unkown;
                return obj;
            };
            return s;
        }, assignment = function (id, bp, obj, compound) {
            var s = symbol(id, bp);
            s.led = function (left) {
                var checkName = function (name, getLeft) {
                    var i;
                    var mutability = obj.mutability, properties;
                    if (name.id === ".") {
                        var prop = name;
                        properties = [];
                        while (prop.first) {
                            properties.unshift(prop.second);
                            prop = prop.first;
                        }
                        properties.unshift(prop);
                        name = properties.shift();
                    }
                    if (name.type !== "identifier" &&
                     name.id !== "~" &&
                     name.id !== "." &&
                     name.type !== "string") {
                        error(name, "Invalid l-value.");
                    }
                    for (i = 0; i < obj.checkLeft.length; i++) {
                        if (obj.checkLeft[i](name)) error(name, "Invalid l-value for " + id + " assignment operator");
                    }
                    var str = name;
                    if (name.id === "~") {
                        str = name.first;
                        mutability = "reference";
                    }
                    str = str.value;
                    if (getLeft) return [str, mutability, properties, name];
                    if(!properties) {
                        for (i = 0; i < obj.checkScope.length; i++) {
                            if (obj.checkScope[i](str)) error(name, "Scoping rules for " + id + " assignment operator prohibit this assignment.");
                        }
                    }
                    scoping.define(str, mutability, "unknown");
                };
                var assign = function (name, value) {
                    var n = checkName(name, "getLeft");
                    var str = n[0], mutability = n[1], properties = n[2], name = n[3];
                    var type = getType(value);
                    if (type === "function" && mutability !== "immutable" && !compound) error([name, value], "functions must be assigned immutably");
                    scoping.define(str, mutability, type);
                    return {
                        id: id,
                        assignment: true,
                        first: name,
                        second: value,
                        mutability: mutability,
                        enumberable: obj.enumerable,
                        local: obj.local,
                        compound: compound,
                        properties: properties
                    };
                };

                if (left.type === "array") {
                    left.value.map(function (v) { checkName(v); });
                    var right = expression(bp);
                    if (right.type !== "array" || left.value.length !== right.value.length) {
                        error([left, right], "Both sides of array assignment must be arrays of equal length.");
                    } else {
                        var arr = [], i;
                        for (i = 0; i < left.value.length; i++) {
                            arr.push(assign(left.value[i], right.value[i]));
                        }
                        return arr;
                    }
                } else {
                    checkName(left);
                    var right = expression(bp);
                    return assign(left, right);
                }
            };
            s.led.bindingPower = bp;
        };
        assignment.checks = {
            isLocal: function (name, left) {
                return scoping.scopeType(name) === "local";
            },
            isNotLocal: function (name) {
                return !assignment.checks.isLocal(name);
            },
            isReadonly: function (name) {
                return scoping.find(name).mutability !== "mutable";
            },
            isLocalReadonly: function (name) {
                return assignment.checks.isLocal(name) && assignment.checks.isReadonly(name);
            },
            isUndefined: function (name) {
                return !scoping.isDefined(name);
            },
            leftIsReference: function (left) {
                return left.id === "~";
            },
            leftIsProperty: function (left) {
                return left.id === ".";
            },
            isOutsideObjectScope: function () {
                return !scoping.isObject(scope);
            }
        };

        var checkType = function (token, id, matches, arr) {
            var allUnknown = true;
            for (var i = 0; i < matches.length; i++) {
                matches[i] = getType(matches[i]);
                if (matches[i] !== returnTypes.unknown) allUnknown = false;
            }
            if (allUnknown) return returnTypes.unknown;
            for (i = 0; i < arr.length; i++) {
                var allMatch = true;
                for (var j = 0; j < matches.length; j++) {
                    if (!typesMatch(matches[j], arr[i][j])) {
                        allMatch = false;
                        break;
                    }
                }
                if (allMatch) return arr[i][arr[i].length - 1];
            }
            error(token, "The " + id + " operator does not support operands of type '" + matches.join(" ") + "'");
        }, check = function (arr) {
            if (typeof arr === "function") return function (obj) {
                return arr(obj);
            };
            return function (obj) {
                var matches = [obj.first];
                if (obj.second) matches.push(obj.second);
                var id = obj.id;
                return checkType(obj, id, matches, arr);
            };
        };

        var findMatchingDelimiter = function (token, match, index) {
            var balance = 1;
            var start = index;

            while (balance > 0) {
                index++;
                if (index >= tokens.length || index < 0) {
                    error(tokens[start], "Unmatched delimiter: " + token);
                }
                if (tokens[index].value === token) {
                    balance++;
                }
                else if (tokens[index].value === match) {
                    balance--;
                }
            }
            return index;
        };
        prefix("(", 200, function () {
            index--;
            var close = findMatchingDelimiter("(", ")", index),
                end = tokens[close];
            var next = tokens[close + 1];
            if (next && next.value === "{" && next.line === end.line) {
                var args = [],
                    j = 0;
                while (index + (++j) < close) {
                    var arg = tokens[index + j];
                    if (arg.type !== "identifier") error(tokens[index + j], "Function parameters must be identifiers.");
                    args.push(arg.value);
                }
                var match = findMatchingDelimiter("{", "}", close + 1);
                var obj = {
                    type: "function",
                    "arguments": args,
                    value: parse(tokens.slice(close + 2, match), scoping.newFunction(scope, args))
                };
                token = tokens[index = match + 1];
                return obj;
            } else {
                var inside = tokens.slice(index + 1, close), value;
                if (!inside.length) value = [];
                else {
                    value = parseExpressions(inside);
                    if (value.length > 1) error(token, "Only one expression allowed inside parentheses.");
                    value = value[0];
                }
                token = tokens[index = close + 1];
                return {
                    type: "parenthetic",
                    value: value,
                    returnType: getType(value)
                };
            }
        });

        prefix("{", 150, function () {
            index--;
            var match = findMatchingDelimiter("{", "}", index);
            var obj = {
                type: "object",
                literal: true,
                value: parse(tokens.slice(index + 1, match), scoping.newObject(scope))
            };
            token = tokens[index = match + 1];
            return obj;
        });

        prefix("[", 150, function () {
            index--;
            var match = findMatchingDelimiter("[", "]", index);
            var obj = {
                type: "array",
                literal: true,
                value: parseExpressions(tokens.slice(index + 1, match))
            };
            token = tokens[index = match + 1];
            return obj;
        });

        infix(".", 100).check = check(function (obj) {
            var right = obj.second;
            if (!(right.type === "identifier" ||
            right.type === "string" ||
            right.type === "number" ||
            right.type === "parenthetic" ||
            !(right.type === "parenthetic" && !(typesMatch(getType(right), "string") || typesMatch(getType(right), "number"))))) {
                error(obj, "Invalid property value");
            }
            getType(obj.first);
            return returnTypes.unknown;
        });

        prefix("!", 90).check = check(
            ["boolean", "boolean"]);
        prefix("-", 90).check = check(
            ["number", "number"]);
        prefix("~", 90).check = check(function (obj) {
            if (obj.first.type !== "identifier") {
                error(obj, "Only identifiers can be referenced.");
            }
        });
        prefix("`", 90).check = check(
            ["_", "function"]);

        infixr("^", 75).check = check(
            [["number", "number", "number"],
            ["array", "function", "array"],
            ["object", "function", "object"]]);

        infix("*", 70, function(left) {
            var right, returnType;
            if(tokens[index].value === "[") {
                if (!typesMatch(getType(left), "function")) error(value, "Only functions can be called");
                right = expression(125);
                return {
                    id: "call",
                    value: left,
                    args: right.value
                };
            }
            right = expression(71);
            var tL = getType(left), tR = getType(right);
            if(typesMatch(tL, "number") && typesMatch(tR, "number")) returnType = "number";
            else if(typesMatch(tL, "function") && typesMatch(tR, "array")) returnType = "unknown";
            else if(typesMatch(tL, "function") && typesMatch(tR, "function")) returnType = "function";
            else error([left, right], "The * operator does not support operands of type '" + tL + " " + tR + "'");
            return {
                id: "*",
                first: left,
                second: right,
                returnType: returnType
            };
        });
        infix("/", 70).check = check(
            [["number", "number", "number"]]);
        infix("%", 70).check = check(
            [["number", "number", "number"]]);

        infix("+", 65).check = check(
            [["number", "number", "number"],
            ["array", "function"],
            ["_", "function"]]);
        infix("-", 65).check = check(
            [["number", "number", "number"]]);

        infix("&", 60).check = check(
            [["array", "_", "array"],
            ["_", "array", "array"],
            ["string", "string", "string"],
            ["string", "number", "string"],
            ["number", "string", "string"],
            ["object", "object", "object"]]);

        var checkFunctionValues = function (value, args) {
            if (!typesMatch(getType(value), "function")) error(value, "Only functions can be called");
            if (args) args.map(function (a) { getType(a); });
        };

        suffix("!", 98, function (left) {
            checkFunctionValues(left);
            return {
                id: "call",
                value: left,
                args: []
            };
        });
        infix("|", 95, function (left) {
            var bp = 22;
            var args = [expression(bp)];
            while (token.value === ",") {
                advance();
                args.push(expression(bp));
            }
            checkFunctionValues(left, args);
            return {
                id: "call",
                value: left,
                args: args
            };
        });

        var infixArgs = function (args) {
            if (token.value === "|") {
                do {
                    advance();
                    args.push(expression(20));
                } while (token.value === ",");
            }
        };

        infixr("\\", 54, function (left) {
            var args = [left];
            var value = expression(80, "|");
            infixArgs(args);
            checkFunctionValues(value, args);
            return {
                id: "call",
                value: value,
                args: args
            };
        });

        infix(",", 21, function (left) {
            var args = [left, expression(56)];
            while (token.value === ",") {
                advance();
                args.push(expression(56));
            }
            if (token.value !== "\\") error(args, "Expected token: \\");
            advance();
            var value = expression(80, "|");
            infixArgs(args);
            checkFunctionValues(value, args);
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

        (function () {
            var c = assignment.checks;
            assignment(":", 15, {
                checkLeft: [],
                checkScope: [c.isLocalReadonly],
                mutability: "mutable",
                local: true,
                enumerable: true
            });
            assignment("~:", 15, {
                checkLeft: [c.leftIsReference],
                checkScope: [c.isLocal, c.isUndefined, c.isReadonly],
                mutability: "mutable",
                local: false,
                enumerable: true
            });
            assignment("!:", 15, {
                checkLeft: [c.leftIsProperty],
                checkScope: [c.isLocal, c.isOutsideObjectScope],
                mutability: "mutable",
                local: true,
                enumerable: false
            });

            assignment("::", 10, {
                checkLeft: [c.leftIsReference],
                checkScope: [c.isLocal],
                mutability: "immutable",
                local: true,
                enumerable: true
            });
            assignment("!::", 10, {
                checkLeft: [c.leftIsReference, c.leftIsProperty],
                checkScope: [c.isLocal, c.isOutsideObjectScope],
                mutability: "immutable",
                local: true,
                enumerable: false
            });

            var compoundChecks = {
                ":": {
                    checkLeft: [c.leftIsReference],
                    checkScope: [c.isUndefined, c.isNotLocal, c.isReadonly],
                    mutability: "mutable",
                    local: true,
                    enumerable: true
                },
                "~:": {
                    checkLeft: [c.leftIsReference],
                    checkScope: [c.isLocal, c.isUndefined, c.isReadonly],
                    mutability: "mutable",
                    local: false,
                    enumerable: true
                }
            };

            var assigns = [":", "~:"], binaryOps = ["&", "+", "-", "*", "/", "%", "^"];
            for (var i = 0; i < assigns.length; i++) {
                var asgn = assigns[i];
                for (var j = 0; j < binaryOps.length; j++) {
                    var op = binaryOps[j];
                    var checks = compoundChecks[asgn];
                    assignment(asgn + op, 20, checks, { asgn: asgn, op: op, opFirst: false });
                    assignment(op + asgn, 20, checks, { asgn: asgn, op: op, opFirst: true });
                }
            }

        })();

        infix("=>", 5).check = check(function (obj) {
            if (scope.type !== "function") error(obj, "Return statements can only occur in functions");
        });
        var i;
        for (i = 0; i < tokens.length; i++) {
            var t = tokens[i];
            if (t.type !== "operator") {
                t.bindingPower = 0;
                t.nud = createFunction(t);
            } else {
                concatObjects(t, symbols[t.value]);
            }
        }

        for (i = 0; i < tokens.length; i = ++index) {
            token = tokens[i];
            var value = expression(tokens[i].bindingPower);
            var args = [i, index - i].concat(value);
            tokens.splice.apply(tokens, args);
            index -= index - i - (args.length - 3);
        }
        tokens.pop();
        return tokens;
    };

    var statements = parseExpressions(tokens);
    while (statements.length && statements[statements.length - 1].type === "(end)") statements.pop();
    var i;
    for (i = 0; i < statements.length; i++) {
        if(i === statements.length - 1 && scoping.isFunction(scope)) break;
        var statement = statements[i];
        if (statement.assignment) continue;
        switch (statements[i].id) {
            case "call": case "*": case "=>": break;
            default: error(statements[i], "A statement must be an assignment, a function call, or a return statement.");
        }
    }
    if ((!statements[i] || statements[i].id === "=>") && scoping.isFunction(scope)) statements.push({
        "type": "parenthetic",
        "value": []
    });
    return statements;
};