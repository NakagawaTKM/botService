

查询 Email 的 Graph API 代码（Node.js）
你需要使用 Microsoft Graph API 的 /users/{id} 端点来获取 email：

const axios = require('axios');

async function getUserEmail(aadObjectId, accessToken) {
    const url = `https://graph.microsoft.com/v1.0/users/${aadObjectId}`;
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        return response.data.mail || response.data.userPrincipalName;
    } catch (error) {
        console.error('Error fetching email from Graph API:', error.response?.data || error.message);
        return null;
    }
}



const hana = require('@sap/hana-client');
const { getUserEmail } = require('./graph'); // 假设你把上面的函数放在 graph.js

async function handleConversation(activity, accessToken) {
    const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
    const hanaConfig = vcapServices['hana'][0].credentials;
    const conn = hana.createConnection();

    const userId = activity.from?.id;
    const aadObjectId = activity.from?.aadObjectId;
    const conversationId = activity.conversation?.id;
    const serviceUrl = activity.serviceUrl;
    const channelId = activity.channelId;
    const botId = activity.recipient?.id;
    const conversationRef = JSON.stringify(activity); // 或使用 TurnContext.getConversationReference(activity)

    try {
        conn.connect(hanaConfig);

        // 查询是否已有记录
        const checkQuery = `SELECT * FROM "MY_SCHEMA"."BOTUSERCONVERSATIONS" WHERE "userId" = ?`;
        const existing = conn.prepare(checkQuery).exec([userId]);

        if (existing.length === 0) {
            const email = await getUserEmail(aadObjectId, accessToken);
            if (!email) {
                console.error('Email not found, skipping insert.');
                return;
            }

            const insertQuery = `
                INSERT INTO "MY_SCHEMA"."BOTUSERCONVERSATIONS"
                ("email", "aadObjectId", "conversationId", "serviceUrl", "channelId", "botId", "userId", "conversationRef", "createdAt", "updatedAt")
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;
            conn.prepare(insertQuery).exec([
                email,
                aadObjectId,
                conversationId,
                serviceUrl,
                channelId,
                botId,
                userId,
                conversationRef
            ]);

            console.log('Inserted new conversation record for user:', email);
        } else {
            console.log('User already exists, no insert needed.');
        }
    } catch (err) {
        console.error('Database error:', err);
    } finally {
        conn.disconnect();
    }
}




npm install axios dotenv


.env
TENANT_ID=your-tenant-id
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret


require('dotenv').config();
const axios = require('axios');

async function getAccessToken() {
    const tenantId = process.env.TENANT_ID;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');

    try {
        const response = await axios.post(tokenEndpoint, params);
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error.response?.data || error.message);
        return null;
    }
}

module.exports = { getAccessToken };





const { getAccessToken } = require('./getAccessToken');

async function main() {
    const token = await getAccessToken();
    if (token) {
        console.log('Access Token:', token);
        // 你可以继续调用 Graph API，例如查询用户 email
    }
}

main();




channelId