import { createInterface } from "node:readline";
import { loadConfig, saveConfig } from "../config/index.js";
import { log } from "../utils/logger.js";
import { encryptPayload } from "../services/encryption.js";
import { sendTestNotification } from "../services/expo-push.js";

interface PairingData {
  v: 1;
  t: string; // Expo push token
  pk: string; // Public key (base64)
  n: string; // Device name
}

function parsePairingCode(code: string): PairingData | null {
  try {
    const decoded = JSON.parse(Buffer.from(code.trim(), "base64").toString("utf-8"));
    if (decoded.v === 1 && decoded.t && decoded.pk && decoded.n) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function pairCommand(): Promise<void> {
  const config = loadConfig();

  if (config.device) {
    log.warn(`Already paired with device: ${config.device.name}`);
    const answer = await prompt("Replace existing device? (y/N) ");
    if (answer.toLowerCase() !== "y") {
      log.info("Pairing cancelled");
      return;
    }
  }

  log.header("OpenCody Relay - Device Pairing");
  log.blank();
  log.info("1. Open OpenCody app on your phone");
  log.info("2. Go to Settings > Push Notifications");
  log.info('3. Tap "Enable" and then "Pair with Relay"');
  log.info("4. Copy the pairing code and paste it below");
  log.blank();

  const code = await prompt("Pairing code: ");

  if (!code.trim()) {
    log.error("No pairing code provided");
    process.exit(1);
  }

  const pairingData = parsePairingCode(code);

  if (!pairingData) {
    log.error("Invalid pairing code");
    log.info("Make sure you copied the entire code from the app");
    process.exit(1);
  }

  // Update config with device info
  config.device = {
    name: pairingData.n,
    token: pairingData.t,
    publicKey: pairingData.pk,
    pairedAt: new Date().toISOString(),
  };

  saveConfig(config);

  log.blank();
  log.success("Device paired successfully!");
  log.info(`  Name: ${pairingData.n}`);
  log.blank();

  // Send test notification
  log.info("Sending test notification...");

  const testPayload = {
    type: "test" as const,
    message: "Pairing successful!",
    timestamp: Date.now(),
  };

  const encrypted = encryptPayload(testPayload, pairingData.pk);
  const success = await sendTestNotification(pairingData.t, encrypted);

  if (success) {
    log.success("Test notification sent");
  } else {
    log.warn("Test notification may have failed - check your phone");
  }

  log.blank();
  log.info("Run 'opencody-relay start' to begin receiving notifications.");
}
