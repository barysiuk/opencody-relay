import { loadConfig } from "../config/index.js";
import { encryptPayload } from "./encryption.js";
import { sendPushNotification } from "./expo-push.js";

export interface NotificationPayload {
  title: string;
  body: string;
  deeplink?: string;
}

export interface NotificationResult {
  success: boolean;
  error?: string;
}

export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  const config = loadConfig();

  if (!config.device) {
    return {
      success: false,
      error: "No device paired",
    };
  }

  const encrypted = encryptPayload(payload, config.device.publicKey);

  const success = await sendPushNotification(
    config.device.token,
    payload.title,
    payload.body,
    encrypted
  );

  if (success) {
    return { success: true };
  }

  return {
    success: false,
    error: "Failed to send push notification",
  };
}
