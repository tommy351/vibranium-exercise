import {
  type LoaderFunctionArgs,
  redirect,
  type Session,
} from "@remix-run/node";
import { z } from "zod";
import { insertUser } from "~/db.server/user";
import {
  commitSession,
  getSession,
  type SessionData,
  type SessionFlashData,
} from "~/session.server";
import { logger } from "~/util.server/log";
import { getToken } from "~/util.server/slack/oauth";

const idTokenSchema = z.object({
  sub: z.string(),
  "https://slack.com/team_id": z.string(),
  email: z.string().nullish(),
  name: z.string().nullish(),
  given_name: z.string().nullish(),
  family_name: z.string().nullish(),
});

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

  let token: Awaited<ReturnType<typeof getToken>>;

  try {
    token = await getToken({ code, codeVerifier });
  } catch (err) {
    logger.error({ err }, "Failed to get token");
    return redirect("/login");
  }

  const idToken = idTokenSchema.parse(token.idToken);
  const user = await insertUser({
    name: idToken.name,
    email: idToken.email,
    firstName: idToken.given_name,
    lastName: idToken.family_name,
    slackUserId: idToken.sub,
    slackTeamId: idToken["https://slack.com/team_id"],
  });

  session.set("userId", user.id);

  return redirect("/");
}
