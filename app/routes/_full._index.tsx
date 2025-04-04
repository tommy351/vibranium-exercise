import type { MetaFunction } from "@remix-run/node";
import { PageTitle } from "~/components/base/page-title";

export const meta: MetaFunction = () => {
  return [{ title: "Home" }];
};

export default function Index() {
  return (
    <>
      <PageTitle>Home</PageTitle>
    </>
  );
}
