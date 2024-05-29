# Using the Coder SDK

This document walks you through using the Coder SDK from within Backstage.

## Disclaimer

As of May 28, 2024, Coder does not have a fully public, versioned SDK
published on a package manager like NPM. Coder does intend to release a true
JavaScript/TypeScript SDK, but until that is released, the SDK exposed through
Backstage can be best thought of as a "preview"/"testbed" SDK.

If you encounter any issues while using the Backstage version of the SDK,
please don't hesitate to open an issue. We would be happy to get any issues
fixed, but expect some growing pains as we collect user feedback.

## Welcome to the Coder SDK!

The Coder SDK for Backstage allows Backstage admins to bring the entire Coder
API into Spotify's Backstage platform. While the plugin ships with a collection
of ready-made components, those can't meet every user's needs, and so, why not
give you access to the full set of building blocks, so you can build a solution
tailored to your specific use case?

This guide covers the following:

- Accessing the SDK from your own custom React components
- Authenticating
  - The fallback auth UI
- Performing queries
  - Recommendations for caching data
  - How the Coder plugin caches data
  - Cautions against other common UI caching strategies
- Performing mutations

### Before you begin

This guide assumes that you have already added the `CoderProvider` component to
your Backstage deployment. If you have not,
[please see the main README](../../README.md#setup) for instructions on getting
that set up.

## Accessing the SDK from your own custom React components

## Authenticating

## Performing queries

## Performing mutations
