require('dotenv').config();
const express = require('express');
const { createAgent } = require('@microsoft/agents-hosting');
const { createExpressHosting } = require('@microsoft/agents-hosting-express');
const { createTeamsExtension, getConversationReference } = require('@microsoft/agents-hosting-extensions-teams');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const conversationStore = new Map();

const agent = createAgent({
  id: 'teams-agent',
  extensions: [createTeamsExtension()],
  onMessageReceived: async (context) => {
    const reference = getConversationReference(context.activity);
    const userId = reference.user.id;
    conversationStore.set(userId, reference);
    await context.sendActivity('こんにちは！会話が記録されました。');
  }
});

createExpressHosting(app, agent);

async function getGraphToken() {
  const res = await fetch(`https://login.microsoftonline.com/${process.env.GRAPH_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GRAPH_CLIENT_ID,
      client_secret: process.env.GRAPH_CLIENT_SECRET,
      scope: process.env.GRAPH_SCOPE,
      grant_type: 'client_credentials'
    })
  });
  const data = await res.json();
  return data.access_token;
}

async function getUserIdByEmail(email, token) {
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${email}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data.id;
}

app.post('/send-message', async (req, res) => {
  const { email, message } = req.body;
  try {
    const token = await getGraphToken();
    const userId = await getUserIdByEmail(email, token);
    const reference = conversationStore.get(userId);

    if (!reference) {
      return res.status(404).json({ error: 'ConversationReference not found for user.' });
    }

    await agent.continueConversation(reference, async (context) => {
      await context.sendActivity(message);
    });

    res.json({ status: 'Message sent', userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Agent bot server running on port ${PORT}`);
});
