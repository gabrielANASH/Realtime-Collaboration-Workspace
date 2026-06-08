const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type ActivityLogRecord = {
  id: string;
  workspaceId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; email: string; name: string | null } | null;
};

export async function listActivityLogsRequest(
  workspaceId: string,
  accessToken: string,
  limit?: number,
  cursor?: string,
): Promise<ActivityLogRecord[]> {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (cursor) params.set('cursor', cursor);

  const query = params.toString();
  const url = `${API_URL}/workspaces/${workspaceId}/activity${query ? '?' + query : ''}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch activity logs');
  }

  const data = await response.json();
  return data.items;
}
