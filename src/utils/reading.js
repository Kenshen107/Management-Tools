const WORDS_PER_MINUTE = 200;

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function estimatedReadSeconds(text) {
  const words = wordCount(text);
  return Math.max(5, Math.round((words / WORDS_PER_MINUTE) * 60));
}

// Flags a confirmation as "too fast to plausibly have been read" if the
// employee confirmed in under 30% of the estimated reading time.
function isSuspiciouslyFast(text, secondsTaken) {
  if (secondsTaken == null) return false;
  const expected = estimatedReadSeconds(text);
  return secondsTaken < expected * 0.3;
}

function secondsBetween(isoStart, isoEnd) {
  if (!isoStart || !isoEnd) return null;
  return Math.round((new Date(isoEnd).getTime() - new Date(isoStart).getTime()) / 1000);
}

module.exports = { wordCount, estimatedReadSeconds, isSuspiciouslyFast, secondsBetween };
