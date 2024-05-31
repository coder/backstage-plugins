# Coder SDK - Experimental Vendored Version

This is a vendored version of the main API files from the
[core Coder OSS repo](https://github.com/coder/coder/tree/main/site/src/api). All files (aside from test files) have been copied over directly, with only a
few changes made to satisfy default Backstage ESLint rules.

While there is a risk of this getting out of sync with the versions of the
files in Coder OSS, the Coder API itself should be treated as stable. Breaking
changes are only made when absolutely necessary.

## General approach

- Copy over relevant files from Coder OSS and place them in relevant folders
  - As much as possible, the file structure of the vendored files should match the file structure of Coder OSS to make it easier to copy updated files over.
- Have a single file at the top level of this directory that exports out the files for consumption elsewhere in the plugin. No plugin code should interact with the vendored files directly.

## Eventual plans

Coder has eventual plans to create a true SDK published through NPM. Once
that is published, all of this vendored code should be removed in favor of it.
