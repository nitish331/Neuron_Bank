/**
 * Joins class names, dropping anything falsy.
 *
 * With CSS modules a missing key is `undefined`, which would otherwise be
 * stringified into the attribute — so every multi-class `className` goes
 * through here rather than a template literal.
 */
function cx(...values) {
  return values.filter(Boolean).join(' ');
}

export default cx;
