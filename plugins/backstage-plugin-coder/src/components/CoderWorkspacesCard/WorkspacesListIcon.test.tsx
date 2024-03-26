import React from 'react';
import { screen } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '../../testHelpers/server';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { mockBackstageProxyEndpoint } from '../../testHelpers/mockBackstageData';
import { Root } from './Root';
import { WorkspacesListIcon } from './WorkspacesListIcon';

describe(`${WorkspacesListIcon.name}`, () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('Should display a fallback UI element instead of a broken image when the image fails to load', async () => {
    const workspaceName = 'Blah';
    const imgPath = `${mockBackstageProxyEndpoint}/wrongUrlBuddy.png`;

    server.use(
      rest.get(imgPath, (_, res, ctx) => {
        console.log('Hit?');
        return res(ctx.status(404));
      }),
    );

    await renderInCoderEnvironment({
      children: (
        <Root>
          <WorkspacesListIcon src={imgPath} workspaceName={workspaceName} />
        </Root>
      ),
    });

    const fallbackGraphic = await screen.findByTestId('icon-fallback');
    expect(fallbackGraphic.textContent).toBe(workspaceName[0]);

    const imageIcon = screen.getByTestId('icon-image');
    expect(imageIcon).not.toBeInTheDocument();
  });
});
