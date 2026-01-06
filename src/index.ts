import { Command } from "commander";
import { pairCommand } from "./commands/pair.js";
import { unpairCommand } from "./commands/unpair.js";
import { statusCommand } from "./commands/status.js";
import { startCommand } from "./commands/start.js";
import { testCommand } from "./commands/test.js";
import { configSetCommand } from "./commands/config.js";

const program = new Command();

program
  .name("opencody-relay")
  .description("Push notification relay for OpenCody mobile app")
  .version("0.0.1");

program
  .command("pair")
  .description("Pair with a mobile device")
  .action(pairCommand);

program
  .command("unpair")
  .description("Remove paired device")
  .action(unpairCommand);

program
  .command("status")
  .description("Show current configuration and status")
  .action(statusCommand);

program
  .command("start")
  .description("Start the relay service")
  .option("-u, --opencode-url <url>", "Override OpenCode URL")
  .option("-v, --verbose", "Show detailed logs")
  .action(startCommand);

program
  .command("test")
  .description("Send a test notification")
  .action(testCommand);

program
  .command("config")
  .description("Manage configuration")
  .command("set <key> <value>")
  .description("Set a configuration value")
  .action(configSetCommand);

program.parse();
