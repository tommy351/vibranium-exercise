import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { commitSession, getSession } from "~/session.server";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request);
  session.unset("userId");

  const res = redirect("/");
  await commitSession(res, session);
  return res;
}
