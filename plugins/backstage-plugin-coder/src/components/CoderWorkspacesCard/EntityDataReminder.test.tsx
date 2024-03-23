import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { Root } from './Root';
import { EntityDataReminder } from './EntityDataReminder';

function render() {
  return renderInCoderEnvironment(
    <Root>
      <EntityDataReminder />
    </Root>,
  );
}

describe(`${EntityDataReminder.name}`, () => {
  it('Will toggle between showing/hiding the disclosure info when the user clicks it', async () => {
    render();
    const user = userEvent.setup();
    const disclosureButton = await screen.findByRole('button', {
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
