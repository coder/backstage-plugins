# Plugin API reference – React components

This is the main documentation page for the Coder plugin's React components.

## Component list

- [`CoderAuthWrapper`](#coderauthwrapper)
- [`CoderErrorBoundary`](#codererrorboundary)
- [`CoderProvider`](#coderprovider)
- [`CoderWorkspacesCard`](#coderworkspacescard)
  - [`CoderWorkspacesCard.CreateWorkspacesLink`](#coderworkspacescardcreateworkspaceslink)
  - [`CoderWorkspacesCard.ExtraActionsButton`](#coderworkspacescardextraactionsbutton)
  - [`CoderWorkspacesCard.HeaderRow`](#coderworkspacescardheaderrow)
  - [`CoderWorkspacesCard.Root`](#coderworkspacescardroot)
  - [`CoderWorkspacesCard.SearchBox`](#coderworkspacescardsearchbox)
  - [`CoderWorkspacesCard.WorkspacesList`](#coderworkspacescardworkspaceslist)
  - [`CoderWorkspacesCard.WorkspacesListIcon`](#coderworkspacescardworkspaceslisticon)
  - [`CoderWorkspacesCard.WorkspacesListItem`](#coderworkspacescardworkspaceslistitem)

## `CoderAuthWrapper`

This component is designed to simplify authentication checks for other components that need to be authenticated with Coder. Place any child component inside the wrapper. If the user is authenticated, they will see the children. Otherwise, they will see a form for authenticating themselves.

### Type signature

```tsx
type Props = Readonly<
  PropsWithChildren<{
    type: 'card';
  }>
>;

declare function CoderAuthWrapper(props: Props): JSX.Element;
```

### Sample usage

```tsx
function YourComponent() {
  // This query requires authentication
  const query = useCoderWorkspaces('owner:lil-brudder');
  return <p>{query.isLoading ? 'Loading' : 'Not loading'}</p>;
}

<CoderProvider appConfig={yourAppConfig}>
  <CoderAuthWrapper>
    <YourComponent />
  </CoderAuthWrapper>
</CoderProvider>;
```

### Throws

- Throws a render error if this component mounts outside of `CoderProvider`

### Notes

- The wrapper will also stop displaying the child component(s) if the auth token expires, or if the token cannot be safely verified. If that happens, the component will also display some form controls for troubleshooting.
- `CoderAuthWrapper` only supports the `card` type for now, but more types will be added as we add more UI components to the library

## `CoderErrorBoundary`

Provides an error boundary for catching render errors thrown by Coder's custom hooks (e.g., parsing logic).

### Type signature

```tsx
type Props = {
  children?: ReactNode;
  fallbackUi?: ReactNode;
};

declare function CoderErrorBoundary(props: Props): JSX.Element;
```

### Sample usage

```tsx
function YourComponent() {
  // Pretend that there is an issue with this hook, and that it will always
  // throw an error
  const config = useCoderEntityConfig();
  return <p>Will never reach this code</p>;
}

<CoderErrorBoundary>
  <YourComponent />
</CoderErrorBoundary>;
```

### Throws

- Does not throw

### Notes

- All other Coder components are exported with this component wrapped around them. Unless you are making extension use of the plugin's custom hooks, it is not expected that you will need this component.
- If `fallbackUi` is not specified, `CoderErrorBoundary` will default to a simple error message
- Although Backstage automatically places error boundaries around each exported component, `CoderErrorBoundary` is designed to handle and process specific kinds of errors from the Coder plugins.

## `CoderProvider`

Provides top-level Coder-specific data to the rest of the frontend Coder plugin components. Data such as:

- The Coder access URL
- Fallback workspace parameters

### Type signature

```tsx
type Props = PropsWithChildren<{
  children?: React.ReactNode;
  appConfig: CoderAppConfig;
  queryClient?: QueryClient;
}>;

declare function CoderProvider(props: Props): JSX.Element;
```

The type of `QueryClient` comes from [Tanstack Router v4](https://tanstack.com/query/v4/docs/reference/QueryClient).

### Sample usage

```tsx
function YourComponent() {
  const query = useCoderWorkspaces('owner:brennan-lee-mulligan');
  return (
    <ul>
      {query.data?.map(workspace => (
        <li key={workspace.id}>{workspace.owner_name}</li>
      ))}
    </ul>
  );
}

const appConfig: CoderAppConfig = {
  deployment: {
    accessUrl: 'https://dev.coder.com',
  },

  workspaces: {
    templateName: 'devcontainers',
    mode: 'manual',
    repoUrlParamKeys: ['custom_repo', 'repo_url'],
    params: {
      repo: 'custom',
      region: 'eu-helsinki',
    },
  },
};

<CoderAppConfig appConfig={appConfig}>
  <YourComponent />
</CoderAppConfig>;
```

### Throws

- Does not throw

### Notes

- This component was deliberately designed to be agnostic of as many Backstage APIs as possible - it can be placed as high as the top of the app, or treated as a wrapper around a specific plugin component.
  - That said, it is recommended that only have one instance of `CoderProvider` per Backstage deployment. Multiple `CoderProvider` component instances could interfere with each other and accidentally fragment caching state
- If you are already using TanStack Query in your deployment, you can provide your own `QueryClient` value via the `queryClient` prop.
  - If not specified, `CoderProvider` will use its own client
  - Even if you aren't using TanStack Query anywhere else, you could consider adding your own client to configure it with more specific settings
  - All Coder-specific queries use a query key prefixed with `coder-backstage-plugin` to prevent any accidental key collisions.
- Regardless of whether you pass in a custom `queryClient` value, `CoderProvider` will spy on the active client to detect any queries that likely failed because of Coder auth tokens expiring

## `CoderWorkspacesCard`

Allows you to search for and display Coder workspaces that the currently-authenticated user has access to. The component handles all data-fetching, caching

Has two "modes" – one where the component has access to all Coder workspaces for the user, and one where the component is aware of entity data and filters workspaces to those that match the currently-open repo page. See sample usage for examples.

All "pieces" of the component are also available as modular sub-components that can be imported and composed together individually.

### Type signature

```tsx
type Props = {
  queryFilter?: string;
  defaultQueryFilter?: string;
  onFilterChange?: (newFilter: string) => void;
  readEntityData?: boolean;

  // Plus all props from the native HTMLDivElement type, except
  // "role", "aria-labelledby", and "children"
};

declare function CoderWorkspacesCard(props: Props): JSX.Element;
```

### Sample usage

In "general mode" – the component displays ALL user workspaces:

```tsx
const appConfig: CoderAppConfig = {
  /* Content goes here */
};

// If readEntityData is false or not specified, the component
// can effectively be placed anywhere, as long as it's wrapped
// in a provider
<CoderProvider appConfig={appConfig}>
  <CoderWorkspacesCard />
</CoderProvider>;
```

In "aware mode" – the component only displays workspaces that
match the repo data for the currently-open entity page:

```tsx
const appConfig: CoderAppConfig = {
  /* Content goes here */
};

// While readEntityData is true, it must be placed somewhere
// that exposes entity data via React Context
<EntityLayout>
  <SomeAmountOfChildComponents>
    <CoderProvider appConfig={appConfig}>
      <CoderWorkspacesCard readEntityData />
    </CoderProvider>
  </SomeAmountOfChildComponents>
</EntityLayout>;
```

Using the component as a controlled component:

```tsx
function YourComponent() {
  const [searchText, setSearchText] = useState('owner:me');

  return (
    <CoderWorkspacesCard
      queryFilter={searchText}
      onFilterChange={newSearchText => setSearchText(newSearchText)}
    />
  );
}

<CoderProvider appConfig={appConfig}>
  <YourComponent />
</CoderProvider>;
```

### Throws

- Will throw a render error if called outside `CoderProvider`.
- Will throw a render error if the value of `readEntityData` changes across re-renders – it must remain a static value for the entire lifecycle of the component.
- If `readEntityData` is `true`: will throw if the component is called outside of an `EntityLayout` (or any other component that exposes entity data via React Context)

### Notes

- All `CoderWorkspacesCard` (and its sub-components) have been designed with accessibility in mind:
  - All content is accessible via screen reader - all icon buttons have accessible text
  - There are no color contrast violations in the components' default color schemes (with either the dark or light themes)
  - When wired together properly (`CoderWorkspacesCard` does this automatically), the entire search component is exposed as an accessible search landmark for screen readers
- `queryFilter` and `onFilterChange` allow you to change the component from [being uncontrolled to controlled](https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable). If `queryFilter` is not specified, the component will manage all its search state internally.
- See notes for the individual sub-components for additional information.

## `CoderWorkspacesCard.CreateWorkspacesLink`

A link-button for creating new workspaces. Clicking this link will take you to "create workspace page" in your Coder deployment, with as many fields filled out as possible.

### Type definition

```tsx
type Props = {
  tooltipText?: string;
  tooltipProps?: Omit<TooltipProps, 'children' | 'title'>;
  tooltipRef?: ForwardedRef<unknown>;

  // Also supports all props from the native HTMLAnchorElement
  // component type
};

declare function CreateWorkspacesLink(
  props: Props,
  ref?: ForwardedRef<HTMLAnchorElement>,
): JSX.Element;
```

All Tooltip-based props come from the type definitions for the MUI `Tooltip` component.

### Throws

- Will throw a render error if called outside of either a `CoderProvider` or `CoderWorkspacesCard.Root`

### Notes

- If `readEntityData` is `true` in `CoderWorkspacesCard.Root`: this component will include YAML properties parsed from the current page's entity data.

## `CoderWorkspacesCard.ExtraActionsButton`

A contextual menu of additional tertiary actions that can be performed for workspaces. Current actions:

- Refresh workspaces list
- Eject token

### Type definition

```tsx
type ExtraActionsButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'id' | 'aria-controls'
> & {
  onClose?: MenuProps['onClose'];
  toolTipProps?: Omit<TooltipProps, 'children' | 'title'>;
  tooltipText?: string;
  tooltipRef?: ForwardedRef<unknown>;

  menuProps?: Omit<
    MenuProps,
    | 'id'
    | 'open'
    | 'anchorEl'
    | 'MenuListProps'
    | 'children'
    | 'onClose'
    | 'getContentAnchorEl'
  > & {
    MenuListProps: Omit<MenuListProps, 'aria-labelledby' | 'aria-describedby'>;
  };

  // Also supports all props from the native HTMLButtonElement
  // component, except "id" and "aria-controls"
};

declare function ExtraActionsButton(
  props: Props,
  ref?: ForwardedRef<HTMLButtonElement>,
): JSX.Element;
```

All Tooltip- and Menu-based props come from the type definitions for the MUI `Tooltip` and `Menu` components.

### Throws

- Will throw a render error if called outside of either a `CoderProvider` or `CoderWorkspacesCard.Root`

### Notes

- When the menu opens, the first item of the list will auto-focus
- While the menu is open, you can navigate through items with the Up and Down arrow keys on the keyboard. These instructions are available for screen readers to announce

## `CoderWorkspacesCard.HeaderRow`

Provides a wrapper around various heading information, as well as a section for additional buttons/actions to go. Provides critical landmark information for screen readers.

### Type definition

```tsx
type HeaderProps = {
  headerText?: string;
  headerLevel?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  actions?: ReactNode;
  fullBleedLayout?: boolean;
  activeRepoFilteringText?: string | ReactNode;

  headerClassName?: string;
  hgroupClassName?: string;
  subheaderClassName?: string;

  // Also supports all props from the native HTMLDivElement
  // component except "children"
};

declare function HeaderGroup(
  props: Props,
  ref?: ForwardedRef<HTMLDivElement>,
): JSX.Element;
```

### Throws

- Will throw a render error if called outside of either a `CoderProvider` or `CoderWorkspacesCard.Root`

### Notes

- If `headerLevel` is not specified, the component will default to `h2`
- If `fullBleedLayout` is `true`, the component will exert negative horizontal margins to fill out its parent
- If `activeRepoFilteringText` will only display if the value of `readEntityData` in `CoderWorkspacesCard.Root` is `true`

## `CoderWorkspacesCard.Root`

Wrapper that acts as a context provider for all other sub-components in `CoderWorkspacesCard` – does not define any components that will render to HTML.

### Type definition

```tsx
type WorkspacesCardContext = {
  queryFilter: string;
  onFilterChange: (newFilter: string) => void;
  workspacesQuery: UseQueryResult<readonly Workspace[]>;
  headerId: string;
  entityConfig: CoderEntityConfig | undefined;
};

declare function Root(props: Props): JSX.Element;
```

All props mirror those returned by [`useWorkspacesCardContext`](./hooks.md#useworkspacescardcontext)

### Throws

- Will throw a render error if called outside of a `CoderProvider`

### Notes

- If `entityConfig` is defined, the Root will auto-filter all workspaces down to those that match the repo for the currently-opened entity page
- The key for `entityConfig` is not optional – even if it isn't defined, it must be explicitly passed an `undefined` value

## `CoderWorkspacesCard.SearchBox`

Provides the core search functionality for Coder workspaces.

### Type definition

```tsx
type Props = {
  searchInputRef?: ForwardedRef<HTMLInputElement>;
  clearButtonRef?: ForwardedRef<HTMLButtonElement>;

  labelWrapperClassName?: string;
  clearButtonClassName?: string;
  searchInputClassName?: string;

  // Also supports all props from the native HTMLFieldSetElement
  // component, except "children" and "aria-labelledby"
};

declare function SearchBox(props: Props): JSX.Element;
```

### Throws

- Will throw a render error if called outside of either a `CoderProvider` or `CoderWorkspacesCard.Root`

### Notes

- The logic for processing user input into a new workspaces query is automatically debounced to wait 400ms.

## `CoderWorkspacesCard.WorkspacesList`

Main container for displaying all workspaces returned from a query.

### Type definition

```tsx
type RenderListItemInput = Readonly<{
  workspace: Workspace;
  index: number;
  workspaces: readonly Workspace[];
}>;

type Props = {
  emptyState?: ReactNode;
  ordered?: boolean;
  listClassName?: string;
  fullBleedLayout?: boolean;
  renderListItem?: (input: RenderListItemInput) => ReactNode;

  // Also supports all props from the native HTMLDivElement
  // component, except for "children"
};
```

### Throws

- Will throw a render error if called outside of either a `CoderProvider` or `CoderWorkspacesCard.Root`

### Notes

- If `ordered` is `true`, the component will render as an `<ol>`. Otherwise, the output will be a `<ul>`. `ordered` defaults to `true`.
- If `fullBleedLayout` is `true`, the component will exert negative horizontal margins to fill out its parent
- If `renderListItem` is not specified, this component will default to rendering each list item with [`CoderWorkspacesCard.ListItem`](./components.md#coderworkspacescardworkspaceslistitem)

## `CoderWorkspacesCard.WorkspacesListIcon`

The image to use to represent each workspace.

### Type definition

```tsx
type WorkspaceListIconProps = {
  src: string;
  workspaceName: string;
  imageClassName?: string;
  imageRef?: ForwardedRef<HTMLImageElement>;

  // Also accepts all props from the native HTMLDivElement component,
  // except "children" and "aria-hidden"
};

declare function WorkspaceListIcon(prop: Props): JSX.Element;
```

### Throws

- Does not throw (even if outside `CoderWorkspacesList.Root`)

### Notes

- If there is no `src` available to pass to this component, use an empty string.
- When there is no `src` value, the component will display a fallback graphic

## `CoderWorkspacesCard.WorkspacesListItem`

The default render component to use when the `renderListItem` prop for [`CoderWorkspacesCard.WorkspacesList`] is not defined.

### Type definition

```tsx
type Props = {
  workspace: Workspace;

  buttonClassName?: string;
  linkClassName?: string;
  listFlexRowClassName?: string;
  onlineStatusContainerClassName?: string;
  onlineStatusLightClassName?: string;

  // Also supports all props from the native HTMLLIElement
  // component, except for "children"
};

declare function WorkspaceListItem(props: Props): JSX.Element;
```

### Throws

- Will throw a render error if called outside of either a `CoderProvider` (can be called outside of a `CoderWorkspacesCard.Root`)

### Notes

- Supports full link-like functionality (right-clicking and middle-clicking to open in a new tab, etc.)
