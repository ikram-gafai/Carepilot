import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

const SCRYPT_KEYLEN = 64
const SCRYPT_SALT_LEN = 16
const SCRYPT_N = 16384
const SCRYPT_r = 8
const SCRYPT_p = 1

/** Encode as `saltHex:hashHex` for storage in `password_hash`. */
export function hashPassword(plain: string): string {
  const salt = randomBytes(SCRYPT_SALT_LEN)
  const hash = scryptSync(plain, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p })
  return `${salt.toString("hex")}:${hash.toString("hex")}`
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split(":")
  if (parts.length !== 2) return false
  const [saltHex, hashHex] = parts
  if (!saltHex || !hashHex) return false
  let salt: Buffer
  let expected: Buffer
  try {
    salt = Buffer.from(saltHex, "hex")
    expected = Buffer.from(hashHex, "hex")
  } catch {
    return false
  }
  if (salt.length !== SCRYPT_SALT_LEN || expected.length !== SCRYPT_KEYLEN) return false
  const actual = scryptSync(plain, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p })
  return timingSafeEqual(actual, expected)
}
