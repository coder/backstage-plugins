# Using the Coder SDK

This document walks you through using the Coder SDK from within Backstage.

## Disclaimer

As of May 2024, Coder does not have a fully public, versioned SDK published on a package manager like NPM. Coder does intend to release a true JavaScript/TypeScript SDK, but until that is released, the SDK exposed through Backstage can be best thought of as a "preview"/"testbed" SDK. At present, this SDK is also used in production for [the official Coder VS Code extension](https://github.com/coder/vscode-coder).

If you encounter any issues while using the Backstage version of the SDK, please don't hesitate to open an issue. We would be happy to get any issues fixed, but expect some growing pains as we collect user feedback.

## Welcome to the Coder SDK!

The Coder SDK for Backstage makes it easy for Backstage admins to bring the entire Coder API into Spotify's Backstage platform. While the Coder Backstage plugin does ship with a collection of ready-made components, those can't meet every user's needs, and so, why not give you access to the full set of building blocks, so you can build a solution tailored to your specific use case?

This guide covers the following:

- Accessing the SDK from your own custom React components
  - Accessing the SDK via `useCoderSdk`
  - Accessing the SDK via `useCoderQuery`
- Authenticating
  - The fallback auth UI
- Performing queries
  - Recommendations for caching data
  - How the Coder plugin caches data
  - The `useCoderQuery` custom hook
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

`useCoderSdk` is a lower-level "primitive" for accessing the Coder SDK. The SDK exposes a mix of different REST API methods for interacting with your Coder deployment's resources.

Calling the hook will give you an object with all available API methods. As these methods are all async, **none** of them are suitable for use in render logic. They must be called from within effects or event handlers.

```tsx
// Illustrative example - these patterns are a very bad idea in production!
function ExampleComponent() {
  // The workspace type is exported via the plugin
  const [workspaces, setWorkspaces] = useState<readonly Workspace[]>([]);
  const sdk = useCoderSdk();

  // The SDK can be called from any effect
  useEffect(() => {
    const getInitialWorkspaces = async () => {
      const workspacesResponse = await sdk.getWorkspaces({ q: 'owner:me' });
      const workspaces = workspacesResponse.workspaces;
      setWorkspaces(workspaces);
    };

    void getInitialWorkspaces();

    // The SDK maintains a stable memory reference; there is no harm in
    // including it as part of your dependency arrays. In this case, the
    // dependency array may as well be empty.
  }, [sdk]);

  return (
    <>
      <button
        // The SDK can also be called from any event handler
        onClick={async () => {
          const newWorkspace = await sdk.createWorkspace(
            'organizationId',
            'userId',
            {
              // Properties for making new workspace go here
            },
          );

          setWorkspaces([...workspaces, newWorkspace]);
        }}
      >
        Create new workspace
      </button>

      <ul>
        {workspaces.map(workspace => (
          <li key={workspace.id}>{workspace.name}</li>
        ))}
      </ul>
    </>
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

#### Error behavior

All SDK functions will throw in the event of an error. You will need to provide additional error handling to expose errors as values within the UI. (Tanstack Query does this automatically for you.)

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

All three solutions, directly or indirectly, involve the `CoderAuth` type. More information can be found under the `useCoderAuth` section.

### Authenticating via official Coder components

Every official Coder component (such as `CoderWorkspacesCard`) exported through the plugin is guaranteed to have some mechanism for supplying auth information. This is typically done via a UI form.

<!-- [Include screenshot/video of auth input here] -->

#### Pros

- Come pre-wired with the ability to let the user supply auth information
- Extensively tested
- Let you override the styles or re-compose the individual pieces for your needs
- Always audited for WCAG Level AA accessibility, and include landmark behavior for screen readers

#### Cons

- Not every Coder component makes sense for every page
- No easy mechanism for ensuring that your custom components don't run until the user authenticates via the official Coder components
- Components only work with a small sub-section of the total API, and won't be able to satisfy true power users
- Must be mounted within a `CoderProvider` component

### Authenticating via the fallback auth UI

When you include the `CoderProvider` component in your Backstage deployment, you have the option to set the value of `fallbackAuthUiMode`. This value affects how `CoderProvider` will inject a fallback auth input into the Backstage deployment's HTML. This means that, even if you don't use any Coder components, or are on a page that can't use them, users will always have some way of supplying auth information.

<!-- [Include screenshot/video of fallback auth input here] -->

The fallback auth UI will never be visible while the user is authenticated. However, if the user is **not** authenticated, then the value of `fallbackAuthUiMode` will affect what appears on screen:

- `restrained` (default) - The fallback auth UI will not appear if there are official Coder components on screen.
- `hidden` - The fallback auth is **never** visible on the page. If no official Coder components are on screen, you will need to import `useCoderAuth` into your custom components to authenticate your users.
- `assertive` - The fallback auth UI is always visible when the user is not authenticated, regardless of whether there are any official Coder components on screen.

#### Pros

- Helps guarantee that the user always has a way of supplying auth information
- Multiple ways of setting the behavior for the fallback. If you don't want to display it at all times, you can disable it
- Automatic integration with official Coder components. The auth fallback UI can detect Coder components without you needing to rewrite any code.
- All auth UI logic has been tested and audited for accessibility at the same standards as the other Coder components

#### Cons

- Even with three options for setting behavior, fallback auth input may not be visible exactly when you want it to be
- The `restrained` behavior is only effective on pages where you can place official Coder components. If you are not on one of these pages, the fallback auth UI will always be visible until the user authenticates.
- Fewer options for customizing the styling

### Authenticating via `useCoderAuth`

The `useCoderAuth` hook provides state and functions for updating Coder authentication state within your Backstage deployment. When called, it gives you back a `CoderAuth` object

```tsx
// This is a simplified version of the type; the real type is set up as a
// discriminated union to increase type safety and ergonomics further
type CoderAuth = Readonly<{
  status: CoderAuthStatus; // Union of strings
  token: string | undefined;
  error: unknown;

  isAuthenticated: boolean;
  registerNewToken: (newToken: string) => void;
  ejectToken: () => void;
}>;
```

#### Pros

- Gives you the finest level of control over all auth concerns
- Easy to import into any component

#### Cons

- Zero UI logic out of the box; you have to make all components yourself
- Must be called within a `CoderProvider` component

## Caching API data for UIs

All core logic in the Coder plugin uses [Tanstack Query v4](https://tanstack.com/query/v4). As it is already a dependency for the Coder plugin, it is highly recommended that you also use the library when building out your own components.

The three main hooks that you will likely use with the SDK are:

- `useQuery`
- `useMutation`
- `useQueryClient`

At present, the Coder plugin provides a convenience wrapper for connecting `useQuery` to the Coder SDK and to Coder auth state. This is the `useCoderQuery` hook – if a component should only care about making queries and doesn't need to interact directly with auth state, this is a great option.

We also plan to create `useMutation` wrapper called `useCoderMutation`.

### Problems with fetching via `useEffect`

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

### Problems with fetching via `useAsync`

While the [`useAsync` hook](https://github.com/streamich/react-use/blob/master/src/useAsync.ts) fares slightly better compared to using `useState` + `useEffect`, it still has a number of the same problems. In fact, it introduces problems.

#### Problems fixed

- No more race conditions

#### Problems retained

- Everything else from the `useEffect` section

#### New problems

- Even though `useAsync`'s API uses dependency arrays, by default, it is not eligible for the exhaustive deps ES Lint rule. This means that unless you update your ESLint rules, you have no safety nets for making sure that your effect logic runs the correct number of times. There are no protections against accidental typos.

## Performing queries

## Performing mutations

## Sharing data between different queries and mutations
