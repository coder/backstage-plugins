/**
 * @file Defines a simple routable component for wrapping around non-page
 * Backstage components.
 */
import React from 'react';
import { CoderWorkspacesCard } from '../src/components/CoderWorkspacesCard';
import {
  type CoderAppConfig,
  CoderProvider,
} from '../src/components/CoderProvider';

import {
  Content,
  ContentHeader,
  Header,
  Page,
  SupportButton,
} from '@backstage/core-components';
import { Grid } from '@material-ui/core';

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

const pluginTitle = 'Coder Plugin - dev mode';

export const DevPage = () => {
  return (
    <CoderProvider appConfig={appConfig}>
      <Page themeId="tool">
        <Header
          title={pluginTitle}
          subtitle="Place non-routable components in this wrapper for development"
        />

        <Content>
          <ContentHeader title={pluginTitle}>
            <SupportButton />
          </ContentHeader>

          <Grid container spacing={3} direction="column">
            <Grid
              item
              style={{
                width: '600px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              <CoderWorkspacesCard />
            </Grid>
          </Grid>
        </Content>
      </Page>
    </CoderProvider>
  );
};
