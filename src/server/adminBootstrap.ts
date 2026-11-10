function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isBootstrapSystemAdmin(
  email: string | undefined,
  uid: string | undefined,
  configuredEmail: string | undefined,
  configuredUid: string | undefined,
  allowEmailOnly = false,
): boolean {
  const normalizedEmail = normalizeText(email).toLowerCase();
  const normalizedConfiguredEmail = normalizeText(configuredEmail).toLowerCase();
  const normalizedUid = normalizeText(uid);
  const normalizedConfiguredUid = normalizeText(configuredUid);

  if (!normalizedEmail || !normalizedConfiguredEmail || normalizedEmail !== normalizedConfiguredEmail) return false;
  if (allowEmailOnly) return true;
  return Boolean(normalizedUid && normalizedConfiguredUid && normalizedUid === normalizedConfiguredUid);
}
