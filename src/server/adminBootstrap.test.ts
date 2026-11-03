import test from 'node:test';
import assert from 'node:assert/strict';
import { isBootstrapSystemAdmin } from './adminBootstrap';

test('bootstrap admin email matching is case-insensitive and exact', () => {
  assert.equal(isBootstrapSystemAdmin('Admin@example.com', 'firebase-uid-1', 'admin@example.com', 'firebase-uid-1'), true);
  assert.equal(isBootstrapSystemAdmin('admin@example.com.attacker.test', 'firebase-uid-1', 'admin@example.com', 'firebase-uid-1'), false);
  assert.equal(isBootstrapSystemAdmin('another@example.com', 'firebase-uid-1', 'admin@example.com', 'firebase-uid-1'), false);
  assert.equal(isBootstrapSystemAdmin('admin@example.com', 'different-uid', 'admin@example.com', 'firebase-uid-1'), false);
});

test('bootstrap admin is disabled unless both email and UID are configured', () => {
  assert.equal(isBootstrapSystemAdmin('admin@example.com', 'firebase-uid-1', undefined, 'firebase-uid-1'), false);
  assert.equal(isBootstrapSystemAdmin('admin@example.com', 'firebase-uid-1', 'admin@example.com', undefined), false);
  assert.equal(isBootstrapSystemAdmin(undefined, 'firebase-uid-1', 'admin@example.com', 'firebase-uid-1'), false);
  assert.equal(isBootstrapSystemAdmin('', 'firebase-uid-1', 'admin@example.com', 'firebase-uid-1'), false);
  assert.equal(isBootstrapSystemAdmin('admin@example.com', undefined, 'admin@example.com', undefined), false);
});

test('emulator bootstrap may use the configured email without a UID', () => {
  assert.equal(isBootstrapSystemAdmin('admin@example.com', undefined, 'admin@example.com', undefined, true), true);
  assert.equal(isBootstrapSystemAdmin('other@example.com', undefined, 'admin@example.com', undefined, true), false);
});
