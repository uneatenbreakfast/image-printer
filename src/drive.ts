// Client-side Google Drive access via service account JWT (WebCrypto signing).
// No proxy needed. Service account JSON + Drive file ID are stored in localStorage.

const LS_KEY_SA = "imagePrinter.serviceAccountJson";
const LS_KEY_FILE_ID = "imagePrinter.driveFileId";
const SCOPE = "https://www.googleapis.com/auth/drive";

// Default working Drive file ID (prefilled when none stored in localStorage)
const DEFAULT_FILE_ID = "1Sf7TYXBT7Oghfms4U3diKjzRvjvDY2Ge";

export interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export function getServiceAccount(): ServiceAccountKey | null {
  try {
    const raw = localStorage.getItem(LS_KEY_SA);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setServiceAccount(json: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.client_email || !parsed.private_key) {
      return { ok: false, error: "Missing client_email or private_key" };
    }
    localStorage.setItem(LS_KEY_SA, JSON.stringify(parsed));
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: `Invalid JSON: ${e.message}` };
  }
}

export function clearServiceAccount() {
  localStorage.removeItem(LS_KEY_SA);
}

export function getDriveFileId(): string {
  return localStorage.getItem(LS_KEY_FILE_ID) || DEFAULT_FILE_ID;
}

export function setDriveFileId(id: string) {
  localStorage.setItem(LS_KEY_FILE_ID, id.trim());
}

function base64UrlEncode(bytes: Uint8Array | string): string {
  const s = typeof bytes === "string" ? bytes : String.fromCharCode(...bytes);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function textEncode(s: string): ArrayBuffer {
  const buf = new TextEncoder().encode(s);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function pemToDer(pem: string): ArrayBuffer {
  // Line-based strip — works whether PEM contains real newlines or literal \n escapes
  const normalized = pem.split("\\n").join("\n");
  const b64 = normalized
    .split(/\r?\n/)
    .filter(l => !l.includes("BEGIN") && !l.includes("END"))
    .join("")
    .replace(/\s+/g, "");
  // Strict base64 validation — a single stray char (e.g. an '&' from a mangled
  // copy/paste) makes atob throw a cryptic "not correctly encoded" error.
  const invalid = b64.replace(/[A-Za-z0-9+/=]/g, "");
  if (invalid.length > 0) {
    const chars = [...new Set(invalid)].join("");
    throw new Error(
      `Service account private key is corrupted: found invalid base64 character(s) "${chars}". ` +
      `Re-download the service account JSON from Google Cloud Console (IAM → Service Accounts → Keys) and paste it again.`
    );
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const der = pemToDer(pem);
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signJwt(payload: object, privateKeyPem: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const unsigned =
    base64UrlEncode(JSON.stringify(header)) + "." + base64UrlEncode(JSON.stringify(payload));
  const key = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    textEncode(unsigned)
  );
  return unsigned + "." + base64UrlEncode(new Uint8Array(signature));
}

async function getAccessToken(sa: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const payload = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  };
  const jwt = await signJwt(payload, sa.private_key);
  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

export interface DriveReadResult {
  saved: boolean;
  data?: any;
  error?: string;
}

export interface DriveWriteResult {
  ok: boolean;
  error?: string;
}

async function driveFetch(token: string, url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  return res;
}

export async function driveRead(): Promise<DriveReadResult> {
  const sa = getServiceAccount();
  if (!sa) return { saved: false, error: "Service account not configured" };
  const fileId = getDriveFileId();
  if (!fileId) return { saved: false, error: "Drive file ID not set" };

  try {
    const token = await getAccessToken(sa);
    const res = await driveFetch(
      token,
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    );
    if (res.status === 404) return { saved: false };
    if (!res.ok) {
      const text = await res.text();
      return { saved: false, error: `Drive read failed (${res.status}): ${text}` };
    }
    const text = await res.text();
    if (!text.trim()) return { saved: false };
    const data = JSON.parse(text);
    return { saved: true, data };
  } catch (e: any) {
    return { saved: false, error: e.message };
  }
}

export async function driveWrite(state: any): Promise<DriveWriteResult> {
  const sa = getServiceAccount();
  if (!sa) return { ok: false, error: "Service account not configured" };
  const fileId = getDriveFileId();
  if (!fileId) return { ok: false, error: "Drive file ID not set" };

  try {
    const token = await getAccessToken(sa);
    const body = JSON.stringify(state, null, 2);
    const res = await driveFetch(
      token,
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      }
    );
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Drive write failed (${res.status}): ${text}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
