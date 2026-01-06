import { loadConfig } from "../config/index.js";
import { log, setVerbose } from "../utils/logger.js";
import { OpenCodeClient, type GlobalEvent, type SessionInfo } from "../services/opencode.js";
import { encryptPayload } from "../services/encryption.js";
import { sendPushNotification, type NotificationPayload } from "../services/expo-push.js";
import pc from "picocolors";

interface StartOptions {
  opencodeUrl?: string;
  verbose?: boolean;
}

export async function startCommand(options: StartOptions): Promise<void> {
  const config = loadConfig();

  if (options.verbose) {
    setVerbose(true);
  }

  if (!config.device) {
    log.error("No device paired");
    log.info("Run 'opencody-relay pair' first");
    process.exit(1);
  }

  const opencodeUrl = options.opencodeUrl || config.opencode.url;

  log.header(`OpenCody Relay v0.0.1`);
  log.info(`OpenCode: ${opencodeUrl}`);
  log.info(`Device:   ${config.device.name}`);
  log.blank();

  const client = new OpenCodeClient(opencodeUrl);

  // Check health first
  log.info("Connecting to OpenCode server...");
  const healthy = await client.checkHealth();

  if (!healthy) {
    log.error("Cannot connect to OpenCode server");
    log.info(`Make sure OpenCode is running at ${opencodeUrl}`);
    process.exit(1);
  }

  client.setConnectHandler(() => {
    log.success("Connected to OpenCode server");
    log.info("  Listening for events...");
    log.blank();
  });

  client.setDisconnectHandler(() => {
    log.warn("Disconnected from OpenCode server");
  });

  client.setEventHandler(async (event: GlobalEvent) => {
    await handleEvent(event, config.device!, config.events);
  });

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    log.blank();
    log.info("Shutting down...");
    client.disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    client.disconnect();
    process.exit(0);
  });

  client.connect();
}

async function handleEvent(
  event: GlobalEvent,
  device: { name: string; token: string; publicKey: string },
  eventsConfig: { sessionCreated: boolean }
): Promise<void> {
  const { type, properties } = event.payload;

  log.verbose(`Received event: ${type}`);

  if (type === "session.created" && eventsConfig.sessionCreated) {
    const info = properties.info as SessionInfo;
    const title = info.title || "Untitled Session";

    log.event("Session created", title);

    const payload: NotificationPayload = {
      type: "session.created",
      sessionId: info.id,
      title,
      directory: event.directory,
      timestamp: info.time.created,
    };

    const encrypted = encryptPayload(payload, device.publicKey);
    const success = await sendPushNotification(
      device.token,
      "New Session",
      title,
      encrypted
    );

    if (success) {
      log.arrow("Notification sent");
    } else {
      log.arrow(pc.red("Notification failed"));
    }
  }
}
