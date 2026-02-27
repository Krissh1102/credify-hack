import fetch from "node-fetch";

const clientId = "a8f89034-b805-4ee2-856d-35617dc1c0bc";
const clientSecret = "RAilfK4ksXxiYW5E2yX4FnWz82d9Wste";
const productInstanceId = "640d4a9f-2953-4455-9346-f70476d636ca";

async function run() {
    try {
        const response = await fetch("https://fiu-sandbox.setu.co/v2/consents", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-client-id": clientId,
                "x-client-secret": clientSecret,
                "x-product-instance-id": productInstanceId
            },
            body: JSON.stringify({
                Detail: {
                    consentStart: new Date().toISOString(),
                    consentExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    Customer: { id: "9999999999@onemoney" },
                    FIDataRange: {
                        from: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
                        to: new Date().toISOString()
                    },
                    Purpose: {
                        code: "101",
                        refUri: "https://api.rebit.org.in/aa/purpose/101.xml",
                        text: "Wealth management service",
                        Category: { type: "string" }
                    },
                    FetchType: "PERIODIC",
                    ConsentMode: "STORE",
                    DataLife: { unit: "MONTH", value: 6 },
                    DataFilter: [
                        { type: "TRANSACTIONAMOUNT", operator: ">=", value: "0" }
                    ]
                },
                context: [
                    { key: "accounttype", value: "SAVINGS" }
                ],
                redirectUrl: "http://localhost:3000/dashboard?setu_connected=true"
            })
        });
        console.log("Status:", response.status);
        console.log("Body:", await response.text());
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
