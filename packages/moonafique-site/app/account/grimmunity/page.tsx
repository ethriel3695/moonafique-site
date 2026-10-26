import { withAuth } from "@workos-inc/authkit-nextjs";
import {
  AccountContent,
  ClubShell,
  SandboxBanner,
} from "@/components/grimmunity/views";
import { accountView } from "@/lib/grimmunity/queries";
import { club, grimMode } from "@/lib/grimmunity/runtime";
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  let stale = false;
  try {
    await club().refreshMemberships(user.id);
  } catch {
    stale = true;
  }
  let view;
  try {
    view = await accountView(user.id);
  } catch {
    return (
      <ClubShell>
        <h1 className="text-4xl">My Grimmunity</h1>
        <p role="alert" className="mt-6">
          Membership information is temporarily unavailable. Please try again
          later.
        </p>
      </ClubShell>
    );
  }
  return (
    <ClubShell>
      {grimMode() === "sandbox" && <SandboxBanner />}
      {stale && (
        <p role="status" className="mb-6 rounded-2xl border p-4">
          Showing the last saved membership details. Billing updates could not
          be refreshed just now.
        </p>
      )}
      <AccountContent view={view} />
    </ClubShell>
  );
}
