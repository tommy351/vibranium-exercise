import { createHash, randomBytes } from "crypto";

export function generateCodeChallenge() {
  const verifier = randomBytes(32);

  return {
    verifier: verifier.toString("base64url"),
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}
