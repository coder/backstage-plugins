import React, { ReactNode } from 'react';
import { compatWrapper } from '@backstage/core-compat-api';
import { AppRootWrapperBlueprint } from '@backstage/frontend-plugin-api';
import { CoderProvider } from '../plugin';

/**
 * @alpha
 */
export const coderProviderRootWrapper =
  AppRootWrapperBlueprint.makeWithOverrides({
    config: {
      schema: {
        fallbackAuthUiMode: z =>
          z
            .union([
              z.literal('restrained'),
              z.literal('assertive'),
              z.literal('hidden'),
            ])
            .optional(),
        appConfig: z =>
          z.object({
            deployment: z.object({
              accessUrl: z.string(),
            }),
            workspaces: z.object({
              defaultMode: z
                .union([z.literal('manual'), z.literal('auto')])
                .optional(),
              defaultTemplateName: z.string().optional(),
              params: z.record(z.string(), z.string().optional()).optional(),
              repoUrlParamKeys: z.tuple([z.string()]).rest(z.string()),
            }),
          }),
      },
    },
    factory(originalFactory, context) {
      const appConfig = context.config.appConfig;
      const fallbackAuthUiMode = context.config.fallbackAuthUiMode;
      return originalFactory({
        component(props: { children: ReactNode }) {
          const { children } = props;
          return compatWrapper(
            <CoderProvider
              appConfig={appConfig}
              fallbackAuthUiMode={fallbackAuthUiMode}
            >
              {children}
            </CoderProvider>,
          );
        },
      });
    },
  });
