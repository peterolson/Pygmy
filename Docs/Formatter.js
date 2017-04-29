$(() => {
	var converter = new Markdown.Converter;
	var text = $("#text").text();
	$("#text").html(converter.makeHtml(text));
	$("pre").each(function () {
        var t;
        var text = $(this).text();
        try {
			t = tokenize(text);
		}
		catch (e) {
			t = e;
		}
        var text = text.split("");
        for (var i = 0; i < t.length; i++) {
			var token = t[i];
			text[token.from] = "<span class=\"" + token.type + "\">" + text[token.from];
			text[token.to - 1] += "</span>";
		}
        $(this).html(text.join(""));
    }).after(function () {
		var txt = $(this).text();
		return $("<button class='run'>Run this code</button>").click(() => {
			run(txt);
		});
	});
	$("#text").show();
});

var program;

var getStatements = () => parse(tokenize(program));

var run = txt => {
	program = txt;
	$("#runframe").attr("src", "");
	$("#runframe").attr("src", "../Runner.html");
}