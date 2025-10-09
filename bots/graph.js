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
        console.log("response.data.access_token: "+response.data.access_token);
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error.response?.data || error.message);
        return null;
    }
}

module.exports = { getAccessToken, getUserEmail};
