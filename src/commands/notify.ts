import { log } from "../utils/logger.js";
import { sendNotification } from "../services/notification.js";

interface NotifyOptions {
  deeplink?: string;
}

export async function notifyCommand(
  title: string,
  body: string,
  options: NotifyOptions
): Promise<void> {
  const result = await sendNotification({
    title,
    body,
    deeplink: options.deeplink,
  });

  if (result.success) {
    log.success("Notification sent");
  } else {
    log.error(result.error || "Failed to send notification");
    process.exit(1);
  }
}
