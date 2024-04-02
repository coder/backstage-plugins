import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { Root } from '../CoderWorkspacesCard/Root';
import { Disclosure } from './Disclosure';

type RenderInputs = Readonly<{
  headerText: string;
  children: string;
}>;

function render() {
  return renderInCoderEnvironment({
    children: (
      <Root>
        <Disclosure />
      </Root>
    ),
  });
}

describe(`${Disclosure.name}`, () => {
  it('Will toggle between showing/hiding the disclosure info when the user clicks it', async () => {
    await render();
    const user = userEvent.setup();
    const disclosureButton = screen.getByRole('button', {
      name: /Why am I seeing all workspaces\?/,
    });

    await user.click(disclosureButton);
    const disclosureInfo = await screen.findByText(
      /This component displays all workspaces when the entity has no repo URL to filter by/,
    );

    await user.click(disclosureButton);
    expect(disclosureInfo).not.toBeInTheDocument();
  });
});
