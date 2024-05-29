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

### The main SDK hooks

There are three hooks that you want to consider when interacting with SDK
functionality. These can be broken down into two main categories:

#### Primitive hooks

- `useCoderSdk`
- `useCoderAuth`

#### Convenience hooks

- `useCoderQuery`

## Accessing the SDK from your own custom React components

There are two main ways of accessing the Coder SDK:

- `useCoderSdk`
- `useCoderQuery`

### Accessing the SDK through `useCoderSdk`

`useCoderSdk` is a lower-level "primitive" for accessing the Coder SDK. It
exposes a mix of different REST API methods for interacting with your Coder
deployment's resources.

Calling the hook will give you an object with all available API methods. As
these methods are all async, **none** of them are suitable for use in render
logic. They must be called from within effects or event handlers.

```tsx
// Illustrative example - this exact code is a very bad idea in production!
function ExampleComponent() {
  const sdk = useCoderSdk();

  return (
    <button
      onClick={async () => {
        // The SDK can be called from any event handler or effect logic
        const newWorkspace = await sdk.createWorkspace(
          'organizationId',
          'userId',
          {
            // Properties for making new workspace go here
          },
        );

        console.log(newWorkspace);
      }}
    >
      Create new workspace
    </button>
  );
}
```

#### The SDK object

The SDK object contains all available API methods. All methods follow the format
`<verb>` + `<resource name>`. The SDK has these verbs:

- `get`
- `post`
- `put`
- `patch`
- `upsert`
- `delete`

Depending on the Coder resource, there may be different API methods that work with a single resource vs all resources (e.g., `sdk.getWorkspace` vs `sdk.getWorkspaces`).

Note that all of these functions will throw an error if the user is not
authenticated.

### Accessing the SDK through `useCoderQuery`

The nuances of how `useCoderQuery` works are covered later in this guide, but
for convenience, the hook can access the SDK directly from its `queryFn`
function:

```tsx
const workspacesQuery = useCoderQuery({
  queryKey: ['workspaces'],

  // Access the SDK without needing to import or call useCoderSdk
  queryFn: ({ sdk }) => sdk.getWorkspaces({ q: 'owner:me' }),
});
```

## Authentication

All API methods from the SDK will throw an error if the user is not
authenticated. The Coder plugin provides a few different ways of letting the
user authenticate with Coder:

- The official Coder components
- The `CoderProvider` component's fallback auth UI
- The `useCoderAuth` hook

### Authenticating via official Coder components

### Authenticating via the fallback auth UI

### Authenticating via `useCoderAuth`

## Performing queries

### Problems with `useEffect`

### Problems with `useAsync`

## Performing mutations

## Sharing data between different queries and mutations

## Additional reading

## Example components
