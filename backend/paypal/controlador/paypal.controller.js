export async function createPaypalOrder(orderData) {
    const accessToken = await getAccessToken();
    const response = await fetch(`${paypalConfig.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
                {
                    amount: {
                        currency_code: 'MXN',
                        value: orderData.total.toFixed(2)   
                    }
                }
            ]
        })
    });
    const data = await response.json();
    return data;
}