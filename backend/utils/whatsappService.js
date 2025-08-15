import twilio from "twilio";
import dotenv from "dotenv";
import Admin from "../models/admin.js";

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromWhatsAppNumber = "whatsapp:+14155238886"; // Twilio Sandbox number
export let sentToCount = 0;

if (!accountSid || !authToken) {
  throw new Error(
    "Twilio Account SID and Auth Token must be set in environment variables."
  );
}

const client = new twilio(accountSid, authToken);

/**
 * Sends a WhatsApp message to all admins whose 'active' is true.
 */
export async function sendWhatsAppMessage(message) {
  try {
    // 1️⃣ Get all active admins
    const activeAdmins = await Admin.find({ active: true });

    if (!activeAdmins.length) {
      console.log("No active admins found to send WhatsApp message.");
      return;
    }

    sentToCount = activeAdmins.length;
    // 2️⃣ Send message to each admin
    for (const admin of activeAdmins) {
      try {
        const response = await client.messages.create({
          from: fromWhatsAppNumber,
          to: `whatsapp:${admin.number}`,
          body: message,
        });
        console.log(`WhatsApp sent to ${admin.name} (${admin.number}): ${response.sid}`);
      } catch (err) {
        console.error(`Failed to send WhatsApp to ${admin.name} (${admin.number}):`, err);
      }
    }
  } catch (error) {
    console.error("Failed to send WhatsApp to admins:", error);
  }
}
