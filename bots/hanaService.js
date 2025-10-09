const hana = require('@sap/hana-client');
const { getUserEmail, getAccessToken } = require('./graph');

function getHanaConnection() {
    const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
    const hanaConfig = vcapServices['hana'][0].credentials;
    const conn = hana.createConnection();
    conn.connect(hanaConfig);
    return conn;
}

async function saveConversationReference(conversationReference) {
    const conn = getHanaConnection();

    const userId = conversationReference.user?.id || null;
    const conversationId = conversationReference.conversation?.id || null;
    const serviceUrl = conversationReference.serviceUrl || null;
    const channelId = conversationReference.conversation?.channelId || null;
    const botId = conversationReference.bot?.id || null;
    const conversationRef = JSON.stringify(conversationReference);
    const token = await getAccessToken();

    try {
        const checkQuery = `SELECT * FROM "88ABD5B00DB646F2BBBFBACA9FD381D9"."BOTUSERCONVERSATIONS" WHERE "USERID" = ?`;
        const existing = conn.prepare(checkQuery).exec([userId]);

        if (existing.length === 0) {
            const email = await getUserEmail(userId, token);
            const insertQuery = `
                INSERT INTO "88ABD5B00DB646F2BBBFBACA9FD381D9"."BOTUSERCONVERSATIONS"
                ("EMAIL", "AADOBJECTID", "CONVERSATIONID", "SERVICEURL", "CHANNELID", "BOTID", "USERID", "CONVERSATIONREF", "CREATEDAT", "UPDATEDAT")
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;
            conn.prepare(insertQuery).exec([
                email,
                null,
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

async function selectByEmail(email) {
    const conn = getHanaConnection();

    try {
        const query = `
            SELECT * FROM "88ABD5B00DB646F2BBBFBACA9FD381D9"."BOTUSERCONVERSATIONS"
            WHERE "EMAIL" = ?
        `;
        const result = conn.prepare(query).exec([email]);

        if (result.length > 0) {
            console.log(`Found ${result.length} record(s) for email: ${email}`);
            return result[0];
        } else {
            console.log(`No records found for email: ${email}`);
            return null;
        }
    } catch (err) {
        console.error('Database error in selectByEmail:', err);
        return null;
    } finally {
        conn.disconnect();
    }
}

module.exports = {
    saveConversationReference,
    selectByEmail
};

