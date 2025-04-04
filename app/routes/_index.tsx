import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [{ title: "Home page" }];
};

export default function Index() {
  return (
    <div>
      <div>Home page</div>
      <div>
        <Link to="/admin">Admin</Link>
      </div>
    </div>
  );
}
