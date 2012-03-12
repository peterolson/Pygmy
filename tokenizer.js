var tokenize = function (input) {
	if (!input.length) return;
	var i = 0,
            line = 0,
			chr = input[0],
			tokens = [],
			advance = function () {
				if (canAdvance) {
					chr = input[++i];
				}
			},
			canAdvance = function () {
				return i < input.length - 1;
			},
			make = function (type, value, literal) {
				return {
					type: type,
					value: value,
					literal: literal,
					line: line,
					from: from,
					to: i
				};
			},
			error = function (message) {
				throw [{
					from: from,
					to: i,
					message: message,
					type: "error"
				}];
			},
			atEnd = function () {
				return typeof chr === "undefined";
			},
			isNum = function (chr) {
				return (/[0-9]/).test(chr);
			},
			symbolList = {
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
			},
			isComment = function (chr) {
				return chr === ";";
			},
			isSymbol = function (chr) {
				return typeof symbolList[chr] !== "undefined";
			},
			isWhitespace = function (chr) {
				return chr.charCodeAt(0) <= " ".charCodeAt(0);
			},
			isInitialIdentifier = function (chr) {
				return isMedialIdentifier(chr) && !isNum(chr);
			},
			isMedialIdentifier = function (chr) {
				return typeof chr !== "undefined" && !isWhitespace(chr) && !isSymbol(chr) && !isQuote(chr) && !isComment(chr);
			},
			isQuote = function (chr) {
				return chr === "'" || chr === "\"" || chr === "•";
			};
	var str, from;
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
			var num = chr,
					hasDigits = false,
					hasExponent = false;
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
						var hex = "",
								hexDigits = 4;
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
			var multiline = false,
					balance = 1;
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
				var symbol = symbols[j],
						len = symbol.length;
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