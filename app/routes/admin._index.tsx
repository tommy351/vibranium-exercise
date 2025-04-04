import { MetaFunction } from "@remix-run/node";
import { PageTitle } from "~/components/admin/page-title";

export const meta: MetaFunction = () => {
  return [{ title: "Dashboard" }];
};

export default function AdminIndexPage() {
  return (
    <>
      <PageTitle>Dashboard</PageTitle>
    </>
  );
}
