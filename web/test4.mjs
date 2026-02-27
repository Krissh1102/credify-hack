import fetch from "node-fetch";
import fs from "fs";

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
                vua: "9999999999@onemoney",
                dataRange: {
                    from: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
                    to: new Date().toISOString()
                }
            })
        });
        const text = await response.text();
        fs.writeFileSync("out2.txt", `Status: ${response.status}\nBody: ${text}`, "utf8");
    } catch (e) {
        fs.writeFileSync("out2.txt", `Error: ${e.message}`, "utf8");
    }
}
run();
