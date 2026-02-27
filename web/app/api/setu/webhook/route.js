import { NextResponse } from "next/server";

/**
 * Setu Account Aggregator Webhook Endpoint
 * Receives notifications about consent status and FI data availability
 */

export async function POST(req) {
  try {
    // 🔹 Read raw body (important for future signature verification)
    const rawBody = await req.text();

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      console.error("❌ Invalid JSON received");
      return NextResponse.json({ success: false }, { status: 400 });
    }

    console.log("🔔 Setu Webhook Received:");
    console.log(JSON.stringify(event, null, 2));

    // ----------------------------------------------------
    // 🟢 CONSENT STATUS UPDATE
    // ----------------------------------------------------
    if (event?.Detail?.ConsentStatus) {
      const status = event.Detail.ConsentStatus;
      const consentId = event.Detail.ConsentId;

      console.log(`📄 Consent ID: ${consentId}`);
      console.log(`📊 Status: ${status}`);

      if (status === "ACTIVE") {
        console.log("✅ Consent ACTIVE — Ready to request FI data");

        // TODO: Update DB status
        // TODO: Trigger FI Data Request API
      }

      if (status === "REJECTED") {
        console.log("❌ Consent REJECTED by user");

        // TODO: Update DB status
      }

      if (status === "EXPIRED") {
        console.log("⏰ Consent EXPIRED");

        // TODO: Handle expiration
      }
    }

    // ----------------------------------------------------
    // 🟣 FI DATA READY
    // ----------------------------------------------------
    if (event?.type === "FI_DATA_READY") {
      console.log("📥 FI Data is READY for fetching");

      // TODO: Call Setu FI Data Fetch API
      // TODO: Decrypt received data
      // TODO: Store securely
    }

    // ----------------------------------------------------
    // 🟡 UNKNOWN EVENT
    // ----------------------------------------------------
    if (!event?.Detail?.ConsentStatus && event?.type !== "FI_DATA_READY") {
      console.log("ℹ️ Other webhook event received");
    }

    // ----------------------------------------------------
    // ✅ Always return 200 to acknowledge webhook
    // ----------------------------------------------------
    return NextResponse.json(
      { success: true, message: "Webhook processed" },
      { status: 200 }
    );

  } catch (error) {
    console.error("🔥 Error processing webhook:", error);

    // Still return 200 unless you want retries
    return NextResponse.json(
      { success: false, message: "Internal error" },
      { status: 200 }
    );
  }
}