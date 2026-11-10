import { Challenge, Event } from '../types';

export function eventView(event: Event, userId?: string): Event {
  const registeredUserIds = Array.isArray(event?.registeredUserIds) ? event.registeredUserIds : [];

  return {
    ...event,
    registeredCount: registeredUserIds.length,
    registeredUserIds: userId && registeredUserIds.includes(userId) ? [userId] : [],
  };
}

export function challengeView(challenge: Challenge, userId?: string): Challenge {
  const joinedUserIds = Array.isArray(challenge?.joinedUserIds) ? challenge.joinedUserIds : [];
  const completedUserIds = Array.isArray(challenge?.completedUserIds) ? challenge.completedUserIds : [];

  return {
    ...challenge,
    joinedCount: joinedUserIds.length,
    submissionCount: completedUserIds.length,
    joinedUserIds: userId && joinedUserIds.includes(userId) ? [userId] : [],
    completedUserIds: userId && completedUserIds.includes(userId) ? [userId] : [],
  };
}
