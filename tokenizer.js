var tokenize = input => {
    if (!input.length) return;
    var i = 0;
    var line = 0;
    var chr = input[0];
    var tokens = [];

    var advance = () => {
        if (canAdvance) {
            chr = input[++i];
        }
    };

    var canAdvance = () => i < input.length - 1;

    var make = (type, value, literal) => ({
        type,
        value,
        literal,
        line,
        from,
        to: i
    });

    var error = message => {
        throw [{
            from,
            to: i,
            message,
            type: "error"
        }];
    };

    var atEnd = () => typeof chr === "undefined";
    var isNum = chr => (/[0-9]/).test(chr);

    var symbolList = {
        "&": ["&", ":", "~:"],
        "|": ["|"],
        ">": ["="],
        "<": ["="],
        "=": [">"],
        "!": ["=", "::", ":"],
        ":": [":", "+", "-", "*", "&", "/", "%", "^"],
        "~": [":+", ":-", ":*", ":&", ":/", ":%", ":^", ":"],
        "+": [":", "~:"],
        "-": [":", "~:"],
        "*": [":", "~:"],
        "/": [":", "~:"],
        "\\": [],
        "%": [":", "~:"],
        "^": [":", "~:", "^"],
        "(": [],
        ")": [],
        "{": [],
        "}": [],
        "[": [],
        "]": [],
        ",": [],
        ".": [],
        "`": []
    };

    var isComment = chr => chr === ";";
    var isSymbol = chr => typeof symbolList[chr] !== "undefined";
    var isWhitespace = chr => chr.charCodeAt(0) <= " ".charCodeAt(0) || /\s/g.test(chr);
    var isInitialIdentifier = chr => isMedialIdentifier(chr) && !isNum(chr);
    var isMedialIdentifier = chr => typeof chr !== "undefined" && !isWhitespace(chr) && !isSymbol(chr) && !isQuote(chr) && !isComment(chr);
    var isQuote = chr => chr === "'" || chr === "\"" || chr === "•";
    var str;
    var from;
    while (i < input.length) {
		if (chr === "\n") line++;
		if (isWhitespace(chr)) advance();
		else if (isInitialIdentifier(chr)) {
			from = i;
			str = chr;
			while (true) {
				advance();
				if (!isMedialIdentifier(chr)) break;
				str += chr;
			}
			tokens.push(make("identifier", str, true));
		}
		else if (isNum(chr) || (chr === "-" && isNum(input[i + 1]))) {
            from = i;
            var num = chr;
            var hasDigits = false;
            var hasExponent = false;
            while (true) {
				advance();
				var next = input[i + 1];
				if (!hasDigits && chr === "." && isNum(next)) hasDigits = true;
				else if (!hasExponent && chr.toLowerCase() === "e" && (next === "-" || isNum(next))) {
					if (next === "-") {
						num += chr;
						advance();
					}
					hasExponent = true;
				}
				else if (!isNum(chr)) break;
				num += chr;
			}
            num = Number(num);
            if (!isFinite(num)) error("Invalid number");
            tokens.push(make("number", num, true));
        }
		else if (isQuote(chr)) {
			from = i;
			var match = chr;
			str = "";
			while (true) {
				if (atEnd()) error("Unterminated string");
				advance();
				if (chr === match) {
					advance();
					break;
				}
				else if (chr === "\\") {
					advance();
					if (chr === "n") str += "\n";
					else if (chr === "r") str += "\r";
					else if (chr === "t") str += "\t";
					else if (chr === "0") str += "\x00";
					else if (chr === "u") {
                        var hex = "";
                        var hexDigits = 4;
                        while (hexDigits--) {
							advance();
							hex += chr;
						}
                        var hexnum = parseInt(hex, 16);
                        if (isNaN(hexnum)) error(hex + " is not a valid four-digit hexidecimal number.");
                        str += String.fromCharCode(hexnum);
                    }
					else {
						str += chr;
					}
				}
				else {
					str += chr;
				}
			}
			tokens.push(make("string", str, true));
		}
		else if (isComment(chr)) {
            from = i;
            var multiline = false;
            var balance = 1;
            advance();
            if (chr === "^") multiline = true;
            while (true) {
				if (atEnd()) error("Unterminated comment");
				advance();
				if (multiline) {
					if (chr === "^") {
						advance();
						if (chr === ";") {
							balance -= 1;
							if (balance === 0) break;
						}
					}
					else if (chr === ";") {
						advance();
						if (chr === "^") balance += 1;
					}
				}
				if (!multiline && chr === "\n") break;
			}
            advance();
        }
		else if (isSymbol(chr)) {
			from = i;
			var operator = chr;
			var symbols = symbolList[chr];
			advance();
			var foundMatch = false;
			for (var j = 0; j < symbols.length; j++) {
                var symbol = symbols[j];
                var len = symbol.length;
                if (input.substr(i, len) === symbol) {
					foundMatch = true;
					while (len--) advance();
					tokens.push(make("operator", operator + symbol));
					break;
				}
            }
			if (!foundMatch) {
				tokens.push(make("operator", operator));
			}
		}
		else {
			error("Unexpected character: " + chr);
		}
	}
    tokens.push(make("(end)"));
    return tokens;
};