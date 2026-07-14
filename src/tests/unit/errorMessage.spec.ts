import { apiErrorMessage } from '@/utils/errorMessage';

describe('utils/errorMessage', () => {
    it('Returns a string body verbatim', () => {
        expect(apiErrorMessage({ response: { data: 'Invalid credentials' } }))
            .toBe('Invalid credentials');
    });

    it('Joins an array of validation failures', () => {
        expect(apiErrorMessage({ response: { data: ['a is required', 'b is too short'] } }))
            .toBe('a is required, b is too short');
    });

    it('Reads the message field of a JSON body', () => {
        expect(apiErrorMessage({ response: { data: { message: 'Too many requests' } } }))
            .toBe('Too many requests');
    });

    /**
     * The whole reason this helper exists: `error.response` is undefined when the request never
     * got an answer, and reading `.data` off it throws from inside the catch block.
     */
    it('Falls back to the error message when there is no response', () => {
        expect(apiErrorMessage(new Error('Network Error'))).toBe('Network Error');
    });

    it('Falls back to a generic message for an empty body and no error message', () => {
        expect(apiErrorMessage({ response: { data: '' } }))
            .toBe('Something went wrong. Please try again.');
        expect(apiErrorMessage({ response: { data: [] } }))
            .toBe('Something went wrong. Please try again.');
        expect(apiErrorMessage({ response: { data: { message: '   ' } } }))
            .toBe('Something went wrong. Please try again.');
    });

    it('Never throws, whatever it is handed', () => {
        expect(apiErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
        expect(apiErrorMessage(null)).toBe('Something went wrong. Please try again.');
        expect(apiErrorMessage({})).toBe('Something went wrong. Please try again.');
        expect(apiErrorMessage({ response: {} })).toBe('Something went wrong. Please try again.');
    });
});
