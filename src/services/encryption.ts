import nacl from "tweetnacl";
import tweetnaclUtil from "tweetnacl-util";

const { encodeBase64, decodeBase64 } = tweetnaclUtil;

export interface EncryptedPayload {
  encrypted: string;
  nonce: string;
  ephemeralPublicKey: string;
}

export function encryptPayload(
  payload: object,
  recipientPublicKeyBase64: string
): EncryptedPayload {
  const recipientPublicKey = decodeBase64(recipientPublicKeyBase64);
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
    ephemeralPublicKey: encodeBase64(ephemeralKeypair.publicKey),
  };
}

export function decryptPayload(
  encrypted: string,
  nonce: string,
  ephemeralPublicKey: string,
  secretKeyBase64: string
): object | null {
  try {
    const secretKey = decodeBase64(secretKeyBase64);
    const decrypted = nacl.box.open(
      decodeBase64(encrypted),
      decodeBase64(nonce),
      decodeBase64(ephemeralPublicKey),
      secretKey
    );

    if (!decrypted) return null;
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch {
    return null;
  }
}
