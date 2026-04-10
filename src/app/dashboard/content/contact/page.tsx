import { redirect } from "next/navigation";

/**
 * Contact copy and webhooks are validated on Site settings (/dashboard/content/site)
 * via validateSiteSettingsForm (recipient email, HTTPS webhooks).
 */
export default function DashboardContactEditorRedirect() {
  redirect("/editor/contact");
}
