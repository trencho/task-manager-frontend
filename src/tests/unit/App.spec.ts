import { shallowMount } from '@vue/test-utils';

import App from '@/App.vue';

// App is the root shell: a #app wrapper around the routed view. Stub RouterView so the test
// needs no router instance -- the routing itself is covered by router.spec.ts.
describe('App', () => {
    it('renders the #app shell around the routed view', () => {
        const wrapper = shallowMount(App, {
            global: { stubs: { RouterView: true } }
        });

        expect(wrapper.find('#app').exists()).toBe(true);
        expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true);
    });
});
