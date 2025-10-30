import { screen } from '@testing-library/react';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { mockBackstageApiEndpoint } from '../../testHelpers/mockBackstageData';
import { mockAuthStates } from '../../testHelpers/mockBackstageData';
import { WorkspacesListIcon } from './WorkspacesListIcon';

describe(`${WorkspacesListIcon.name}`, () => {
  it('Should display a fallback UI element when user is not authenticated', async () => {
    const workspaceName = 'blah';
    const imgPath = `${mockBackstageApiEndpoint}/wrongUrlPal.png`;

    await renderInCoderEnvironment({
      auth: mockAuthStates.tokenMissing,
      children: (
        <WorkspacesListIcon src={imgPath} workspaceName={workspaceName} />
      ),
    });

    // When not authenticated, the component immediately shows the fallback
    // without attempting to fetch the icon from the Coder API
    const fallbackGraphic = screen.getByTestId('icon-fallback');
    const formattedName = workspaceName.slice(0, 1).toUpperCase();
    expect(fallbackGraphic.textContent).toBe(formattedName);

    // Verify the image is not rendered
    const imageIcon = screen.queryByTestId('icon-image');
    expect(imageIcon).not.toBeInTheDocument();
  });
});
