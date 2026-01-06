import { setConfigValue } from "../config/index.js";
import { log } from "../utils/logger.js";

const VALID_KEYS = ["opencode.url", "events.sessionCreated"];

export async function configSetCommand(
  key: string,
  value: string
): Promise<void> {
  if (!VALID_KEYS.includes(key)) {
    log.error(`Unknown config key: ${key}`);
    log.info(`Valid keys: ${VALID_KEYS.join(", ")}`);
    process.exit(1);
  }

  const success = setConfigValue(key, value);

  if (success) {
    log.success(`Updated ${key}`);
  } else {
    log.error(`Failed to update ${key}`);
    process.exit(1);
  }
}
