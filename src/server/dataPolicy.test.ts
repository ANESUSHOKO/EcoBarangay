import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldImportLegacyData, shouldLoadDemoData } from './dataPolicy';

test('demo operational data is disabled unless explicitly enabled locally', () => {
  assert.equal(shouldLoadDemoData(false), false);
  assert.equal(shouldLoadDemoData(false, 'false'), false);
  assert.equal(shouldLoadDemoData(false, 'true'), true);
  assert.equal(shouldLoadDemoData(true, 'true'), false);
});

test('legacy JSON import is disabled unless explicitly enabled locally', () => {
  assert.equal(shouldImportLegacyData(false), false);
  assert.equal(shouldImportLegacyData(false, 'false'), false);
  assert.equal(shouldImportLegacyData(false, 'true'), true);
  assert.equal(shouldImportLegacyData(true, 'true'), false);
});
