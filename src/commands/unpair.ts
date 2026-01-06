import { createInterface } from "node:readline";
import { loadConfig, saveConfig } from "../config/index.js";
import { log } from "../utils/logger.js";

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

export async function unpairCommand(): Promise<void> {
  const config = loadConfig();

  if (!config.device) {
    log.warn("No device is currently paired");
    log.info("Run 'opencody-relay pair' to pair a device");
    return;
  }

  const deviceName = config.device.name;
  const answer = await prompt(`Remove paired device "${deviceName}"? (y/N) `);

  if (answer.toLowerCase() !== "y") {
    log.info("Unpair cancelled");
    return;
  }

  config.device = null;
  saveConfig(config);

  log.success("Device removed");
  log.blank();
  log.info("Run 'opencody-relay pair' to pair a new device.");
}
