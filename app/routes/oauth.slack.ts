import {
  type LoaderFunctionArgs,
  redirect,
  type Session,
} from "@remix-run/node";
import {
  commitSession,
  getSession,
  type SessionData,
  type SessionFlashData,
} from "~/session.server";
import { logger } from "~/util.server/log";
import { getToken } from "~/util.server/slack/oauth";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const res = await handle({ request, session });

  commitSession(res, session);

  return res;
}

async function handle({
  request,
  session,
}: {
  request: Request;
  session: Session<SessionData, SessionFlashData>;
}) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return new Response("Code is required", { status: 400 });

  const codeVerifier = session.get("codeVerifier");
  if (!codeVerifier) return redirect("/login");

  try {
    const token = await getToken({ code, codeVerifier });
    const userId = token.sub;

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    session.set("slackUserId", userId);

    return redirect("/");
  } catch (err) {
    logger.error({ err }, "Failed to get token");

    return redirect("/login");
  }
}
