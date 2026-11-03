export function isBootstrapSystemAdmin(
  email: string | undefined,
  uid: string | undefined,
  configuredEmail: string | undefined,
  configuredUid: string | undefined,
  allowEmailOnly = false,
): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedConfiguredEmail = configuredEmail?.trim().toLowerCase();
  const normalizedUid = uid?.trim();
  const normalizedConfiguredUid = configuredUid?.trim();
  if (!normalizedEmail || !normalizedConfiguredEmail || normalizedEmail !== normalizedConfiguredEmail) return false;
  if (allowEmailOnly) return true;
  return Boolean(normalizedUid && normalizedConfiguredUid && normalizedUid === normalizedConfiguredUid);
}
