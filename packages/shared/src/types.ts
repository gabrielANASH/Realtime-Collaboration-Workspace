export type UUID = string;

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export type RealtimeEventName =
  | 'document:updated'
  | 'document:presence'
  | 'notification:new'
  | 'workspace:member-added'
  | 'activity:created'
  | 'comment:new';
