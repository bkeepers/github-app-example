var http = require('http');
var createHandler = require('github-webhook-handler');

var handler = createHandler({
  path: '/',
  secret: process.env.WEBHOOK_SECRET || 'development'
});

http.createServer(function (req, res) {
  handler(req, res, function (err) {
    res.statusCode = 404
    res.end('no such location')
  });
}).listen(process.env.PORT || 7777);

var fs = require('fs');
var createApp = require('github-app');

var app = createApp({
  id: process.env.APP_ID,
  cert: process.env.PRIVATE_KEY || fs.readFileSync('private-key.pem')
});

handler.on('error', function (err) {
  console.error('Error:', err.message)
});

handler.on('issues', function (event) {
  console.log("EVENT", event);
  if (event.payload.action === 'opened') {
    var installation = event.payload.installation.id;
    app.asInstallation(installation).then(function (github) {
      github.issues.createComment({
        owner: event.payload.repository.owner.login,
        repo: event.payload.repository.name,
        number: event.payload.issue.number,
        body: 'Welcome to the robot uprising.'
      });
    });
  }
});
