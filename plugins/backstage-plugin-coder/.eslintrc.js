const base = require('@backstage/cli/config/eslint-factory')(__dirname);

module.exports = {
  ...base,
  rules: {
    ...(base.rules ?? {}),
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'off',
  },
};
