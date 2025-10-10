// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// @ts-check

// index.js is used to setup and configure your bot

// Import required packages
const path = require('path');

// Note: Ensure you have a .env file and include the MicrosoftAppId and MicrosoftAppPassword.
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });
const jwt = require('jsonwebtoken');

const restify = require('restify');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const {
    CloudAdapter,
    ConfigurationBotFrameworkAuthentication
} = require('botbuilder');

// This bot's main dialog.
const { ProactiveBot } = require('./bots/proactiveBot');
const { selectByEmail } = require('./bots/hanaService'); // DBから会話情報を取得する関数

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(process.env);

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const adapter = new CloudAdapter(botFrameworkAuthentication);

const secret = process.env.JWT_SECRET || '32charsecret32charsecret!';

const users = [
  { username: 'alice' },
  { username: 'bob' },
  { username: 'carol' }
];

users.forEach(user => {
  const token = jwt.sign(user, secret, { expiresIn: '1y' });
  console.log(`${user.username}: ${token}`);
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights. See https://aka.ms/bottelemetry for telemetry
    //       configuration instructions.
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Create the main dialog.
const conversationReferences = {};
const bot = new ProactiveBot(conversationReferences);

// Create HTTP server.
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(process.env.port || process.env.PORT || 3978, function() {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

// Listen for incoming activities and route them to your bot main dialog.
server.post('/api/messages', async (req, res) => {
    // Route received a request to adapter for processing
    await adapter.process(req, res, (context) => bot.run(context));
});

// Listen for incoming notifications and send proactive messages to users.
server.get('/api/notify', async (req, res) => {
    for (const conversationReference of Object.values(conversationReferences)) {
        await adapter.continueConversationAsync(process.env.MicrosoftAppId ?? '', conversationReference, async context => {
            await context.sendActivity('proactive hello');
        });
    }

    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.write('<html><body><h1>Proactive messages have been sent.</h1></body></html>');
    res.end();
});

// Listen for incoming sendMessageToUser and send proactive messages to special user.
server.post('/api/sendMessageToUser', authenticateJWT, async (req, res) => {
    const { email, message } = req.body;
    console.log(email);
    console.log(message);
    
    if (!email) {
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(400);
        res.write('<html><body><h1>email is required.</h1></body></html>');
        res.end();
    }

    try {
            const record = await selectByEmail(email);
            if (!record) {
                res.setHeader('Content-Type', 'text/html');
                res.writeHead(400);
                res.write('<html><body><h1>No conversation found for email yet.</h1></body></html>');
                res.end();
            }

            const conversationReference = JSON.parse(record.CONVERSATIONREF);

            await adapter.continueConversationAsync(
                process.env.MicrosoftAppId ?? '',
                conversationReference,
                async (context) => {
                    await context.sendActivity(message);
                }
            );
            res.setHeader('Content-Type', 'text/html');
            res.writeHead(200);
            res.write('<html><body><h1>Message sent email.</h1></body></html>');
            res.end();
        } catch (error) {
            console.error('Error sending message:', error);
            res.setHeader('Content-Type', 'text/html');
            res.writeHead(500);
            res.write('<html><body><h1>Failed to send message.</h1></body></html>');
            res.end();
        }
});


function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                res.send(403, { message: 'Forbidden: Invalid token.' });
            } else {
                const allowedUsers = ['alice', 'bob', 'carol'];
                if (!allowedUsers.includes(user.username)) {
                    return res.send(403, { message: 'Forbidden: User not allowed.' });
                }
                req.user = user;
                next();
            }
        });
    } else {
        res.send(401, { message: 'Unauthorized: No token provided.' });
    }
}