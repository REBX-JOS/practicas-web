import { paypalConfig } from "../configuration/paypal.config";
function getBasicAuth () {
    return Buffer.from(`${paypalConfig.clientId}:${paypalConfig.clientSecret}`).toString('base64');
}
export async function getAccessToken() {
    const response = await fetch(`${paypalConfig.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${getBasicAuth()}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    const data = await response.json();
    return data.access_token;
}