import { useDevcontainersConfig } from '../components/DevcontainersProvider';
import { useEntity } from '@backstage/plugin-catalog-react';
import type { VsCodeUrlKey } from '@coder/backstage-plugin-devcontainers-backend';

// We avoid importing the actual constant to prevent making the backend plugin a
// run-time dependency, but we can use the type at compile-time to validate the
// string is the same.
const vsCodeUrlKey: VsCodeUrlKey = 'vsCodeUrl';

export type UseDevcontainersResult = Readonly<
  {
    tagName: string;
  } & (
    | {
        /**
         * Indicates whether the current entity component has a devcontainers
         * URL associated with it.
         *
         * This value is set up as a discriminated union for better ergonomics.
         * As long as `hasUrl` is true (and the code has been narrowed with a type
         * guard), `vsCodeUrl` will always be of type string
         */
        hasUrl: false;
        vsCodeUrl: undefined;
      }
    | {
        hasUrl: true;
        vsCodeUrl: string;
      }
  )
>;

export function useDevcontainers(): UseDevcontainersResult {
  const { tagName } = useDevcontainersConfig();
  const { entity } = useEntity();

  const tags = entity.metadata?.tags ?? [];
  if (!tags.includes(tagName)) {
    return {
      tagName,
      hasUrl: false,
      vsCodeUrl: undefined,
    };
  }

  const vsCodeUrl = entity.metadata.annotations?.[vsCodeUrlKey];
  if (!vsCodeUrl) {
    return {
      tagName,
      hasUrl: false,
      vsCodeUrl: undefined,
    };
  }

  return {
    tagName,
    hasUrl: true,
    vsCodeUrl,
  };
}
