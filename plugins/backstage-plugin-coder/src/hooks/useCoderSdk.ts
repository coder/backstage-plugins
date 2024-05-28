/**
 * @file This defines the general helper for accessing the Coder SDK from
 * Backstage in a type-safe way.
 *
 * This hook is meant to be used both internally AND externally. It exposes some
 * auth helpers to make end users' lives easier, but all of them go through
 * useEndUserCoderAuth. If building any internal components, be sure to have a
 * call to useInternalCoderAuth somewhere, to make sure that the component
 * interfaces with the fallback auth UI inputs properly.
 *
 * See CoderAuthProvider.tsx for more info.
 */
import { useApi } from '@backstage/core-plugin-api';
import { coderClientApiRef, type BackstageCoderSdk } from '../api/CoderClient';
import { useEndUserCoderAuth } from '../components/CoderProvider';

type UseCoderSdkResult = Readonly<{
  sdk: BackstageCoderSdk;
  backstageUtils: Readonly<{
    unlinkCoderAccount: () => void;
  }>;
}>;

export function useCoderSdk(): UseCoderSdkResult {
  const { ejectToken } = useEndUserCoderAuth();
  const { sdk } = useApi(coderClientApiRef);

  return {
    sdk,
    backstageUtils: {
      // Hoping that as we support more auth methods, this function gets beefed
      // up to be an all-in-one function for removing any and all auth info.
      // Simply doing a pass-through for now
      unlinkCoderAccount: ejectToken,
    },
  };
}
