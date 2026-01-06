import { log } from "../utils/logger.js";
import type { EncryptedPayload } from "./encryption.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface NotificationPayload {
  type: "session.created";
  sessionId: string;
  title: string;
  directory: string;
  timestamp: number;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data: EncryptedPayload;
  sound: "default";
  priority: "high";
}

interface ExpoPushResponse {
  data?: {
    status: "ok" | "error";
    id?: string;
    message?: string;
    details?: {
      error?: string;
    };
  };
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  encryptedData: EncryptedPayload
): Promise<boolean> {
  const message: ExpoPushMessage = {
    to: token,
    title,
    body,
    data: encryptedData,
    sound: "default",
    priority: "high",
  };

  try {
    log.verbose(`Sending push to ${token.substring(0, 30)}...`);

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      log.verbose(`Expo API returned status ${response.status}`);
      return false;
    }

    const result = (await response.json()) as ExpoPushResponse;

    if (result.data?.status === "error") {
      log.verbose(`Push error: ${result.data.message || "Unknown error"}`);
      return false;
    }

    log.verbose(`Push sent successfully: ${result.data?.id || "no id"}`);
    return true;
  } catch (error) {
    log.verbose(
      `Push failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return false;
  }
}

export async function sendTestNotification(
  token: string,
  encryptedData: EncryptedPayload
): Promise<boolean> {
  return sendPushNotification(
    token,
    "Test Notification",
    "OpenCody Relay is working!",
    encryptedData
  );
}
