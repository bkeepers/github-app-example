# Building GitHub Integrations in Node.js

> Integrations are a new way to extend GitHub. They can be installed directly on organizations and user accounts and granted access to specific repositories. They come with granular permissions and built-in webhooks. Integrations are first class actors within GitHub.
>
> –Documentation on [GitHub Integrations](https://developer.github.com/early-access/integrations/)

This tutorial will walk you through creating an integration with Node.js that comments on any new issue that is opened on a GitHub repository.

## Receiving webhooks

Usually an integration will be responding to a [webhook](https://developer.github.com/webhooks/) from GitHub. Webhooks are fired for almost every significant action that users take on GitHub, whether it's pushes to code, opening or closing issues, opening or merging pull requests, or commenting on a discussion.

The [github-webhook-handler] module makes it easy to add support for webhooks to Node.js web servers. Start by installing it in your project:

```
$ npm install --save github-webhook-handler
```

[github-webhook-handler] includes an example in the `README`, so we'll will use a truncated version of that, starting with creating a webhook handler and listening for an event:

```js
var createHandler = require('github-webhook-handler');

var handler = createHandler({
  path: '/',
  secret: 'myhashsecret'
});

handler.on('issues', function (event) {
  console.log('Received an issue event for %s action=%s: #%d %s',
    event.payload.repository.name,
    event.payload.action,
    event.payload.issue.number,
    event.payload.issue.title)
});
```

`createHandler` returns a middleware that handles all the logic of receiving and verifying webhook requests from GitHub. It has an `on` method that can be used to listen to any of the GitHub event types. The [`issues`](https://developer.github.com/v3/activity/events/types/#issuesevent) webhook event is fired whenever an issue is opened, closed, edited, assigned, labeled, etc.

In order to receive these webhooks from GitHub, our integration needs an HTTP server. We are going to use the builtin `http` module, but `handler` also works as a [middleware](http://expressjs.com/en/guide/using-middleware.html) in  [express](http://expressjs.com/).

```js
var http = require('http');

http.createServer(function (req, res) {
  handler(req, res, function (err) {
    res.statusCode = 404
    res.end('no such location')
  });
}).listen(7777);
```

Now we have a node server that can receive webhooks, so our integration knows when something interesting happens on GitHub. But as they say, knowing is only half the battle.

## Integrating with GitHub

An integration is a first-class actor on GitHub, like a user (e.g. [@defunkt](https://github/defunkt)) or a organization (e.g. [@github](https://github.com/github)). That means it can be given access to repositories and perform actions through the API like [commenting on an issue](https://developer.github.com/v3/issues/comments/#create-a-comment) or [creating a status](https://developer.github.com/v3/repos/statuses/#create-a-status). The integration is given access to a repository or repositories by being "installed" on a user or organization account.

Unlike a user, an integration doesn't sign in through the website (it is a robot, after all). Instead, it authenticates by signing a token with a private key, and then requesting an access token to perform actions on behalf of a specific installation. The [docs](https://developer.github.com/early-access/integrations/authentication/) cover this in more detail, but I'm skimming over it because we don't really need to know the implementation details.

The [github-integration] module handles all the authentication details for us. It returns and instance of the [github][node-github] Node.js module, which wraps the [GitHub API](https://developer.github.com/v3/) and allows you to do almost anything programmatically that you can do through a web browser. Install it on your project with:

```
$ npm install --save github-integration
```

Configuring the integration requires the `id` of the integration and the private key certificate, which we'll get later.

```js
var createIntegration = require('github-integration');

var integration = createIntegration({
  id: process.env.INTEGRATION_ID,
  cert: require('fs').readFileSync('private-key.pem')
});
```

An integration can request to authenticate as a specific installation by calling `integration.asInstallation(id)` and passing the _installation_ id as an argument. Every webhook payload from an installation includes the id, so for now we don't have to worry about how to get it or where to save it.

Our integration is complete by updating the webhook handler to authenticate as the installation and then perform an action using the [github][node-github] API client.

```js
handler.on('issues', function (event) {
  if (event.payload.action === 'opened') {
    var installation = event.payload.installation.id;

    integration.asInstallation(installation).then(function (github) {
      github.issues.createComment({
        owner: event.payload.repository.owner.login,
        repo: event.payload.repository.name,
        number: event.payload.issue.number,
        body: 'Welcome to the robot uprising.'
      });
    });
  }
});
```

## Testing it out

[register a new integration](https://github.com/settings/integrations/new)


[Configuring Your Server](https://developer.github.com/webhooks/configuring/)

ngrok


```
ngrok http 7777
```

## Next Steps

This example is about the simplest integration imaginable, and it isn't terribly useful.


Integrations don't have to wait for a webhook to take action.

```js
handler.on('integration_installation', function (event) {
  if (event.payload.action == 'created') {
    console.log("Integration installed", event.payload.installation);
  } else if (event.payload.action == 'deleted') {
    console.log("Integration uninstalled", event.payload.installation);
  }
});
```
[github-configurer](https://github.com/bkeepers/github-configurer)

https://developer.github.com/early-access/integrations/

[github-webhook-handler]: https://github.com/rvagg/github-webhook-handler
[node-github]: https://github.com/mikedeboer/node-github
