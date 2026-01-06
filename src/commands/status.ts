import { loadConfig, getConfigFilePath } from "../config/index.js";
import { log } from "../utils/logger.js";
import pc from "picocolors";

export async function statusCommand(): Promise<void> {
  const config = loadConfig();
  const configPath = getConfigFilePath();

  log.header("OpenCody Relay Status");
  log.blank();

  log.info(`Config: ${pc.dim(configPath)}`);
  log.blank();

  log.info(`OpenCode URL: ${config.opencode.url}`);

  if (config.device) {
    log.info(`Paired Device: ${config.device.name}`);
    log.info(`Paired At: ${new Date(config.device.pairedAt).toLocaleString()}`);
  } else {
    log.info(`Paired Device: ${pc.dim("None")}`);
  }

  log.blank();
  log.info("Events Enabled:");
  log.info(
    `  - Session created: ${config.events.sessionCreated ? pc.green("\u2713") : pc.red("\u2717")}`
  );
}
