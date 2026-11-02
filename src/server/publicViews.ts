import { Challenge, Event } from '../types';

export function eventView(event: Event, userId?: string): Event {
  return {
    ...event,
    registeredCount: event.registeredUserIds.length,
    registeredUserIds: userId && event.registeredUserIds.includes(userId) ? [userId] : [],
  };
}

export function challengeView(challenge: Challenge, userId?: string): Challenge {
  return {
    ...challenge,
    joinedCount: challenge.joinedUserIds.length,
    submissionCount: challenge.completedUserIds.length,
    joinedUserIds: userId && challenge.joinedUserIds.includes(userId) ? [userId] : [],
    completedUserIds: userId && challenge.completedUserIds.includes(userId) ? [userId] : [],
  };
}
