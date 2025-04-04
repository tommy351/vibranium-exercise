import { BASE_URL, requireEnv } from "~/util.server/env";
import { logger } from "../log";
import { z } from "zod";
import { createRemoteJWKSet, jwtVerify } from "jose";

const CLIENT_ID = requireEnv("SLACK_CLIENT_ID");
const CLIENT_SECRET = requireEnv("SLACK_CLIENT_SECRET");
const REDIRECT_URI = new URL("/oauth/slack", BASE_URL).toString();
const SCOPE = ["openid", "profile", "email"].join(" ");

const jwks = createRemoteJWKSet(
  new URL("https://slack.com/openid/connect/keys"),
);

export function buildAuthUrl({ codeChallenge }: { codeChallenge: string }) {
  const url = new URL("https://slack.com/openid/connect/authorize");

  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("response_type", "code");

  return url.toString();
}

const tokenSchema = z.object({
  ok: z.literal(true),
  id_token: z.string(),
});

export async function getToken({
  code,
  codeVerifier,
}: {
  code: string;
  codeVerifier: string;
}) {
  const res = await fetch("https://slack.com/api/openid.connect.token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: codeVerifier,
    }).toString(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch((err) => {
      logger.warn({ err }, "Failed to read response body");
      return "";
    });

    throw new Error(`Failed to exchange access token: ${res.status} ${text}`);
  }

  const body = await res.json();
  const token = await tokenSchema.parseAsync(body);
  const { payload } = await jwtVerify(token.id_token, jwks, {
    issuer: "https://slack.com",
    audience: CLIENT_ID,
  });

  return payload;
}
