import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  // Flat config has no `ignorePatterns`. A config object carrying only `ignores` is global.
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },

  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Several components edit the task passed to them and emit the result upward.
      'vue/no-mutating-props': 'off',
    },
  },

  {
    // Vitest injects these because `globals: true` is set in vite.config.js. They were hand-listed
    // before; `globals.vitest` keeps the two in step.
    files: ['src/tests/**/*.spec.js'],
    languageOptions: {
      globals: globals.vitest,
    },
  },
]
