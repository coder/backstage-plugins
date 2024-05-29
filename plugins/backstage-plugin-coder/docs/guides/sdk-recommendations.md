# Using the Coder SDK

This document walks you through using the Coder SDK from within Backstage.

## Disclaimer

As of May 28, 2024, Coder does not have a fully public, versioned SDK published on a package manager like NPM. Coder does intend to release a true JavaScript/TypeScript SDK, but until that is released, the SDK exposed through Backstage can be best thought of as a "preview"/"testbed" SDK.

If you encounter any issues while using the Backstage version of the SDK, please don't hesitate to open an issue. We would be happy to get any issues fixed, but expect some growing pains as we collect user feedback.

## Welcome to the Coder SDK!

The Coder SDK for Backstage allows Backstage admins to bring the entire Coder API into Spotify's Backstage platform. While the plugin ships with a collection of ready-made components, those can't meet every user's needs, and so, why not give you access to the full set of building blocks, so you can build a solution tailored to your specific use case?

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

This guide assumes that you have already added the `CoderProvider` component to your Backstage deployment. If you have not, [please see the main README](../../README.md#setup) for instructions on getting that set up.

### The main SDK hooks

There are three hooks that you want to consider when interacting with SDK functionality. These can be broken down into two main categories:

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

`useCoderSdk` is a lower-level "primitive" for accessing the Coder SDK. It exposes a mix of different REST API methods for interacting with your Coder deployment's resources.

Calling the hook will give you an object with all available API methods. As these methods are all async, **none** of them are suitable for use in render logic. They must be called from within effects or event handlers.

```tsx
// Illustrative example - this exact code is a very bad idea in production!
function ExampleComponent() {
  const sdk = useCoderSdk();

  return (
    <button
      onClick={async () => {
        // The SDK can be called from any event handler or effect
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

The SDK object contains all available API methods. All methods follow the format `<verb>` + `<resource name>`. The SDK has these verbs:

- `get`
- `post`
- `put`
- `patch`
- `upsert`
- `delete`

Depending on the Coder resource, there may be different API methods that work with a single resource vs all resources (e.g., `sdk.getWorkspace` vs `sdk.getWorkspaces`).

Note that all of these functions will throw an error if the user is not authenticated.

### Accessing the SDK through `useCoderQuery`

The nuances of how `useCoderQuery` works are covered later in this guide, but for convenience, the hook can access the SDK directly from its `queryFn` function:

```tsx
const workspacesQuery = useCoderQuery({
  queryKey: ['workspaces'],

  // Access the SDK without needing to import or call useCoderSdk
  queryFn: ({ sdk }) => sdk.getWorkspaces({ q: 'owner:me' }),
});
```

## Authentication

All API methods from the SDK will throw an error if the user is not authenticated. The Coder plugin provides a few different ways of letting the user authenticate with Coder:

- The official Coder components
- The `CoderProvider` component's fallback auth UI
- The `useCoderAuth` hook

### Authenticating via official Coder components

### Authenticating via the fallback auth UI

### Authenticating via `useCoderAuth`

## Caching API data for UIs

All core logic in the Coder plugin uses [Tanstack Query v4](https://tanstack.com/query/v4). As it is already a dependency for the Coder plugin, it is highly recommended that you also use the library when building out your own components.

The three main hooks that you will likely use with the SDK are:

- `useQuery`
- `useMutation`
- `useQueryClient`

At present, the Coder plugin provides a convenience wrapper for connecting `useQuery` to the Coder SDK and to Coder auth state. This is the `useCoderQuery` hook – if a component should only care about making queries and doesn't need to interact directly with auth state, this is a great option.

We also plan to create `useMutation` wrapper called `useCoderMutation`.

### Problems with `useState` + `useEffect`

All functions returned by the Coder SDK maintain stable memory references for the entire lifetime of the SDK. In that sense, every one of these functions can be safely placed inside a `useEffect` dependency array to perform data fetching. In theory, `usEffect` can be used to trigger API calls, while the results (and their relevant loading/error/success states) can be stored via `useState`.

In practice, however, this setup causes a lot of problems:

- Potential race conditions if `useEffect` makes a different API call on each
  render
- No easy way to retain state after a component unmounts. If a component unmounts and remounts, it needs to fetch new data – even if it just had the data moments ago.
- No easy ways to invalidate data and make new requests from the same dependencies
- No easy ways to trigger background re-fetches
- No automatic retry logic
- Making sure that the effect doesn't run too often can require careful memoization throughout several parts of the app, and can be hard to get right.
- No easy way to share the state of a single `useEffect` call across multiple components. Traditional React solutions would make you choose between duplicating the query state across each component, or putting a single shared state value in React Context – and introducing the risks of performance issues from too many app-wide re-renders.

Fetching data has never been the hard part of calling APIs in React. It's always been figuring out how to cache it in a render-safe way that's been tricky.

### Problems with `useAsync`

While the [`useAsync` hook](https://github.com/streamich/react-use/blob/master/src/useAsync.ts) fares slightly better compared to using `useState` + `useEffect`, it still has a number of the same problems. In fact, it introduces a few new problems.

#### Problems fixed

- No more race conditions

#### Problems retained

- Everything else from the `useEffect` section

#### New problems

- Even though `useAsync`'s API uses dependency arrays, by default, it is not eligible for the exhaustive deps ES Lint rule. While on the surface, this might seem freeing, in practice, it means that you have no safety nets for making sure that your effect logic runs the correct number of times. It can easily run too often or too little without you realizing.

## Performing queries

## Performing mutations

## Sharing data between different queries and mutations

## Additional reading

## Example components
