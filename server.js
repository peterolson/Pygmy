var fs = require('fs'),
    http = require('http');
http.createServer(function (req, res) {
    var url = req.url === "/" ? "/Tester.html" : req.url;
    var ext = url.split(".")[1];
    var type = ext === "js" ? "javascript" : ext;
    fs.readFile(__dirname + url, function (err,data) {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    res.writeHead(200, {'Content-Type': 'text/' + type});
    res.end(data);
  });
}).listen(process.env.PORT);