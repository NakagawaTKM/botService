// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// @ts-check

const { ActivityHandler, TurnContext } = require('botbuilder');
// Importing the saveConversationReference function from the hanaService module
const { selectByEmail, saveConversationReference } = require('./hanaService');

class ProactiveBot extends ActivityHandler {
    constructor(conversationReferences) {
        super();
        // getAccessToken();
        // Dependency injected dictionary for storing ConversationReference objects used in NotifyController to proactively message users
        this.conversationReferences = conversationReferences;

        this.onConversationUpdate(async (context, next) => {
            // confirmAndSave(TurnContext.getConversationReference(context.activity));
            await this.addConversationReference(context.activity);

            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded ?? [];
            // confirmAndSave(TurnContext.getConversationReference(context.activity));
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    const welcomeMessage = 'Thank you for using the BPWF notification feature. \nCould you please send us a message here?';
                    await context.sendActivity(welcomeMessage);
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMessage(async (context, next) => {
            await this.addConversationReference(context.activity);
            // confirmAndSave(TurnContext.getConversationReference(context.activity));
            // Echo back what the user said
            await context.sendActivity(`I am just a message-sending bot and cannot answer your question. 
                If you need assistance, please contact the System Support department. Thank you. 
                You sent '${ context.activity.text }'`);
            await next();
        });
    }

    async addConversationReference(activity) {
        const conversationReference = TurnContext.getConversationReference(activity);
        await saveConversationReference(conversationReference);
        const conversationId = conversationReference.conversation?.id;
        console.log("conversationReference is :")
        console.log(conversationReference);
        if (conversationId) {
            this.conversationReferences[conversationId] = conversationReference;
        }
    }

    async sendMessageToUserByEmail(email, context, message) {
        const record = await selectByEmail(email);
        if (record) {
            const conversationReference = JSON.parse(record.CONVERSATIONREF);
            await context.adapter.continueConversation(conversationReference, async (proactiveContext) => {
                await proactiveContext.sendActivity(`Hello ${email}, this is a proactive message! ${message}`);
            });
        } else {
            console.log(`No conversation reference found for email: ${email}`);
        }
    }
}

module.exports.ProactiveBot = ProactiveBot;
