const VALID_TOKEN = /^[1-9SQ&ae@]$/;

export class RhythmSyntaxError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'RhythmSyntaxError';
    this.details = details;
  }
}

export function parseRhythm(input) {
  const tokens = [];
  for (const [index, raw] of Array.from(input ?? '').entries()) {
    if (/\s|\|/.test(raw)) continue;
    const token = raw.toUpperCase() === 'S' || raw.toUpperCase() === 'Q'
      ? raw.toUpperCase()
      : raw;
    if (!VALID_TOKEN.test(token)) {
      throw new RhythmSyntaxError(`Unsupported count token "${raw}"`, { index, token: raw });
    }
    tokens.push({ value: token, sourceIndex: index });
  }
  return tokens;
}
