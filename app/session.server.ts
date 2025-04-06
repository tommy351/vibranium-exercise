import { createCookieSessionStorage, redirect, Session } from "@remix-run/node";
import { requireEnv } from "./util.server/env";

export interface SessionData {
  userId?: string;
}

export interface SessionFlashData {
  codeVerifier?: string;
}

const storage = createCookieSessionStorage<SessionData, SessionFlashData>({
  cookie: {
    name: "vib_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [requireEnv("SESSION_SECRET")],
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
});

export function getSession(request: Request) {
  return storage.getSession(request.headers.get("cookie"));
}

interface ResponseLike {
  init: ResponseInit | null;
}

function getResponseHeaders(res: Response | ResponseLike): Headers {
  if (res instanceof Response) {
    return res.headers;
  }

  const headers = new Headers(res.init?.headers);
  res.init = { ...res.init, headers };

  return headers;
}

function appendCookie(res: Response | ResponseLike, value: string) {
  const headers = getResponseHeaders(res);
  headers.append("set-cookie", value);
}

export async function commitSession(
  response: Response | ResponseLike,
  session: Session<SessionData, SessionFlashData>,
) {
  const value = await storage.commitSession(session);
  appendCookie(response, value);
}

export async function requireLogin(request: Request) {
  const session = await getSession(request);
  const userId = session.get("userId");

  if (!userId) {
    throw redirect("/login");
  }

  return { userId };
}
