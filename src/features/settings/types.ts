/** What the settings page shows about the signed-in account. */
export type AccountSummary = {
  name: string | null;
  email: string;
  emailVerified: boolean;
  /** False for OAuth-only accounts, which have no password to change. */
  hasPassword: boolean;
};
