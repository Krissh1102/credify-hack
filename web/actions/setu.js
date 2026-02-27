"use server";

import { auth } from "@clerk/nextjs/server";

const SETU_BASE_URL = "https://fiu-sandbox.setu.co"; // Replace with production URL when ready

/**
 * Creates a Setu Consent Request for a given phone number.
 * This simulates a call to Setu's Consent API or uses real ones if env vars exist.
 */
export async function createSetuConsentRequest(phoneNumber, formData = null) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const clientId = process.env.SETU_CLIENT_ID;
        const clientSecret = process.env.SETU_CLIENT_SECRET;
        const productInstanceId = process.env.SETU_PRODUCT_INSTANCE_ID;

        // If the Setu API keys are missing, we can provide a mock success response
        if (!clientId || clientId === "your_setu_client_id_here") {
            console.log("Mocking Setu Consent Creation for:", phoneNumber);

            // We simulate a 1s delay for realistic UI loading state
            await new Promise(resolve => setTimeout(resolve, 1000));

            // If the user provided form data from the "New User" flow, we can encode it into 
            // the mock consent id so we can parse it out when fetching the status
            let mockConsentId = "mock-consent-1234";
            if (formData && formData.bankName) {
                const encodedData = Buffer.from(JSON.stringify(formData)).toString("base64");
                mockConsentId = `mock-custom-${encodedData}`;
            }

            return {
                success: true,
                redirectUrl: `/dashboard?setu_connected=true&consent_id=${mockConsentId}`,
                consentId: mockConsentId,
                isMock: true
            };
        }

        // Actual Setu Implementation Boilerplate
        console.log("Real Setu Logic Executing for:", phoneNumber);

        // Note: Setu often requires creating a temporary access token first depending on the environment.
        // Assuming direct client_secret access for this V2 Sandbox implementation:

        const response = await fetch(`${SETU_BASE_URL}/v2/consents`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-client-id": clientId,
                "x-client-secret": clientSecret,
                "x-product-instance-id": productInstanceId
            },
            body: JSON.stringify({
                consentDuration: {
                    unit: "MONTH",
                    value: 6
                },
                consentMode: "STORE",
                dataRange: {
                    from: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
                    to: new Date().toISOString()
                },
                fetchType: "PERIODIC",
                fiTypes: ["DEPOSIT"],
                purpose: {
                    category: { type: "string" },
                    code: "101",
                    refUri: "https://api.rebit.org.in/aa/purpose/101.xml",
                    text: "Wealth management service"
                },
                vua: `${phoneNumber}@onemoney`,
                redirectUrl: "http://localhost:3000/dashboard?setu_connected=true&consent_id="
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Setu API Error Response:", errorText);
            throw new Error("Failed to create Setu consent: " + errorText);
        }

        const data = await response.json();

        // In v2, we must append the consent ID to the redirectUrl if we want to know it later
        // However, Setu may also provide it. We'll include it directly in the URL here just in case Setu strips it.
        const consentId = data.id;
        const redirectUrlWithConsentId = data.url;

        return {
            success: true,
            redirectUrl: redirectUrlWithConsentId,
            consentId: consentId,
            isMock: false
        };
    } catch (error) {
        console.error("Setu Consent Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetches the status and linked accounts for a given consent ID.
 */
export async function getSetuConsentStatus(consentId) {
    try {
        const clientId = process.env.SETU_CLIENT_ID;
        const clientSecret = process.env.SETU_CLIENT_SECRET;
        const productInstanceId = process.env.SETU_PRODUCT_INSTANCE_ID;

        if (!clientId || clientId === "your_setu_client_id_here") {
            // Check if this is a custom mock created from the "New User" form
            if (consentId && consentId.startsWith("mock-custom-")) {
                try {
                    const encodedPayload = consentId.replace("mock-custom-", "");
                    const formData = JSON.parse(Buffer.from(encodedPayload, "base64").toString("utf-8"));

                    return {
                        success: true,
                        status: "ACTIVE",
                        accounts: [
                            {
                                id: "mock-custom-1",
                                fipId: formData.bankName ? formData.bankName.toUpperCase() : "CUSTOM BANK",
                                accType: "SAVINGS",
                                maskedAccNumber: formData.accountNumber ? `XXXX-${formData.accountNumber.slice(-4)}` : "XXXX-1234",
                                balance: "50000.00" // Generic starting balance for custom accounts
                            }
                        ],
                        isMock: true
                    };
                } catch (e) {
                    console.error("Failed to parse custom mock data:", e);
                }
            }

            // Default mock fallback
            return {
                success: true,
                status: "ACTIVE",
                accounts: [
                    {
                        id: "mock-hdfc-1",
                        fipId: "HDFC",
                        accType: "SAVINGS",
                        maskedAccNumber: "XXXX-1234",
                        balance: "142500.00" // Adding a realistic mock balance
                    }
                ],
                isMock: true
            };
        }

        const response = await fetch(`${SETU_BASE_URL}/v2/consents/${consentId}`, {
            method: "GET",
            headers: {
                "x-client-id": clientId,
                "x-client-secret": clientSecret,
                "x-product-instance-id": productInstanceId
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch consent status: ${await response.text()}`);
        }

        const data = await response.json();

        return {
            success: true,
            status: data.status,
            accounts: data.accountsLinked || [],
            isMock: false
        };
    } catch (error) {
        console.error("Setu Fetch Status Error:", error);
        return { success: false, error: error.message };
    }
}