import React, {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  type QueryCacheNotifyEvent,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useApi } from '@backstage/core-plugin-api';
import { type Theme, makeStyles } from '@material-ui/core';
import { useId } from '../../hooks/hookPolyfills';
import { BackstageHttpError } from '../../api/errors';
import {
  CODER_QUERY_KEY_PREFIX,
  sharedAuthQueryKey,
} from '../../api/queryOptions';
import { coderClientApiRef } from '../../api/CoderClient';
import { CoderLogo } from '../CoderLogo';
import { CoderAuthFormDialog } from '../CoderAuthFormDialog';

const BACKSTAGE_APP_ROOT_ID = '#root';
const FALLBACK_UI_OVERRIDE_CLASS_NAME = 'backstage-root-override';
const TOKEN_STORAGE_KEY = 'coder-backstage-plugin/token';

// Handles auth edge case where a previously-valid token can't be verified. Not
// immediately removing token to provide better UX in case someone's internet
// disconnects for a few seconds
const AUTH_GRACE_PERIOD_TIMEOUT_MS = 6_000;

type AuthState = Readonly<
  | {
      status: 'initializing' | 'tokenMissing';
      token: undefined;
      error: undefined;
    }
  | {
      status: 'authenticated' | 'distrustedWithGracePeriod';
      token: string;
      error: undefined;
    }
  | {
      // Distrusted represents a token that could be valid, but we are unable to
      // verify it within an allowed window. invalid is definitely, 100% invalid
      status:
        | 'authenticating'
        | 'invalid'
        | 'distrusted'
        | 'noInternetConnection'
        | 'deploymentUnavailable';
      token: undefined;
      error: unknown;
    }
>;

export type CoderAuthStatus = AuthState['status'];
export type CoderAuth = Readonly<
  AuthState & {
    isAuthenticated: boolean;
    registerNewToken: (newToken: string) => void;
    ejectToken: () => void;
  }
>;

type TrackComponent = (componentInstanceId: string) => () => void;
export const AuthTrackingContext = createContext<TrackComponent | null>(null);
export const AuthStateContext = createContext<CoderAuth | null>(null);

const validAuthStatuses: readonly CoderAuthStatus[] = [
  'authenticated',
  'distrustedWithGracePeriod',
];

function useAuthState(): CoderAuth {
  const [authToken, setAuthToken] = useState(
    () => window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? '',
  );

  // Need to differentiate the current token from the token loaded on mount
  // because the query object can be disabled. Only want to expose the
  // initializing state if the app mounts with a token already in localStorage
  const [readonlyInitialAuthToken] = useState(authToken);
  const [isInsideGracePeriod, setIsInsideGracePeriod] = useState(true);

  const coderClient = useApi(coderClientApiRef);
  const queryIsEnabled = authToken !== '';

  const authValidityQuery = useQuery<boolean>({
    queryKey: [...sharedAuthQueryKey, authToken],
    queryFn: () => coderClient.syncToken(authToken),
    enabled: queryIsEnabled,
    keepPreviousData: queryIsEnabled,

    // Can't use !query.state.data because we want to refetch on undefined cases
    refetchOnWindowFocus: query => query.state.data !== false,
  });

  const authState = generateAuthState({
    authToken,
    authValidityQuery,
    isInsideGracePeriod,
    initialAuthToken: readonlyInitialAuthToken,
  });

  // Mid-render state sync to avoid unnecessary re-renders that useEffect would
  // introduce. We don't know how costly re-renders could be in someone's
  // arbitrarily-large Backstage deployment, so erring on the side of caution
  if (!isInsideGracePeriod && authState.status === 'authenticated') {
    setIsInsideGracePeriod(true);
  }

  useEffect(() => {
    if (authState.status === 'authenticated') {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, authState.token);
    }
  }, [authState.status, authState.token]);

  // Starts ticking down seconds before we start fully distrusting a token
  useEffect(() => {
    if (authState.status !== 'distrustedWithGracePeriod') {
      return undefined;
    }

    const distrustTimeoutId = window.setTimeout(() => {
      setIsInsideGracePeriod(false);
    }, AUTH_GRACE_PERIOD_TIMEOUT_MS);

    return () => window.clearTimeout(distrustTimeoutId);
  }, [authState.status]);

  // Sets up subscription to spy on potentially-expired tokens. Can't do this
  // outside React because we let the user connect their own queryClient
  const queryClient = useQueryClient();
  useEffect(() => {
    // Pseudo-mutex; makes sure that if we get a bunch of errors, only one
    // revalidation will be processed at a time
    let isRevalidatingToken = false;

    const revalidateTokenOnError = async (event: QueryCacheNotifyEvent) => {
      const queryError = event.query.state.error;
      const shouldRevalidate =
        !isRevalidatingToken &&
        BackstageHttpError.isInstance(queryError) &&
        queryError.status === 401;

      if (!shouldRevalidate) {
        return;
      }

      isRevalidatingToken = true;
      await queryClient.refetchQueries({ queryKey: sharedAuthQueryKey });
      isRevalidatingToken = false;
    };

    const queryCache = queryClient.getQueryCache();
    const unsubscribe = queryCache.subscribe(revalidateTokenOnError);
    return unsubscribe;
  }, [queryClient]);

  return {
    ...authState,
    isAuthenticated: validAuthStatuses.includes(authState.status),
    registerNewToken: newToken => {
      if (newToken !== '') {
        setAuthToken(newToken);
      }
    },
    ejectToken: () => {
      setAuthToken('');
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      queryClient.removeQueries({ queryKey: [CODER_QUERY_KEY_PREFIX] });
    },
  };
}

type AuthFallbackState = Readonly<{
  trackComponent: TrackComponent;
  hasNoAuthInputs: boolean;
}>;

function useAuthFallbackState(): AuthFallbackState {
  // Can't do state syncs or anything else that would normally minimize
  // re-renders here because we have to wait for the entire application to
  // complete its initial render before we can decide if we need a fallback UI
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Not the biggest fan of needing to keep the two pieces of state in sync, but
  // setting the render state to a simple boolean rather than the whole Set
  // means that we re-render only when we go from 0 trackers to 1+, or from 1+
  // trackers to 0. We don't care about the exact number of components being
  // tracked - just whether we have any at all
  const [hasTrackers, setHasTrackers] = useState(false);
  const trackedComponentsRef = useRef<Set<string>>(null!);
  if (trackedComponentsRef.current === null) {
    trackedComponentsRef.current = new Set();
  }

  const trackComponent = useCallback((componentId: string) => {
    // React will bail out of re-renders if you dispatch the same state value
    // that it already has, and that's easier to guarantee since the UI state
    // only has a primitive. Calling this function too often should cause no
    // problems, and most calls should be a no-op
    const syncTrackerToUi = () => {
      setHasTrackers(trackedComponentsRef.current.size > 0);
    };

    trackedComponentsRef.current.add(componentId);
    syncTrackerToUi();

    return () => {
      trackedComponentsRef.current.delete(componentId);
      syncTrackerToUi();
    };
  }, []);

  return {
    trackComponent,
    hasNoAuthInputs: isMounted && !hasTrackers,
  };
}

/**
 * Exposes auth state for other components, but has additional logic for spying
 * on consumers of the hook.
 *
 * Caveats:
 * 1. This hook should *NEVER* be exposed to the end user
 * 2. All official Coder plugin components should favor this hook over
 *    useEndUserCoderAuth when possible
 *
 * A fallback UI for letting the user input auth information will appear if
 * there are no official Coder components that are able to give the user a way
 * to do that through normal user flows.
 */
export function useInternalCoderAuth(): CoderAuth {
  const trackComponent = useContext(AuthTrackingContext);
  if (trackComponent === null) {
    throw new Error('Unable to retrieve state for displaying fallback auth UI');
  }

  // Assuming trackComponent is set up properly, the values of it and instanceId
  // should both be stable until whatever component is using this hook unmounts.
  // Values only added to dependency array to satisfy ESLint
  const instanceId = useId();
  useEffect(() => {
    const cleanupTracking = trackComponent(instanceId);
    return cleanupTracking;
  }, [instanceId, trackComponent]);

  return useEndUserCoderAuth();
}

/**
 * Exposes Coder auth state to the rest of the UI.
 */
// This hook should only be used by end users trying to use the Coder SDK inside
// Backstage. The hook is renamed on final export to avoid confusion
export function useEndUserCoderAuth(): CoderAuth {
  const authContextValue = useContext(AuthStateContext);
  if (authContextValue === null) {
    throw new Error('Cannot retrieve auth information from CoderProvider');
  }

  return authContextValue;
}

type GenerateAuthStateInputs = Readonly<{
  authToken: string;
  initialAuthToken: string;
  authValidityQuery: UseQueryResult<boolean>;
  isInsideGracePeriod: boolean;
}>;

/**
 * This function isn't too big, but it is accounting for a lot of possible
 * configurations that authValidityQuery can be in while background fetches and
 * re-fetches are happening. Can't get away with checking the .status alone
 *
 * @see {@link https://tkdodo.eu/blog/status-checks-in-react-query}
 */
function generateAuthState({
  authToken,
  initialAuthToken,
  authValidityQuery,
  isInsideGracePeriod,
}: GenerateAuthStateInputs): AuthState {
  const isInitializing =
    initialAuthToken !== '' &&
    authValidityQuery.isLoading &&
    authValidityQuery.isFetching &&
    !authValidityQuery.isFetchedAfterMount;

  if (isInitializing) {
    return {
      status: 'initializing',
      token: undefined,
      error: undefined,
    };
  }

  // Checking the token here is more direct than trying to check the query
  // object's state transitions; React Query has no simple isEnabled property
  if (!authToken) {
    return {
      status: 'tokenMissing',
      token: undefined,
      error: undefined,
    };
  }

  if (BackstageHttpError.isInstance(authValidityQuery.error)) {
    const deploymentLikelyUnavailable =
      authValidityQuery.error.status === 504 ||
      (authValidityQuery.error.status === 200 &&
        authValidityQuery.error.contentType !== 'application/json');

    if (deploymentLikelyUnavailable) {
      return {
        status: 'deploymentUnavailable',
        token: undefined,
        error: authValidityQuery.error,
      };
    }
  }

  const isTokenValidFromPrevFetch = authValidityQuery.data === true;
  if (isTokenValidFromPrevFetch) {
    const canTrustAuthThisRender =
      authValidityQuery.isSuccess && !authValidityQuery.isPaused;
    if (canTrustAuthThisRender) {
      return {
        status: 'authenticated',
        token: authToken,
        error: undefined,
      };
    }

    if (isInsideGracePeriod) {
      return {
        status: 'distrustedWithGracePeriod',
        token: authToken,
        error: undefined,
      };
    }

    return {
      status: 'distrusted',
      token: undefined,
      error: authValidityQuery.error,
    };
  }

  // Have to include isLoading here because the auth query uses the
  // isPreviousData property to mask the fact that we're shifting to different
  // query keys and cache pockets each time the token value changes
  const isAuthenticating =
    authValidityQuery.isLoading ||
    (authValidityQuery.isRefetching &&
      ((authValidityQuery.isError && authValidityQuery.data !== true) ||
        (authValidityQuery.isSuccess && authValidityQuery.data === false)));

  if (isAuthenticating) {
    return {
      status: 'authenticating',
      token: undefined,
      error: authValidityQuery.error,
    };
  }

  // Catches edge case where only the Backstage client is up, so the token can't
  // be verified (even if it's perfectly valid); all Coder proxy requests are
  // set up to time out after 20 seconds
  const isCoderDeploymentDown =
    authValidityQuery.error instanceof Error &&
    authValidityQuery.error.name === 'TimeoutError';
  if (isCoderDeploymentDown) {
    return {
      status: 'distrusted',
      token: undefined,
      error: authValidityQuery.error,
    };
  }

  // Start of catch-all logic; handles remaining possible cases, and aliases
  // "impossible" cases to possible ones (mainly to make compiler happy)
  if (authValidityQuery.isPaused) {
    return {
      status: 'noInternetConnection',
      token: undefined,
      error: authValidityQuery.error,
    };
  }

  return {
    status: 'invalid',
    token: undefined,
    error: authValidityQuery.error,
  };
}

// Have to get the root of the React application to adjust its dimensions when
// we display the fallback UI. Sadly, we can't assert that the root is always
// defined from outside a UI component, because throwing any errors here would
// blow up the entire Backstage application, and wreck all the other plugins
const mainAppRoot = document.querySelector<HTMLElement>(BACKSTAGE_APP_ROOT_ID);

type StyleKey = 'landmarkWrapper' | 'dialogButton' | 'logo';
type StyleProps = Readonly<{ isDialogOpen: boolean }>;

const useFallbackStyles = makeStyles<Theme, StyleProps, StyleKey>(theme => ({
  landmarkWrapper: ({ isDialogOpen }) => ({
    zIndex: isDialogOpen ? 0 : 9999,
    position: 'fixed',
    bottom: theme.spacing(2),
    width: '100%',
    maxWidth: 'fit-content',
    left: '50%',
    transform: 'translateX(-50%)',
  }),

  dialogButton: {
    display: 'flex',
    flexFlow: 'row nowrap',
    columnGap: theme.spacing(1),
    alignItems: 'center',
  },

  logo: {
    fill: theme.palette.primary.contrastText,
    width: theme.spacing(3),
  },
}));

function FallbackAuthUi() {
  /**
   * Add additional padding to the bottom of the main app to make sure that even
   * with the fallback UI in place, it won't permanently cover up any of the
   * other content as long as the user scrolls down far enough.
   *
   * Involves jumping through a bunch of hoops since we don't have 100% control
   * over the Backstage application. Need to minimize risks of breaking existing
   * Backstage styling or other plugins
   */
  const fallbackRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const fallback = fallbackRef.current;
    const mainAppContainer =
      mainAppRoot?.querySelector<HTMLElement>('main') ?? null;

    if (fallback === null || mainAppContainer === null) {
      return undefined;
    }

    // Adding a new style node lets us override the existing styles via the CSS
    // cascade rather than directly modifying them, which minimizes the risks of
    // breaking anything. If we were to modify the styles and try resetting them
    // with the cleanup function, there's a risk the cleanup function would have
    // closure over stale values and try "resetting" things to a value that is
    // no longer used
    const overrideStyleNode = document.createElement('style');
    overrideStyleNode.type = 'text/css';

    // Using ComputedStyle objects because they maintain live links to computed
    // properties. Plus, since most styling goes through MUI's makeStyles (which
    // is based on CSS classes), trying to access properties directly off the
    // nodes won't always work
    const liveAppStyles = getComputedStyle(mainAppContainer);
    const liveFallbackStyles = getComputedStyle(fallback);

    let prevPaddingBottom: string | undefined = undefined;
    const updatePaddingForFallbackUi: MutationCallback = () => {
      const prevInnerHtml = overrideStyleNode.innerHTML;
      overrideStyleNode.innerHTML = '';
      const paddingBottomWithNoOverride = liveAppStyles.paddingBottom || '0px';

      if (paddingBottomWithNoOverride === prevPaddingBottom) {
        overrideStyleNode.innerHTML = prevInnerHtml;
        return;
      }

      // parseInt will automatically remove units from bottom property
      const fallbackBottom = parseInt(liveFallbackStyles.bottom || '0', 10);
      const normalized = Number.isNaN(fallbackBottom) ? 0 : fallbackBottom;
      const paddingToAdd = fallback.offsetHeight + normalized;

      overrideStyleNode.innerHTML = `
        .${FALLBACK_UI_OVERRIDE_CLASS_NAME} {
          padding-bottom: calc(${paddingBottomWithNoOverride} + ${paddingToAdd}px) !important;
        }
      `;

      // Only update prev padding after state changes have definitely succeeded
      prevPaddingBottom = paddingBottomWithNoOverride;
    };

    const observer = new MutationObserver(updatePaddingForFallbackUi);
    observer.observe(document.head, { childList: true });
    observer.observe(mainAppContainer, {
      childList: false,
      subtree: false,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    // Applying mutations after we've started observing will trigger the
    // callback, but as long as it's set up properly, the user shouldn't notice.
    // Also serves a way to ensure the mutation callback runs at least once
    document.head.append(overrideStyleNode);
    mainAppContainer.classList.add(FALLBACK_UI_OVERRIDE_CLASS_NAME);

    return () => {
      // Be sure to disconnect observer before applying other cleanup mutations
      observer.disconnect();
      overrideStyleNode.remove();
      mainAppContainer.classList.remove(FALLBACK_UI_OVERRIDE_CLASS_NAME);
    };
  }, []);

  const hookId = useId();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const styles = useFallbackStyles({ isDialogOpen });

  // Wrapping fallback button in landmark so that screen reader users can jump
  // straight to the button from a screen reader directory rotor, and don't have
  // to navigate through every single other element first
  const landmarkId = `${hookId}-landmark`;
  const fallbackUi = (
    <section
      ref={fallbackRef}
      className={styles.landmarkWrapper}
      aria-labelledby={landmarkId}
    >
      <h2 id={landmarkId} hidden>
        Authenticate with Coder to enable Coder plugin features
      </h2>

      <CoderAuthFormDialog
        open={isDialogOpen}
        onOpen={() => setIsDialogOpen(true)}
        onClose={() => setIsDialogOpen(false)}
        triggerClassName={styles.dialogButton}
      >
        <CoderLogo className={styles.logo} />
        Authenticate with Coder
      </CoderAuthFormDialog>
    </section>
  );

  return createPortal(fallbackUi, document.body);
}

/**
 * Sorry about how wacky this approach is, but this setup should simplify the
 * code literally everywhere else in the plugin.
 *
 * The setup is that we have two versions of the tracking context: one that has
 * the live trackComponent function, and one that has the dummy. The main parts
 * of the UI get the live version, and the parts of the UI that deal with the
 * fallback auth UI get the dummy version.
 *
 * By having two contexts, we can dynamically expose or hide the tracking
 * state for any components that use any version of the Coder auth state. All
 * other components can use the same hook without being aware of where they're
 * being mounted. That means you can use the exact same components in either
 * region without needing to rewrite anything outside this file.
 *
 * Any other component that uses useInternalCoderAuth will reach up the
 * component tree until it can grab *some* kind of tracking function. The hook
 * only cares about whether it got a function at all; it doesn't care about what
 * it does. The hook will call the function either way, but only the components
 * in the "live" region will influence whether the fallback UI should be
 * displayed.
 *
 * Dummy function defined outside the component to prevent risk of needless
 * re-renders through Context.
 */
const dummyTrackComponent: TrackComponent = () => {
  // Deliberately perform a no-op on initial call
  return () => {
    // And deliberately perform a no-op on cleanup
  };
};

export const CoderAuthProvider = ({
  children,
}: Readonly<PropsWithChildren<unknown>>) => {
  const authState = useAuthState();
  const { hasNoAuthInputs, trackComponent } = useAuthFallbackState();
  const needFallbackUi = !authState.isAuthenticated && hasNoAuthInputs;

  return (
    <AuthStateContext.Provider value={authState}>
      <AuthTrackingContext.Provider value={trackComponent}>
        {children}
      </AuthTrackingContext.Provider>

      {needFallbackUi && (
        <AuthTrackingContext.Provider value={dummyTrackComponent}>
          <FallbackAuthUi />
        </AuthTrackingContext.Provider>
      )}
    </AuthStateContext.Provider>
  );
};
