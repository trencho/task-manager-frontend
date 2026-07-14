import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  // Flat config has no `ignorePatterns`. A config object carrying only `ignores` is global.
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  {
    // Parse <script lang="ts"> inside .vue SFCs. vue-eslint-parser owns the .vue file and
    // delegates the <script> body to the TypeScript parser named here.
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },

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
    // Vitest injects these because `globals: true` is set in vite.config.ts. They were hand-listed
    // before; `globals.vitest` keeps the two in step.
    files: ['src/tests/**/*.spec.{js,ts}'],
    languageOptions: {
      globals: globals.vitest,
    },
  },
]
