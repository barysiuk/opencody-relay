import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

export interface DeviceConfig {
  name: string;
  token: string;
  publicKey: string;
  pairedAt: string;
}

export interface EventsConfig {
  sessionCreated: boolean;
}

export interface Config {
  version: 1;
  opencode: {
    url: string;
  };
  device: DeviceConfig | null;
  events: EventsConfig;
}

const DEFAULT_CONFIG: Config = {
  version: 1,
  opencode: {
    url: "http://localhost:3000",
  },
  device: null,
  events: {
    sessionCreated: false,
  },
};

function getConfigDir(): string {
  return join(homedir(), ".config", "opencody");
}

function getConfigPath(): string {
  return join(getConfigDir(), "relay.config.json");
}

export function getConfigFilePath(): string {
  return getConfigPath();
}

export function loadConfig(): Config {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content);

    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      opencode: {
        ...DEFAULT_CONFIG.opencode,
        ...parsed.opencode,
      },
      events: {
        ...DEFAULT_CONFIG.events,
        ...parsed.events,
      },
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: Config): void {
  const configPath = getConfigPath();
  const configDir = dirname(configPath);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

export function updateConfig(updates: Partial<Config>): Config {
  const config = loadConfig();
  const updated = {
    ...config,
    ...updates,
    opencode: {
      ...config.opencode,
      ...(updates.opencode || {}),
    },
    events: {
      ...config.events,
      ...(updates.events || {}),
    },
  };
  saveConfig(updated);
  return updated;
}

export function setConfigValue(key: string, value: string): boolean {
  const config = loadConfig();

  switch (key) {
    case "opencode.url":
      config.opencode.url = value;
      break;
    case "events.sessionCreated":
      config.events.sessionCreated = value === "true";
      break;
    default:
      return false;
  }

  saveConfig(config);
  return true;
}

export function isPaired(): boolean {
  const config = loadConfig();
  return config.device !== null;
}
