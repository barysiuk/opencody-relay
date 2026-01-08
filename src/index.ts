import { Command } from "commander";
import { pairCommand } from "./commands/pair.js";
import { unpairCommand } from "./commands/unpair.js";
import { statusCommand } from "./commands/status.js";
import { relayCommand } from "./commands/relay.js";
import { notifyCommand } from "./commands/notify.js";
import { testCommand } from "./commands/test.js";
import { configSetCommand } from "./commands/config.js";
import { VERSION } from "./version.js";

const program = new Command();

program
  .name("opencody-relay")
  .description("Push notification relay for OpenCody mobile app")
  .version(VERSION);

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
  .command("relay")
  .description("Relay events from OpenCode to mobile app")
  .option("-u, --opencode-url <url>", "Override OpenCode URL")
  .option("-v, --verbose", "Show detailed logs")
  .action(relayCommand);

program
  .command("notify <title> <body>")
  .description("Send a direct push notification")
  .option("-d, --deeplink <url>", "Deeplink URL for the notification")
  .action(notifyCommand);

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
