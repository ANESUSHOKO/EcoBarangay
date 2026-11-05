import assert from 'node:assert/strict';
import test from 'node:test';
import { hasSystemAdminCapabilities } from './accessControl';

test('system administrators have platform-wide capabilities', () => {
  assert.equal(hasSystemAdminCapabilities({ role: 'SYSTEM_ADMIN' }), true);
});

test('only approved Barangay Officials have platform-wide capabilities', () => {
  assert.equal(hasSystemAdminCapabilities({ role: 'BARANGAY_OFFICIAL', verifiedOfficial: true }), true);
  assert.equal(hasSystemAdminCapabilities({ role: 'BARANGAY_OFFICIAL', verifiedOfficial: false }), false);
  assert.equal(hasSystemAdminCapabilities({ role: 'BARANGAY_OFFICIAL' }), false);
});

test('residents do not have platform-wide capabilities', () => {
  assert.equal(hasSystemAdminCapabilities({ role: 'RESIDENT' }), false);
  assert.equal(hasSystemAdminCapabilities(undefined), false);
});
