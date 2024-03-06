# [Backstage](https://backstage.io)

## Contributing

To start the app:

```sh
yarn install
yarn dev
```

To run an individual plugin:

```sh
cd plugins/backstage-plugin-$name
yarn install
yarn start
```

Note that the Coder plugin does not support running like this as it currently
uses a backend proxy that is not available when running independently of the
Backstage app.

## Releasing

To draft a release for a plugin push a tag named `$name/v$version` without the
`backstage-plugin-` prefix. For example:

```sh
git tag -a coder/v0.0.0 -m "coder v0.0.0"
git push origin coder/v0.0.0
```

This will kick off an action that will create a draft release for the plugin.
Once you have reviewed the release you can publish it and another action will
publish the plugin to NPM.
