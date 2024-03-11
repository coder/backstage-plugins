# @coder/backstage-plugin-devcontainers-backend

Automatically detect [development containers (devcontainer) files](https://containers.dev/) in repositories such as GitHub, GitLab, or BitBucket, and have Backstage tag them in the background!

## Screenshots

![View of the default table component displaying custom tag data](./screenshots/table-view.png)

## Features

_Note: While this plugin can be used standalone, it has been designed to be a backend companion to [`backstage-plugin-devcontainers-react`](../backstage-plugin-devcontainers-react/README.md)._

### Standalone features

- Automatically tag repos from GitHub/GitLab/BitBucket that contain some form of `devcontainers` support.
  - Repos are tagged as part of Backstage's [processing loop](https://backstage.io/docs/features/software-catalog/life-of-an-entity/#processing)

### When combined with the frontend plugin

- Provides an end-to-end solution for automatically managing tags for your Backstage installation, while letting you read them from custom hooks and components

## Setup

### Before you begin

Ensure that you have the following ready to go:

- A Backstage deployment that you can modify
- A GitHub/GitLab/BitBucket repository that has had a `devcontainers.json` file added to it. [VS Code has a quick-start guide for adding devcontainers to a repo](https://code.visualstudio.com/docs/devcontainers/create-dev-container).

_Note: While this plugin has been developed and published by Coder, no Coder installations are required._

### Installation

1. Blah blah blah

Have an idea for what kinds of components you would like to see? Feel free to open an issue and make a feature request!

## Limitations

While this does not directly apply to the React plugin, there are limits around the backend plugin's support of `devcontainer.json` files. Please see the backend plugin's README for more information.

## API documentation

Please see the [directory for our API references](./docs/README.md) for additional information.

## Roadmap

This plugin is in active development. The following features are planned:

- TODO: Fill out list

## Contributing

This plugin is part of the Backstage community. We welcome contributions!

Welcome to the backstage-plugin-devcontainers backend plugin!

_This plugin was created through the Backstage CLI_
