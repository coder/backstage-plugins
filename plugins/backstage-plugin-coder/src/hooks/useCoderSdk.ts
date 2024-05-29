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

export function useCoderSdk(): BackstageCoderSdk {
  const { sdk } = useApi(coderClientApiRef);
  return sdk;
}
