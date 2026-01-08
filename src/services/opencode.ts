import { EventSource } from "eventsource";
import { log } from "../utils/logger.js";

export interface SessionInfo {
  id: string;
  projectID: string;
  directory: string;
  parentID?: string;
  title: string;
  version: string;
  time: {
    created: number;
    updated: number;
  };
}

export interface SessionCreatedEvent {
  type: "session.created";
  properties: {
    info: SessionInfo;
  };
}

export interface GlobalEvent {
  directory: string;
  payload: {
    type: string;
    properties: Record<string, unknown>;
  };
}

export type OpenCodeEventHandler = (event: GlobalEvent) => void;

export class OpenCodeClient {
  private eventSource: EventSource | null = null;
  private baseUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private onEvent: OpenCodeEventHandler | null = null;
  private onConnect: (() => void) | null = null;
  private onDisconnect: (() => void) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  setEventHandler(handler: OpenCodeEventHandler) {
    this.onEvent = handler;
  }

  setConnectHandler(handler: () => void) {
    this.onConnect = handler;
  }

  setDisconnectHandler(handler: () => void) {
    this.onDisconnect = handler;
  }

  connect(): void {
    // Close any existing connection before creating a new one
    // This prevents duplicate EventSource instances from accumulating
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    const url = `${this.baseUrl}/global/event`;
    log.verbose(`Connecting to ${url}`);

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      log.verbose("SSE connection opened");
      this.reconnectAttempts = 0;
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as GlobalEvent | { payload: { type: string } };

        // Handle connection events
        if (data.payload?.type === "server.connected") {
          log.verbose("Received server.connected");
          this.onConnect?.();
          return;
        }

        if (data.payload?.type === "server.heartbeat") {
          log.verbose("Received heartbeat");
          return;
        }

        // Forward other events
        if ("directory" in data && this.onEvent) {
          this.onEvent(data as GlobalEvent);
        }
      } catch (error) {
        log.verbose(
          `Failed to parse event: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    };

    this.eventSource.onerror = () => {
      log.verbose("SSE error occurred");
      this.onDisconnect?.();

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        log.verbose(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(), delay);
      } else {
        log.error("Max reconnection attempts reached");
        this.disconnect();
      }
    };
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      log.verbose("SSE connection closed");
    }
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
