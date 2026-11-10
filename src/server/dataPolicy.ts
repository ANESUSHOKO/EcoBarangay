function isTrueLike(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  return value.trim().toLowerCase() === 'true';
}

export function shouldLoadDemoData(isProductionRuntime: boolean, enabled?: string | boolean): boolean {
  return !isProductionRuntime && isTrueLike(enabled);
}

export function shouldImportLegacyData(isProductionRuntime: boolean, enabled?: string | boolean): boolean {
  return !isProductionRuntime && isTrueLike(enabled);
}
