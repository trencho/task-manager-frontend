import { formatTags, parseTags } from '@/utils/tags';

describe('utils/tags.ts', () => {
    it('Splits on commas and trims the whitespace around each tag', () => {
        expect(parseTags('work, urgent ,  home')).toEqual(['work', 'urgent', 'home']);
    });

    it('Drops the empties a trailing comma or a blank box leaves behind', () => {
        expect(parseTags('work, ,urgent,')).toEqual(['work', 'urgent']);
        expect(parseTags('')).toEqual([]);
        expect(parseTags('   ')).toEqual([]);
    });

    /**
     * The server stores tags in a Set, so "work, work" and "work" mean the same thing there.
     * Sending the first would have the task come back looking edited.
     */
    it('Keeps one of each tag', () => {
        expect(parseTags('work, work, urgent')).toEqual(['work', 'urgent']);
    });

    it('Renders a list back into the one line the box shows', () => {
        expect(formatTags(['work', 'urgent'])).toBe('work, urgent');
        expect(formatTags([])).toBe('');
    });

    // The server sends no tags field for a task carrying none, and a task fetched before this
    // feature existed has none either.
    it('Renders an absent list as an empty box rather than "undefined"', () => {
        expect(formatTags(undefined)).toBe('');
    });

    it('Round-trips whatever it produced', () => {
        expect(parseTags(formatTags(['work', 'urgent']))).toEqual(['work', 'urgent']);
    });
});
