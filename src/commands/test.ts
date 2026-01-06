import { loadConfig } from "../config/index.js";
import { log } from "../utils/logger.js";
import { encryptPayload } from "../services/encryption.js";
import { sendTestNotification } from "../services/expo-push.js";

export async function testCommand(): Promise<void> {
  const config = loadConfig();

  if (!config.device) {
    log.error("No device paired");
    log.info("Run 'opencody-relay pair' first");
    process.exit(1);
  }

  log.info(`Sending test notification to ${config.device.name}...`);

  const testPayload = {
    type: "test" as const,
    message: "Test notification from opencody-relay",
    timestamp: Date.now(),
  };

  const encrypted = encryptPayload(testPayload, config.device.publicKey);
  const success = await sendTestNotification(config.device.token, encrypted);

  if (success) {
    log.success("Notification sent successfully");
  } else {
    log.error("Failed to send notification");
    process.exit(1);
  }
}
