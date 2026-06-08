export type RealtimeRoom =
  | { type: 'workspace'; id: string }
  | { type: 'document'; id: string };
