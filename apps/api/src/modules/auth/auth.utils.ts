import crypto from 'node:crypto';

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function parseDurationToMilliseconds(duration: string) {
  const match = duration.trim().match(/^(\d+)([smhdw])$/i);

  if (!match) {
    throw new Error(`Unsupported duration format: ${duration}`);
  }

  const value = Number(match[1]!);
  const unit = match[2]!.toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit]!;
}
