import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_CHALLENGES, INITIAL_EVENTS } from './initialData';
import { challengeView, eventView } from './publicViews';

test('event responses expose aggregate attendance and only the requesting resident ID', () => {
  const event = { ...INITIAL_EVENTS[0], registeredUserIds: ['resident-a', 'resident-b'] };

  assert.deepEqual(eventView(event).registeredUserIds, []);
  assert.equal(eventView(event).registeredCount, 2);
  assert.deepEqual(eventView(event, 'resident-a').registeredUserIds, ['resident-a']);
});

test('challenge responses expose aggregate participation without other resident IDs', () => {
  const challenge = {
    ...INITIAL_CHALLENGES[0],
    joinedUserIds: ['resident-a', 'resident-b'],
    completedUserIds: ['resident-b'],
  };

  assert.deepEqual(challengeView(challenge).joinedUserIds, []);
  assert.deepEqual(challengeView(challenge).completedUserIds, []);
  assert.equal(challengeView(challenge).joinedCount, 2);
  assert.equal(challengeView(challenge).submissionCount, 1);
  assert.deepEqual(challengeView(challenge, 'resident-b').joinedUserIds, ['resident-b']);
});
