var error = (token, message) => {
    var min = Number.MAX_VALUE;
    var max = Number.MIN_VALUE;
    (function traverse(token) {
        if (token.from && token.from < min) min = token.from;
        if (token.to && token.to > max) max = token.to;
        for (var i in token) {
            if (typeof token[i] === "object") traverse(token[i]);
        }
    })(token);
    throw [{
        from: min,
        to: max,
        message,
        type: "error"
    }];
};