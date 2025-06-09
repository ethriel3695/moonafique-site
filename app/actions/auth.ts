'use server';

import { signOut } from '@workos-inc/authkit-nextjs';

export async function handleSignOut() {
  await signOut({
    returnTo:
      process.env.NEXT_PUBLIC_WORKOS_LOGOUT_REDIRECT_URI ||
      'http://localhost:3000',
  });
}
