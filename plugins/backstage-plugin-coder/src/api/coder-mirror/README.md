# The fake Coder SDK

This is a stopgap measure to let users bring in Coder functionality in an "SDK-ish" way, before we actually build out a proper SDK.

The majority of the file files are primarily based on the [`site/src/api` directory](https://github.com/coder/coder/tree/main/site/src/api) of the main Coder repo, with some modifications. Not all files have been copied over, to minimize the overhead for the eventual conversion to the true SDK. All other Coder dependencies have been copied over, too.

## Changes made

### `api.ts`

Made the following changes:

- Updated file to reference an Axios instance created via `axios.create`, rather than the global Axios instance. Also updated references to `axios.isAxiosError` to just `isAxiosError`
  This is to ensure that if a user is already using Axios in their Backstage deployment, there are no risks of streams getting crossed.
- Updated Code to follow Backstage linting rules
- Removed all instances of `console.error`

### `typesGenerated.ts`

- The `Experiments` and `Entitlements` arrays have been renamed to avoid name conflicts with the interfaces of the same names (runtime arrays were renamed to be lowercase)
