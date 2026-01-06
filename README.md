# opencody-relay

Push notification relay for the OpenCody mobile app. Sends encrypted push notifications when new sessions are created in OpenCode.

## Installation

```bash
npm install -g opencody-relay
```

## Quick Start

1. **Pair with your mobile device:**
   ```bash
   opencody-relay pair
   ```
   Follow the prompts to enter the pairing code from the OpenCody app.

2. **Start the relay:**
   ```bash
   opencody-relay start
   ```

## Commands

| Command | Description |
|---------|-------------|
| `opencody-relay pair` | Pair with a mobile device |
| `opencody-relay unpair` | Remove paired device |
| `opencody-relay status` | Show configuration and status |
| `opencody-relay start` | Start the relay service |
| `opencody-relay test` | Send a test notification |
| `opencody-relay config set <key> <value>` | Update configuration |

### Start Options

```bash
opencody-relay start [options]

Options:
  -u, --opencode-url <url>  Override OpenCode URL (default: http://localhost:3000)
  -v, --verbose             Show detailed logs
```

### Configuration Keys

| Key | Description | Default |
|-----|-------------|---------|
| `opencode.url` | OpenCode server URL | `http://localhost:3000` |
| `events.sessionCreated` | Send notifications for new sessions | `true` |

## How It Works

1. The relay connects to your local OpenCode server via SSE (Server-Sent Events)
2. When a new session is created, the relay encrypts the notification payload
3. The encrypted payload is sent via Expo Push Service to your mobile device
4. The OpenCody app decrypts and displays the notification

## Security

- **End-to-end encryption**: All notification content is encrypted using X25519 + XSalsa20-Poly1305
- **Forward secrecy**: Each notification uses a unique ephemeral keypair
- **Privacy-first**: The relay service (Expo) cannot read notification content

## Requirements

- Node.js 18+
- OpenCode server running locally
- OpenCody mobile app (for pairing)

## License

MIT
