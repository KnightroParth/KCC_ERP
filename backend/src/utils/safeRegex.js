/**
 * Escape special regex characters in a string to prevent ReDoS and injection.
 * Returns a safe string for use in new RegExp(safe, 'i').
 */
function escapeRegex(str) {
  if (str == null || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize field name for use in query - allow only alphanumeric and underscore.
 * Prevents NoSQL-style injection via field names (e.g. $gt, __proto__).
 */
function sanitizeFieldName(field) {
  if (field == null || typeof field !== 'string') return '';
  return field.replace(/[^a-zA-Z0-9_]/g, '');
}

module.exports = { escapeRegex, sanitizeFieldName };
