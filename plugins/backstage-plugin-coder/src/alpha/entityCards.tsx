import React from 'react';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { compatWrapper } from '@backstage/core-compat-api';

/**
 * @alpha
 */
export const coderWorkspacesEntityCard = EntityCardBlueprint.makeWithOverrides({
  config: {
    schema: {
      defaultQueryFilter: z => z.string().optional(),
      readEntityData: z => z.boolean().optional(),
    },
  },
  factory(originalFactory, context) {
    const { defaultQueryFilter, readEntityData } = context.config;
    return originalFactory({
      filter: { kind: 'component' },
      async loader() {
        const { CoderWorkspacesCard } = await import(
          '../components/CoderWorkspacesCard'
        );
        return compatWrapper(
          <CoderWorkspacesCard
            defaultQueryFilter={defaultQueryFilter}
            readEntityData={readEntityData}
          />,
        );
      },
    });
  },
});
