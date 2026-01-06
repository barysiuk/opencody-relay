# OpenCody Push Relay - Technical Specification

Version: 1.0.0-draft  
Date: January 2026

## 1. Overview

### 1.1 Purpose

Enable OpenCody mobile app users to receive push notifications when events occur in their local OpenCode sessions, without requiring users to maintain an active connection to their OpenCode server.

### 1.2 Goals

- **Zero infrastructure for users** - No Firebase setup, no API keys
- **End-to-end encryption** - Relay services cannot read notification content
- **Simple UX** - `npm install`, pair, start
- **Cross-platform ready** - Android now, iOS architecture ready
- **Privacy-first** - Minimal data exposure

### 1.3 Scope (v1)

**In Scope:**
- `session.created` notifications only

**Out of Scope (v1):**
- Offline session viewing
- Message sync/storage
- Multi-user/team features
- Session control from notifications
- Multiple paired devices per CLI
- iOS push notifications (requires Apple Developer Account)
- Session idle/error/permission notifications (deferred to v1.1)

### 1.4 Notification Filtering

Since OpenCode does not include origin/client information in events, the mobile app cannot distinguish sessions created remotely vs locally based on the event payload alone.

**Solution:** The mobile app suppresses notifications for sessions that are currently active in the app. If the user is viewing or interacting with a session, notifications for that session are not shown.

| Scenario | Notification Shown? |
|----------|---------------------|
| Session created while app is in background | Yes |
| Session created while app is in foreground, different session active | Yes |
| Session created while app is in foreground, that session is active | No |
| Session created by user in mobile app | No (session becomes active immediately) |

---

## 2. Architecture

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                   User's Machine                                 │
│                                                                  │
│  ┌──────────────┐         ┌──────────────────────────────────┐ │
│  │   OpenCode   │   SSE   │   opencody-relay (CLI)           │ │
│  │   Server     │────────▶│                                  │ │
│  │   :3000      │         │   Config: ~/.config/opencody/    │ │
│  └──────────────┘         │           relay.config.json      │ │
│                           └──────────────────┬───────────────┘ │
└──────────────────────────────────────────────┼──────────────────┘
                                               │
                        HTTPS POST (encrypted payload)
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Expo Push Service                              │
│                                                                  │
│   https://exp.host/--/api/v2/push/send                          │
│                                                                  │
│   - Free, no authentication required                            │
│   - Routes to FCM (Android) / APNs (iOS)                        │
│   - Cannot decrypt payload content                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OpenCody Mobile App                            │
│                                                                  │
│   - Receives encrypted data payload                             │
│   - Decrypts with private key                                   │
│   - Displays local notification                                 │
│   - Tap → Opens app → Connects to OpenCode                      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

1. **Pairing**: Mobile app generates credentials, displays pairing code
2. **Configuration**: CLI stores device credentials locally
3. **Event Detection**: CLI subscribes to OpenCode SSE events
4. **Encryption**: CLI encrypts event payload with device's public key
5. **Delivery**: CLI sends encrypted payload via Expo Push API
6. **Decryption**: Mobile app decrypts and displays notification

---

## 3. Encryption Protocol

### 3.1 Algorithm

- **Key Exchange**: X25519 (Curve25519 ECDH)
- **Encryption**: XSalsa20-Poly1305 (authenticated encryption)
- **Library**: TweetNaCl (both CLI and mobile app)

### 3.2 Key Generation (Mobile App)

```typescript
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

// Generate keypair on first launch
const keypair = nacl.box.keyPair();
// keypair.publicKey: Uint8Array (32 bytes)
// keypair.secretKey: Uint8Array (32 bytes)

// Store secretKey in secure storage (expo-secure-store)
// Share publicKey via pairing code
```

### 3.3 Encryption (CLI)

```typescript
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

function encryptPayload(
  payload: object,
  recipientPublicKey: Uint8Array
): { encrypted: string; nonce: string; ephemeralPublicKey: string } {
  const message = new TextEncoder().encode(JSON.stringify(payload));
  const nonce = nacl.randomBytes(24);
  
  // Generate ephemeral keypair for forward secrecy
  const ephemeralKeypair = nacl.box.keyPair();
  
  const encrypted = nacl.box(
    message,
    nonce,
    recipientPublicKey,
    ephemeralKeypair.secretKey
  );
  
  return {
    encrypted: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
    ephemeralPublicKey: encodeBase64(ephemeralKeypair.publicKey)
  };
}
```

### 3.4 Decryption (Mobile App)

```typescript
import nacl from 'tweetnacl';
import { decodeBase64 } from 'tweetnacl-util';

function decryptPayload(
  encrypted: string,
  nonce: string,
  ephemeralPublicKey: string,
  secretKey: Uint8Array
): object | null {
  const decrypted = nacl.box.open(
    decodeBase64(encrypted),
    decodeBase64(nonce),
    decodeBase64(ephemeralPublicKey),
    secretKey
  );
  
  if (!decrypted) return null;
  
  return JSON.parse(new TextDecoder().decode(decrypted));
}
```

---

## 4. CLI Specification (`opencody-relay`)

### 4.1 Installation

```bash
# npm (cross-platform)
npm install -g opencody-relay
```

### 4.2 Commands

#### `opencody-relay pair`

Pair with a mobile device.

```
$ opencody-relay pair

OpenCody Relay - Device Pairing
===============================

1. Open OpenCody app on your phone
2. Go to Settings → Push Notifications
3. Tap "Enable" and then "Pair with Relay"
4. Copy the pairing code and paste it below

Pairing code: █

> eyJ2IjoxLCJ0IjoiRXhwb25lbnRQdXNoVG9rZW4uLi4iLCJwayI6Ii4uLiIsIm4iOiJQaXhlbCA4In0=

✓ Device paired successfully!
  Name: Pixel 8

Run 'opencody-relay start' to begin receiving notifications.
```

#### `opencody-relay start`

Start the relay service (foreground).

```
$ opencody-relay start

OpenCody Relay v1.0.0
=====================
OpenCode: http://localhost:3000
Device:   Pixel 8

✓ Connected to OpenCode server
  Listening for events...

[12:34:56] Session created: "Fix login bug"
[12:34:56] → Notification sent
[12:35:10] Session idle: "Fix login bug"
[12:35:10] → Notification sent
```

Options:
- `--opencode-url <url>` - Override OpenCode URL (default: http://localhost:3000)
- `--verbose` - Show detailed logs

#### `opencody-relay status`

Show current configuration and status.

```
$ opencody-relay status

OpenCody Relay Status
=====================
Config: ~/.config/opencody/relay.config.json

OpenCode URL: http://localhost:3000
Paired Device: Pixel 8
Events Enabled:
  - Session created: ✓
```

#### `opencody-relay unpair`

Remove paired device.

```
$ opencody-relay unpair

Remove paired device "Pixel 8"? (y/N) y
✓ Device removed

Run 'opencody-relay pair' to pair a new device.
```

#### `opencody-relay test`

Send a test notification.

```
$ opencody-relay test

Sending test notification to Pixel 8...
✓ Notification sent successfully
```

#### `opencody-relay config set <key> <value>`

Update configuration.

```
$ opencody-relay config set opencode.url http://localhost:4000
✓ Updated opencode.url

$ opencody-relay config set events.sessionCreated false
✓ Updated events.sessionCreated
```

### 4.3 Configuration File

Location: `~/.config/opencody/relay.config.json`

```json
{
  "version": 1,
  "opencode": {
    "url": "http://localhost:3000"
  },
  "device": {
    "name": "Pixel 8",
    "token": "ExponentPushToken[xxxxxxxxxxxxxx]",
    "publicKey": "base64_encoded_public_key",
    "pairedAt": "2026-01-05T12:00:00.000Z"
  },
  "events": {
    "sessionCreated": true
  }
}
```

### 4.4 OpenCode Events

#### V1 Events (session.created only)

| OpenCode Event | Trigger | Notification |
|----------------|---------|--------------|
| `session.created` | New session starts | Title: "New Session", Body: "{session title}" |

#### V1.1 Events (future)

| OpenCode Event | Trigger | Notification |
|----------------|---------|--------------|
| `session.idle` | Session completes | Title: "Session Complete", Body: "{session title}" |
| `session.error` | Session errors | Title: "Session Error", Body: "{session title}" |
| `message.part.updated` | Permission requested | Title: "Permission Needed", Body: "{tool} wants to {action}" |

### 4.5 OpenCode SSE Event Structure

The CLI subscribes to `GET /global/event` which returns events in the following format:

```typescript
interface GlobalEvent {
  directory: string;  // OpenCode instance directory
  payload: {
    type: string;
    properties: Record<string, unknown>;
  };
}

// Example: session.created event
{
  "directory": "/Users/dev/my-project",
  "payload": {
    "type": "session.created",
    "properties": {
      "info": {
        "id": "ses_abc123",
        "projectID": "proj_xyz",
        "directory": "/Users/dev/my-project",
        "title": "Fix login bug",
        "version": "1.0.0",
        "time": {
          "created": 1704456000,
          "updated": 1704456000
        }
      }
    }
  }
}
```

### 4.6 Encrypted Notification Payload

The CLI encrypts the following payload before sending via Expo Push:

```typescript
interface NotificationPayload {
  type: 'session.created';
  sessionId: string;
  title: string;
  directory: string;
  timestamp: number;
}

// Example
{
  "type": "session.created",
  "sessionId": "ses_abc123",
  "title": "Fix login bug",
  "directory": "/Users/dev/my-project",
  "timestamp": 1704456000
}
```

### 4.7 Expo Push API Integration

```typescript
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data: {
    encrypted: string;
    nonce: string;
    ephemeralPublicKey: string;
  };
  sound: 'default';
  priority: 'high';
}

async function sendPush(message: ExpoPushMessage): Promise<boolean> {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  
  const result = await response.json();
  return result.data?.status !== 'error';
}
```

### 4.8 Project Structure

```
opencody-relay/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/
│   │   ├── pair.ts           # Pair device command
│   │   ├── start.ts          # Start relay command
│   │   ├── status.ts         # Show status command
│   │   ├── unpair.ts         # Remove device command
│   │   ├── test.ts           # Test notification command
│   │   └── config.ts         # Config management command
│   ├── services/
│   │   ├── opencode.ts       # OpenCode SSE client
│   │   ├── expo-push.ts      # Expo Push API client
│   │   └── encryption.ts     # NaCl encryption
│   ├── config/
│   │   └── index.ts          # Config file management
│   └── utils/
│       └── logger.ts         # Console output formatting
├── package.json
├── tsconfig.json
└── README.md
```

### 4.9 Dependencies

```json
{
  "name": "opencody-relay",
  "version": "1.0.0",
  "bin": {
    "opencody-relay": "./dist/index.js"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "eventsource": "^2.0.0",
    "tweetnacl": "^1.0.3",
    "tweetnacl-util": "^0.15.1",
    "chalk": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsup": "^8.0.0"
  }
}
```

---

## 5. Mobile App Specification

### 5.1 New Dependencies

Add to `app/package.json`:

```json
{
  "expo-notifications": "~0.28.0",
  "expo-secure-store": "~13.0.0",
  "expo-device": "~6.0.0",
  "tweetnacl": "^1.0.3",
  "tweetnacl-util": "^0.15.1"
}
```

### 5.2 New Files

```
app/src/
├── services/
│   └── push/
│       ├── index.ts              # Main export
│       ├── registration.ts       # Push token registration
│       ├── encryption.ts         # Keypair & decryption
│       └── handler.ts            # Incoming push handler
├── stores/
│   └── pushStore.ts              # Push state management
└── components/
    └── settings/
        └── PushSettings.tsx      # Settings UI component
```

### 5.3 Push Store

```typescript
// stores/pushStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PushState {
  enabled: boolean;
  expoPushToken: string | null;
  publicKey: string | null;
  isPaired: boolean;
  activeSessionId: string | null;  // Currently viewed/active session
  
  setEnabled: (enabled: boolean) => void;
  setExpoPushToken: (token: string) => void;
  setPublicKey: (key: string) => void;
  setIsPaired: (paired: boolean) => void;
  setActiveSessionId: (sessionId: string | null) => void;
  reset: () => void;
}

export const usePushStore = create<PushState>()(
  persist(
    (set) => ({
      enabled: false,
      expoPushToken: null,
      publicKey: null,
      isPaired: false,
      activeSessionId: null,
      
      setEnabled: (enabled) => set({ enabled }),
      setExpoPushToken: (token) => set({ expoPushToken: token }),
      setPublicKey: (key) => set({ publicKey: key }),
      setIsPaired: (paired) => set({ isPaired: paired }),
      setActiveSessionId: (sessionId) => set({ activeSessionId: sessionId }),
      reset: () => set({
        enabled: false,
        expoPushToken: null,
        publicKey: null,
        isPaired: false,
        activeSessionId: null,
      }),
    }),
    {
      name: 'push-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist activeSessionId - it's runtime state only
      partialize: (state) => ({
        enabled: state.enabled,
        expoPushToken: state.expoPushToken,
        publicKey: state.publicKey,
        isPaired: state.isPaired,
      }),
    }
  )
);
```

### 5.4 Encryption Service

```typescript
// services/push/encryption.ts
import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

const PRIVATE_KEY_KEY = 'opencody_push_private_key';

export async function generateKeypair(): Promise<string> {
  const keypair = nacl.box.keyPair();
  
  await SecureStore.setItemAsync(
    PRIVATE_KEY_KEY,
    encodeBase64(keypair.secretKey)
  );
  
  return encodeBase64(keypair.publicKey);
}

export async function getPrivateKey(): Promise<Uint8Array | null> {
  const stored = await SecureStore.getItemAsync(PRIVATE_KEY_KEY);
  if (!stored) return null;
  return decodeBase64(stored);
}

export async function decryptPayload(
  encrypted: string,
  nonce: string,
  ephemeralPublicKey: string
): Promise<object | null> {
  const privateKey = await getPrivateKey();
  if (!privateKey) return null;
  
  try {
    const decrypted = nacl.box.open(
      decodeBase64(encrypted),
      decodeBase64(nonce),
      decodeBase64(ephemeralPublicKey),
      privateKey
    );
    
    if (!decrypted) return null;
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch {
    return null;
  }
}

export async function hasKeypair(): Promise<boolean> {
  const key = await SecureStore.getItemAsync(PRIVATE_KEY_KEY);
  return key !== null;
}
```

### 5.5 Push Registration

```typescript
// services/push/registration.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return null;
  }
  
  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'OpenCode Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export function getDeviceName(): string {
  return Device.modelName || Device.deviceName || 'Unknown Device';
}
```

### 5.6 Push Handler

```typescript
// services/push/handler.ts
import * as Notifications from 'expo-notifications';
import { decryptPayload } from './encryption';
import { usePushStore } from '../../stores/pushStore';

interface DecryptedNotification {
  type: 'session.created';
  sessionId: string;
  title: string;
  directory: string;
  timestamp: number;
}

// Configure notification handler with active session filtering
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    
    // Try to decrypt and check if this is for the active session
    if (data?.encrypted && data?.nonce && data?.ephemeralPublicKey) {
      const decrypted = await decryptPayload(
        data.encrypted as string,
        data.nonce as string,
        data.ephemeralPublicKey as string
      ) as DecryptedNotification | null;
      
      if (decrypted) {
        const activeSessionId = usePushStore.getState().activeSessionId;
        
        // Suppress notification if this session is currently active in the app
        if (activeSessionId && decrypted.sessionId === activeSessionId) {
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }
      }
    }
    
    // Show notification normally
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

export function setupPushHandler(onNotificationTap?: (sessionId: string) => void) {
  // Handle notification tap
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const sessionId = response.notification.request.content.data?.sessionId as string;
      if (sessionId && onNotificationTap) {
        onNotificationTap(sessionId);
      }
    }
  );
  
  return () => subscription.remove();
}

export async function handleIncomingPush(
  data: { encrypted?: string; nonce?: string; ephemeralPublicKey?: string }
): Promise<DecryptedNotification | null> {
  if (!data.encrypted || !data.nonce || !data.ephemeralPublicKey) {
    return null;
  }
  
  return decryptPayload(
    data.encrypted,
    data.nonce,
    data.ephemeralPublicKey
  ) as Promise<DecryptedNotification | null>;
}
```

### 5.7 Active Session Tracking

The mobile app must track which session is currently active to suppress duplicate notifications.

```typescript
// Example: In session view component or navigation
import { usePushStore } from '../stores/pushStore';
import { useEffect } from 'react';

function useTrackActiveSession(sessionId: string | null) {
  const setActiveSessionId = usePushStore((state) => state.setActiveSessionId);
  
  useEffect(() => {
    setActiveSessionId(sessionId);
    
    // Clear when unmounting or navigating away
    return () => setActiveSessionId(null);
  }, [sessionId, setActiveSessionId]);
}

// Usage in SessionScreen
function SessionScreen({ route }) {
  const { sessionId } = route.params;
  
  // Track this session as active - notifications for it will be suppressed
  useTrackActiveSession(sessionId);
  
  // ... rest of component
}
```

**Important:** When a user creates a new session in the mobile app, the session becomes active immediately (before the push notification arrives), so the notification is automatically suppressed.

### 5.8 Pairing Code Generation

```typescript
// services/push/index.ts
import { getDeviceName } from './registration';

interface PairingData {
  v: 1;
  t: string;   // Expo push token
  pk: string;  // Public key (base64)
  n: string;   // Device name
}

export function generatePairingCode(
  token: string,
  publicKey: string
): string {
  const data: PairingData = {
    v: 1,
    t: token,
    pk: publicKey,
    n: getDeviceName(),
  };
  
  // Base64 encode for easy copy-paste
  return btoa(JSON.stringify(data));
}

export function parsePairingCode(code: string): PairingData | null {
  try {
    const decoded = JSON.parse(atob(code));
    if (decoded.v === 1 && decoded.t && decoded.pk && decoded.n) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}
```

---

## 6. Pairing Flow

### 6.1 Sequence

```
┌─────────────────┐                              ┌─────────────────┐
│   Mobile App    │                              │       CLI       │
└────────┬────────┘                              └────────┬────────┘
         │                                                │
         │  1. User taps "Enable Push Notifications"      │
         │  2. App requests notification permission       │
         │  3. App gets Expo push token                   │
         │  4. App generates encryption keypair           │
         │  5. App stores private key in SecureStore      │
         │  6. App generates pairing code                 │
         │  7. App displays code with "Copy" button       │
         │                                                │
         │                                 8. User runs:  │
         │                                    pair cmd    │
         │                                                │
         │                                 9. CLI prompts │
         │                                    for code    │
         │                                                │
         │  10. User copies code and pastes in CLI ──────▶│
         │                                                │
         │                                 11. CLI parses │
         │                                     & stores   │
         │                                     config     │
         │                                                │
         │                                 12. CLI sends  │
         │                                     test push  │
         │◀─────────────────────────────────────────────  │
         │  13. App receives & shows test notification    │
         │                                                │
         ▼                                                ▼
    Ready to receive                              Ready to send
```

### 6.2 Pairing Code Format

```
Base64 encoded JSON:
{
  "v": 1,                                    // Protocol version
  "t": "ExponentPushToken[xxxxxx]",          // Expo push token
  "pk": "base64_encoded_public_key",         // X25519 public key (32 bytes)
  "n": "Pixel 8"                             // Device name (auto-detected)
}

Example:
eyJ2IjoxLCJ0IjoiRXhwb25lbnRQdXNoVG9rZW5bYWJjMTIzXSIsInBrIjoiTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFIiwibiI6IlBpeGVsIDgifQ==
```

---

## 7. Security Considerations

### 7.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| Push token stolen | Tokens only allow sending TO device, not reading |
| Payload intercepted | End-to-end encrypted with NaCl box |
| Expo service compromised | Payload encrypted, Expo cannot read content |
| CLI config file stolen | Contains only public key + token (not secrets) |
| Phone compromised | Private key in secure storage |

### 7.2 What's Protected

- Session titles and content
- Error messages
- Tool names and actions
- All notification payload data

### 7.3 What's Exposed (Metadata)

- Timing of notifications
- Device push token (needed for routing)
- Notification frequency

---

## 8. Error Handling

### 8.1 CLI Errors

| Error | Handling |
|-------|----------|
| OpenCode not reachable | Show error, retry with backoff |
| Invalid pairing code | Show error, prompt to retry |
| Push delivery failed | Log error, continue listening |
| No device paired | Prompt to run `pair` command |

### 8.2 Mobile App Errors

| Error | Handling |
|-------|----------|
| Permission denied | Show explanation, link to settings |
| Decryption failed | Log silently, don't show notification |
| Invalid push data | Ignore silently |
| Active session match | Suppress notification (expected behavior) |

---

## 9. Implementation Phases

### Phase 1: CLI Foundation
- Project setup (TypeScript, tsup)
- Config file management
- Commander CLI structure
- Basic commands: `pair`, `status`, `unpair`

### Phase 2: CLI Core Features
- OpenCode SSE client (`/global/event` endpoint)
- `session.created` event handling only (v1 scope)
- Encryption implementation
- Expo Push API client
- `start` and `test` commands

### Phase 3: Mobile Foundation
- Add dependencies
- Push registration service
- Permission handling
- Expo push token retrieval

### Phase 4: Mobile Encryption
- Keypair generation
- Secure storage
- Decryption handler
- Pairing code generation

### Phase 5: Mobile UI & Filtering
- Push settings section in Settings screen
- Pairing flow UI
- Copy pairing code functionality
- Status display
- Active session tracking (`activeSessionId` in store)
- Notification suppression for active sessions

### Phase 6: Integration Testing
- End-to-end pairing test
- Notification delivery test
- Active session suppression test
- Error case handling
- Documentation

---

## 10. Future Considerations

### Version 1.1

- Additional event types:
  - `session.idle` - Session completes
  - `session.error` - Session errors  
  - `permission.requested` - Tool permission needed
- Configurable event filtering in CLI

### Version 2

- iOS push notifications (Apple Developer Account)
- Multiple paired devices
- Notification history in app
- Background/daemon mode for CLI
- Homebrew formula

### Self-Hosting Option

- Document: Firebase Cloud Functions as alternative relay
- CLI flag: `--push-service-url <url>` for custom relay
