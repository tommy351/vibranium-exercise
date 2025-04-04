import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { data, Link, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { commitSession, getSession } from "~/session.server";
import { generateCodeChallenge } from "~/util.server/pkce";
import { buildAuthUrl } from "~/util.server/slack/oauth";

export const meta: MetaFunction = () => {
  return [{ title: "Log in" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const { verifier, challenge } = generateCodeChallenge();

  session.flash("codeVerifier", verifier);

  const res = data({
    authUrl: buildAuthUrl({ codeChallenge: challenge }).toString(),
  });

  await commitSession(res, session);

  return res;
}

export default function LoginPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-svh w-full items-center justify-center">
      <Button asChild>
        <Link to={data.authUrl}>Log in with Slack</Link>
      </Button>
    </div>
  );
}
