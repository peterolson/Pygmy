$(function () {
    var sanitizer = Markdown.getSanitizingConverter();
    var text = $("#text").text();
	$("#text").html(sanitizer.makeHtml(text));
	$("code").each(function () {
		var t, text = $(this).text();
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
	});
	$("#text").show();
});