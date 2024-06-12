# Working with the Coder API - advanced use cases

This guide covers some more use cases that you can leverage for more advanced configuration of the Coder API from within Backstage.

## Changing fallback auth component behavior

By default, `CoderProvider` is configured to display a fallback auth UI component when two cases are true:

1. The user is not authenticated
2. There are no official Coder components are being rendered to the screen.

<-- Add image of fallback -->

All official Coder plugin components are configured to let the user add auth information if the user isn't already authenticated, so the fallback component only displays when there would be no other way to add the information.

However, depending on your use cases, `CoderProvider` can be configured to change how it displays the fallback, based on the value of the `fallbackAuthUiMode` prop.

```tsx
<CoderProvider fallbackAuthUiMode="assertive">
  <OtherComponents />
</CoderProvider>
```

There are three values that can be set for the mode:

- `restrained` (default) - The auth fallback will only display if the user is not authenticated, and there would be no other way for the user to add their auth info.
- `assertive` - The auth fallback will always display when the user is not authenticated, regardless of what Coder component are on-screen. But the fallback will **not** appear if the user is authenticated.
- `hidden` - The auth fallback will never appear under any circumstances. Useful if you want to create entirely custom components and don't mind wiring your auth logic manually via `useCoderAuth`.

## Connecting a custom query client to the Coder plugin

By default, the Coder plugin uses and manages its own query client. This works perfectly well if you aren't using React Query for any other purposes, but if you are using it throughout your Backstage deployment, it can cause issues around redundant state (e.g., not all cached data being vacated when the user logs out).

To prevent this, you will need to do two things:

1. Pass in your custom React Query query client into the `CoderProvider` component
2. "Group" your queries with the Coder query key prefix

```tsx
const yourCustomQueryClient = new QueryClient();

<CoderProvider queryClient={yourCustomQueryClient}>
  <YourCustomComponents />
</CoderProvider>

// Ensure that all queries have the correct query key prefix
import { useQuery } from "@tanstack/react-react-query";
import { CODER_QUERY_KEY_PREFIX, useCoderQuery} from "@coder/backstage-plugin-coder";

function CustomComponent () {
  const query1 = useQuery({
    queryKey: [CODER_QUERY_KEY_PREFIX, "workspaces"]
    queryFn () => {
      // Get workspaces here
    }
  });

  // useCoderQuery automatically prefixes all query keys with
  // CODER_QUERY_KEY_PREFIX if it's not already the first value of the array
  const query2 = useCoderQuery({
    queryKey: ["workspaces"],
    queryFn () => {
      // Get workspaces here
    }
  })

  return <div></div>
}
```
