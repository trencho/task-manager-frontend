/**
 * Tags are typed as one comma-separated line and stored as a list. Both directions live here so
 * the form does not have to know the shape the API wants.
 *
 * Duplicates are dropped: the server stores tags in a Set, so "work, work" and "work" mean the
 * same thing there, and letting the client send the first would have the task come back looking
 * edited.
 */
export const parseTags = (raw: string): string[] => {
  const tags = new Set<string>();
  for (const part of raw.split(',')) {
    const tag = part.trim();
    if (tag) {
      tags.add(tag);
    }
  }
  return [...tags];
};

// Tolerates an absent list: the server sends null for a task that has no tags, and a task loaded
// before this feature existed has no field at all.
export const formatTags = (tags: string[] | undefined): string => (tags ?? []).join(', ');
