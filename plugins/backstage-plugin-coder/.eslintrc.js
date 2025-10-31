const base = require('@backstage/cli/config/eslint-factory')(__dirname);

module.exports = {
  ...base,
  rules: {
    ...(base.rules ?? {}),
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'off',
    // React 17+ JSX transform doesn't require React to be in scope
    'react/react-in-jsx-scope': 'off',
  },
};
