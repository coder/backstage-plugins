import React from 'react';
import { render, screen } from '@testing-library/react';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import {
  getMockConfigApi,
  getMockErrorApi,
  getMockSourceControl,
  mockAppConfig,
  mockEntity,
} from '../../testHelpers/mockBackstageData';
import { Root } from './Root';
import { CreateWorkspaceLink } from './CreateWorkspaceLink';
import { CoderProviderWithMockAuth } from '../../testHelpers/setup';
import { TestApiProvider, wrapInTestApp } from '@backstage/test-utils';
import { configApiRef, errorApiRef } from '@backstage/core-plugin-api';
import { scmIntegrationsApiRef } from '@backstage/integration-react';
import userEvent from '@testing-library/user-event';

function renderComponent() {
  const mockErrorApi = getMockErrorApi();
  const mockSourceControl = getMockSourceControl();
  const mockConfigApi = getMockConfigApi();

  const mainMarkup = (
    <TestApiProvider
      apis={[
        [errorApiRef, mockErrorApi],
        [scmIntegrationsApiRef, mockSourceControl],
        [configApiRef, mockConfigApi],
      ]}
    >
      <CoderProviderWithMockAuth appConfig={mockAppConfig}>
        <EntityProvider entity={mockEntity}>
          <Root>
            <CreateWorkspaceLink />
          </Root>
        </EntityProvider>
      </CoderProviderWithMockAuth>
    </TestApiProvider>
  );

  const wrapped = wrapInTestApp(mainMarkup) as unknown as typeof mainMarkup;
  return render(wrapped);
}

describe(`${CreateWorkspaceLink.name}`, () => {
  it('Displays a link based on the current entity', async () => {
    renderComponent();
    const link = await screen.findByRole<HTMLAnchorElement>('link');

    expect(link).not.toBeDisabled();
    expect(link.target).toEqual('_blank');
    expect(link.href).toMatch(
      new RegExp(`^${mockAppConfig.deployment.accessUrl}/`),
    );
  });

  it('Will display a tooltip while hovered over', async () => {
    renderComponent();
    const link = await screen.findByRole<HTMLAnchorElement>('link');
    const user = userEvent.setup();

    await user.hover(link);
    const tooltip = await screen.findByText('Add a new workspace');
    expect(tooltip).toBeInTheDocument();
  });
});
