# Changelog

All notable changes to this project will be documented in this file.

## [0.0.2] - 2025-01-07

### Added

- New `notify` command for sending direct push notifications
  - Usage: `opencody-relay notify <title> <body> [--deeplink <url>]`
  - Can run independently of the `relay` command
  - Useful for automation and routines

- New shared notification service (`src/services/notification.ts`)
  - Centralized notification logic used by both `relay` and `notify` commands

### Changed

- Renamed `start` command to `relay`
  - Better reflects the command's purpose: relaying events from OpenCode
  - Usage: `opencody-relay relay [--opencode-url <url>] [--verbose]`

- Default `sessionCreated` event to `false`
  - Session creation notifications are now opt-in
  - Avoids unwanted notifications when creating sessions from different clients

- Simplified `NotificationPayload` structure
  - Now uses generic `{ title, body, deeplink? }` format
  - More flexible for different notification types

### Removed

- Removed `start` command (replaced by `relay`)

## [0.0.1] - Initial Release

### Added

- Initial release of opencody-relay
- `pair` command for pairing with mobile device via QR code
- `unpair` command for removing paired device
- `status` command for showing configuration
- `start` command for relaying OpenCode events (now `relay`)
- `test` command for sending test notifications
- `config set` command for managing configuration
- End-to-end encryption using NaCl (X25519 + XSalsa20-Poly1305)
- SSE connection to OpenCode server
- Push notifications via Expo Push Service
