const expoConfig = require('eslint-config-expo');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = {
  extends: ['expo'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react-hooks/exhaustive-deps': 'warn',
  },
  ignorePatterns: ['dist/*', 'node_modules/*', '.expo/*', '__tests__/*'],
};
