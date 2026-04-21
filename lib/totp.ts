/**
 * TOTP implementation using Node.js built-in crypto (RFC 6238 / RFC 4226).
 * No external dependencies — works reliably with Turbopack.
 */
import crypto from "crypto"

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function base32Decode(encoded: string): Buffer {
  const s = encoded.toUpperCase().replace(/=+$/, "")
  let bits = 0, value = 0
  const out: number[] = []
  for (const ch of s) {
    const idx = BASE32.indexOf(ch)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = ""
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 0x1f]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 0x1f]
  return out
}

function hotp(secretBytes: Buffer, counter: number): string {
  const buf = Buffer.alloc(8)
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buf.writeUInt32BE(counter >>> 0, 4)
  const hmac = crypto.createHmac("sha1", secretBytes).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(code % 1_000_000).padStart(6, "0")
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20))
}

export function getTotpauthUrl(email: string, issuer: string, secret: string): string {
  const label = encodeURIComponent(`${issuer}:${email}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`
}

/** Verifies a 6-digit TOTP code. Allows ±1 window (30s clock drift). */
export function verifyTotp(token: string, secret: string): boolean {
  const secretBytes = base32Decode(secret)
  const counter = Math.floor(Date.now() / 30_000)
  for (const drift of [-1, 0, 1]) {
    if (hotp(secretBytes, counter + drift) === token) return true
  }
  return false
}
