# Building a GitHub App in Node.js

This tutorial will walk you through creating and deploying a GitHub App that comments on any new issue that is opened on a GitHub repository.

You will learn how to create a GitHub app and how to utilizes GitHub’s webhooks to run your own Node.js code each time something happens on a github repository.

1. [What is a GitHub App?](#what-is-a-github-app)
2. [What is a Webhook?](#what-is-a-webhook)
3. [Receive a webhook?](#receive-a-webhook)
4. [Create a GitHub app](#create-a-github-app)
5. [Install your GitHub app.](#install-your-github-app)
6. [Securing your server.](#securing-your-server)
7. [Commenting with your GitHub App](#commenting-with-your-github-app)
8. [Questions? Feedback?](#questions-feedback)

## What is a GitHub App?

[GitHub Apps](https://developer.github.com/apps/) are a new way to extend GitHub. Every GitHub user can create one for free. They can be installed directly on organizations and user accounts and granted access to specific repositories. Apps are first class actors within GitHub. They come with granular permissions and built-in webhooks.

## What are GitHub’s webhooks?

Webhooks are requests that GitHub sends to a specified URL for almost every significant action that users take on GitHub, whether it's pushes to code, opening or closing issues, opening or merging pull requests, or commenting on a discussion.

Usually a GitHub App will be responding to these webhooks. In our example, we will listen to the [issues event](https://developer.github.com/v3/activity/events/types/#issuesevent) to use it as a trigger to create our comment.

Find a list of [all available webhooks on GitHub](https://developer.github.com/webhooks/).

## Receive a webhook

In order to receive a webhook, you have to create a Node.js server and make it accessible at a URL that GitHub can reach.

A very simple way to do that is to use [Glitch](glitch.com). With Glitch, you can create a Node.js application right in your browser and it will be executed for you each time you make a change. We will start out with this server:

```js
const http = require('http')

http.createServer(handleRequest).listen(3000)

function handleRequest (request, response) {

  // log request method & URL
  console.log(`${request.method} ${request.url}`)

  // for GET (and other non-POST) requests show "ok" and stop here
  if (request.method !== 'POST') return response.end('ok')

  // for POST requests, read out the request body, log it, then show "ok" as response
  let payload = ''
  request.on('data', (data) => payload += data );
  request.on('end', () => {
    console.log(payload)
    response.end('ok')
  })
}
```

We prepared a template on Glitch that you can use as starting point: [node-server-example](https://glitch.com/edit/#!/remix/node-server-example/3204f092-a7d7-4e88-ba01-4213b9f7d0ec). Click on the "Show" button on top to see the 'ok'. Click on "Logs" in the side bar and you will see `received request: GET /`.

Congratulations, you are all set to receive requests, which is exactly what a webhook sent by GitHub is. 🎉

## Create a GitHub app

Let’s [create a GitHub App](https://github.com/settings/apps/new) (the page will ask you to login to your GitHub account or confirm your password).

Set the **GitHub App Name** to anything you like, e.g. "welcome-bot". Then set the **Webhook URL** to the URL of your glitch app when you click on "show", it will be something like https://adjective-noun.glitch.me. Set both **Hompage URL** and **User authorization callback URL** to "https://example.com/", it can be changed later.

![](/../master/assets/app-register.png?raw=true "Register a GitHub App")

Scroll down to Permissions: Issues and change the drop-down from "No access" to "Read & Write" and check the "Issues" checkbox.

![](/../master/assets/app-permissions.png?raw=true "GitHub App Permissions")

You can ignore all other fields. Scroll to the end of the page and click "Create GitHub App".

Congratulations, you created a GitHub App. 🎊

## Install your GitHub app.

Click on the green "install" button, you will get redirected to a page where you can select a repository on which you want to enable your bot. Select "Only select repositories" and activate it on one of your repositories for testing. You can also [create a new repository](https://github.com/new) first.

![](/../master/assets/app-install.png?raw=true "Install GitHub App")

Before pressing the green "Install" button, make sure you watch the logs of your Glitch app. Now press "Install". In the logs you should now see something like this (shortened for readability)

```
POST /
{"action":"added","installation":{…}}
```

Now create an issue in your test repository. It should log something like this

```
POST /
{"action":"opened","issue":{…}}
```

Congratulations, you installed a GitHub App. 🙌

## Securing your server.

Before moving on, we have to make sure nobody else but our GitHub App can send us requests. If the server as is, everybody who finds out about its URL can send forge fake requests and inject malicious code.

In order to secure our server we can set a secret that only our GitHub app and our server know. Open the settings page for your GitHub App (Settings → GitHub Apps → _Select your bot_). Now enter a secure, random text into the field **Webhook secret**. Remember it.

On your Glitch app, open the `.env` file. This is where we can put secrets without others having access to it. Add a line (make sure to replace `yoursecrethere` with your own secret)

```
WEBHOOK_SECRET=yoursecrethere
```

This secret is used by GitHub to calculate a signature which your server can use for verification. This is not overly complex, but we will use a library for it: [github-webhook-handler](https://github.com/rvagg/github-webhook-handler). Besides, the library makes it simpler to handle hook events, as you will see in a moment.

Open the `package.json` file in your glitch app. Click on the "Add package" drop and enter "github-webhook-handler". Click on the first result to add it as a dependency of your server. You are now ready to use it.

Now open the `server.js` file and change its content

```js
const http = require('http')
const webHookHandler = require('github-webhook-handler')({
  path: '/',
  secret: process.env.WEBHOOK_SECRET
})
http.createServer(handleRequest).listen(3000)

webHookHandler.on('issues', (event) => {
  console.log(`Received issue event for "${event.payload.issue.title}"`)
})

function handleRequest (request, response) {
  if (request.method !== 'POST') return response.end('ok')
  webHookHandler(request, response, () => response.end('ok'))
}
```

Not only is the code much more readable now, it is also secure and ready to go.

Create another comment on the repository you activated your GitHub app for. You should see this in the logs

```
Received issue event for "…"
```

If something doesn’t work as expected, compare it to our [github-webhook-handler-example](https://glitch.com/edit/#!/github-webhook-handler-example). Click on "Remix this" to use it as a template for your own app. Make sure to change the **Webhook URL** in your GitHub App settings to the URL of the new Glitch app and to add the `WEBHOOK_SECRET=` to your new app’s `.env` file.

## Commenting with your GitHub App

A GitHub App is a first-class actor on GitHub. Just like a GitHub user (e.g. [@defunkt](https://github.com/defunkt)), it can be given access to repositories and perform actions through [GitHub’s API](https://developer.github.com/v3/).

Unlike a user, a GitHub App does not sign in through the website (it is a robot, after all). Instead, it authenticates by signing a token with a private key, and then requesting an access token to perform actions on behalf of a specific installation. You don’t need to worry about all that, we will use another module which does the hard lifting for us, but in case you do care, learn all [about authentication options for GitHub Apps](https://developer.github.com/apps/building-integrations/setting-up-and-registering-github-apps/about-authentication-options-for-github-apps/).

First, you need to generate a private key for your GitHub App. Open the Settings page (Settings → GitHub Apps → _Select your bot_), scroll down to "Private key" and press the "Generate private key" button. Open the downloaded `.pem` file with a text editor. Copy its content.

On your Glitch app, press the "+ New file" button and enter ".data/private-key.pem" as its path (the "." at the beginning is important! All files in the ".data" folder cannot be seen by others and are therefore secure). Paste the content from the text editor.

Now you need to add your GitHub App’s id to the `.env` file, you find the id on your GitHub app’s settings page (replace `123` below with the actual id)

```
APP_ID=123
```

Now we need to install two other libraries: [github-app](https://github.com/probot/github-app) and [github](https://github.com/mikedeboer/node-github). Open `package.json` and add them as dependencies. The `"dependencies"` key should now look something like this

```json
  "dependencies": {
    "github-webhook-handler": "^0.6.0",
    "github-app": "^3.0.0",
    "github": "^9.2.0"
  },
```

Now open the `server.js` file and change its content

```js
const http = require('http')
const webHookHandler = require('github-webhook-handler')({
  path: '/',
  secret: process.env.WEBHOOK_SECRET
})
const app = require('github-app')({
  id: process.env.APP_ID,
  cert: require('fs').readFileSync('.data/private-key.pem')
})

http.createServer(handleRequest).listen(3000)

webHookHandler.on('issues', (event) => {
  // ignore all issue events other than new issue opened
  if (event.payload.action !== 'opened') return

  const {installation, repository, issue} = event.payload
  app.asInstallation(installation.id).then((github) => {
    github.issues.createComment({
      owner: repository.owner.login,
      repo: repository.name,
      number: issue.number,
      body: 'Welcome to the robot uprising.'
    })
  })
})

function handleRequest (request, response) {
  if (request.method !== 'POST') return response.end('ok')
  webHookHandler(request, response, () => response.end('ok'))
}
```

Create another comment on your test repository. Welcome to the robot uprising 🤖

If something doesn’t work as expected, compare it to our [github-app-example](https://glitch.com/edit/#!/github-app-example). Click on "Remix this" to use it as a template for your own app. Make sure to change the **Webhook URL** in your GitHub App settings to the URL of the new Glitch app and to add `WEBHOOK_SECRET=` & `APP_ID` to your new app’s `.env` file. You also need to create the `.data/private-key.pem` file as described above.

## Bonus: Probot!

We created a framework called [probot](https://probot.github.io/) which combines [github-webhook-handler](https://github.com/rvagg/github-webhook-handler) and [github](https://github.com/mikedeboer/node-github). Using `probot` you can
simplify the code to just this:

```js
module.exports = function (robot) {
  robot.on('issues', handleIssue.bind(null, robot))
}

function handleIssue (robot, context) {
  const api = context.github
  const {installation, repository, issue} = context.payload

  api.issues.createComment({
    owner: repository.owner.login,
    repo: repository.name,
    number: issue.number,
    body: 'Welcome to the robot uprising.'
  })
}
```

Isn’t that cool? Make sure to create the `.data/private-key.pem` file as described above and update the `.env` file (replace values for `WEBHOOK_SECRET` and `APP_ID`)

```
NODE_ENV=production
PRIVATE_KEY_PATH=.data/private-key.pem
WEBHOOK_SECRET=yoursecrethere
APP_ID=123
```

Then update your `package.json`. You only need `probot` as dependency, the others can be removed. You also need to update the "start" script to `probot run ./server.js`.

Compare your Glitch app to our [probot-example](https://glitch.com/edit/#!/probot-example) if you run into any trouble.

## Questions? Feedback?

If there is anything you think could be improved in this tutorial, please send a pull request. You can do so right from github.com by [editing this README.md file](https://github.com/gr2m/github-app-example/blob/master/README.md).

If you have any questions, please [create an issue](https://github.com/gr2m/github-app-example/issues/new)

Happy coding!
