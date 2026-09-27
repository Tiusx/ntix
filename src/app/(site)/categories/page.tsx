import { buildRedirectMetadata, StaticRedirect } from "@/components/static-redirect";

export const metadata = buildRedirectMetadata("/columns/", "栏目");

export default function CategoriesRedirect() {
  return <StaticRedirect to="/columns/" label="栏目" />;
}
