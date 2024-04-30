import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { mockBackstageApiEndpoint } from '../../testHelpers/mockBackstageData';
import { WorkspacesListIcon } from './WorkspacesListIcon';

describe(`${WorkspacesListIcon.name}`, () => {
  it('Should display a fallback UI element instead of a broken image when the image fails to load', async () => {
    const workspaceName = 'blah';
    const imgPath = `${mockBackstageApiEndpoint}/wrongUrlPal.png`;

    await renderInCoderEnvironment({
      children: (
        <WorkspacesListIcon src={imgPath} workspaceName={workspaceName} />
      ),
    });

    // Have to use test ID because the icon image itself has role "none" (it's
    // decorative only and shouldn't be exposed to screen readers)
    const imageIcon = screen.getByTestId('icon-image');

    // Simulate the image automatically making a network request, but for
    // whatever reason, the load fails (error code 404/500, proxy issues, etc.)
    fireEvent.error(imageIcon);

    const fallbackGraphic = await screen.findByTestId('icon-fallback');
    const formattedName = workspaceName.slice(0, 1).toUpperCase();
    expect(fallbackGraphic.textContent).toBe(formattedName);
    expect(imageIcon).not.toBeInTheDocument();
  });
});
