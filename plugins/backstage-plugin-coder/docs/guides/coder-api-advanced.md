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
