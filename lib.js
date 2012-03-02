var lib = (function () {
    var convertFunction = function (fn) {
        return function (args) {
            return fn.apply(null, args);
        };
    };

    var funcs = {
        alert: function (msg) {
            return alert(msg), msg;
        },
        prompt: function (msg, defaultText) {
            return prompt(msg, defaultText);
        }
    };

    for (var i in funcs) funcs[i] = convertFunction(funcs[i]);
    return funcs;
})();