export function shouldLoadDemoData(isProductionRuntime: boolean, enabled?: string): boolean {
  return !isProductionRuntime && enabled === 'true';
}

export function shouldImportLegacyData(isProductionRuntime: boolean, enabled?: string): boolean {
  return !isProductionRuntime && enabled === 'true';
}
