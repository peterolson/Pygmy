(function () {
    (function scoping() {
        var scope = {
            parent: {},
            current: {},
            type: "global"
        }, scopeStack = [scope];

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
                    newScope.current["this"] = {
                        value: {
                            "arguments": values || [],
                            "function": self
                        },
                        mutability: 1,
                        enumerable: 1
                    };
                    for (i = 0; i < args.length; i++) {
                        var name = args[i], value = values[i];
                        newScope.current[name] = typeof value === "undefined" ? value : null;
                    }
                }
                scope = newScope;
                scopeStack.push(scope);
            } else {
                var obj = scopeStack.pop();
                scope = scopeStack[scopeStack.length - 1];
                if (obj.type === "o") return obj;
            }
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
                var obj = i[name];
                for (var i = 0; i < properties.length - 1; i++) {
                    obj = obj ? obj[properties[i]] : null;
                    if (!obj) throw name + "." + properties.slice(0, i).join(".") + " does not exist.";
                    if (obj.mutability !== 0) throw properties[i] + " cannot be in the property chain of an assignment because it is an immutable property.";
                    obj = obj.value;
                }
                obj[properties[properties.length - 1]] = value;
            }
            else if (local) scope.current[name] = value;
            else scope.parent[name] = value;
        };

        i = function (name) {
            if (name in scope.current) return scope.current[name].value;
            if (name in scope.parent) return scope.parent[name].value;
            throw "Unrecognized variable: " + name;
        };

        f = function (fn, args) {
            fn(args, fn);
        };
    })();

    (function operators() {
        var match = function (args, types) {
            for (var i = 0; i < types.length; i++) {
                if (!types[i]) continue;
                if (typeof args[i] !== types[i]) return false;
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
                if (match(args, ["object", "object"])) return {}; //
                typeError("&", args);
            };
        })();
        (function arithmetic() {
            a = function (a, b) {
                var args = [a, b];
                if (match(args, ["number", "number"])) return a + b;
                if (match(args, ["array", "function"])) return function () { }; //
                if (match(args, [0, "function"])) return function () { }; //
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
                if (match(args, ["function", "function"])) return function () { } //;
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

        })();
        (function miscellaneous() {

        })();
    })();
})()