/**
 * Turn a `sortBy` query value into a Mongoose sort.
 * Accepts "field:asc"/"field:desc" and "-field", several separated by commas,
 * e.g. "orderStatus:asc,createdAt:desc".
 *
 * `createdAt` descending is used when nothing (valid) is given, and is also the
 * tiebreaker for any other sort. `_id` is always appended so records sharing a
 * timestamp keep a consistent order and pages can't repeat or skip records.
 */
const parseSortBy = (sortBy?: string): Record<string, 1 | -1> => {
  const sort: Record<string, 1 | -1> = {};

  for (const part of (sortBy ?? "").split(",")) {
    const [rawField, direction] = part.trim().split(":");
    const field = rawField?.trim();
    if (!field) continue;
    if (field.startsWith("-")) {
      sort[field.slice(1)] = -1;
    } else {
      sort[field] = direction?.trim().toLowerCase() === "asc" ? 1 : -1;
    }
  }

  if (!("createdAt" in sort)) sort.createdAt = -1;
  sort._id = sort.createdAt;
  return sort;
};

export default parseSortBy;
