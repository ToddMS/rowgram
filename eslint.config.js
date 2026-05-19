// @ts-check

import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
  {
    ignores: ['node_modules/**', '.next/**', 'dist/**', '*.gen.ts'],
  },
]
