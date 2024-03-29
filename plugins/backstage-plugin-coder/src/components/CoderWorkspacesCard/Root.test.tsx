/**
 * @file This file covers functionality that is specific to the Root component
 * when used by itself.
 *
 * For full integration tests (and test cases for the vast majority of
 * meaningful functionality), see CoderWorkspacesCard.test.tsx
 */
import React, { type ReactNode } from 'react';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { Root } from './Root';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

type RenderInputs = Readonly<{
  children: ReactNode;
}>;

async function renderRoot(inputs?: RenderInputs) {
  const { children } = inputs ?? {};

  // The onSubmit handler is designed not to be the direct recipient of submit
  // events, but passively receive them as they're triggered in the form, and
  // then bubble up towards the root of the DOM
  const onSubmit = jest.fn();
  const renderOutput = await renderInCoderEnvironment({
    children: (
      <div onSubmit={onSubmit}>
        <Root>{children}</Root>
      </div>
    ),
  });

  return { ...renderOutput, onSubmit };
}

describe(`${Root.name}`, () => {
  it("Is exposed to the accessibility tree as a 'search' element", async () => {
    await renderRoot();
    expect(() => screen.getByRole('search')).not.toThrow();
  });

  it("Does not cause any button children of type 'submit' to trigger submit events when they are clicked", async () => {
    const buttonText = "Don't trigger reloads please";
    const { onSubmit } = await renderRoot({
      // All buttons have type "submit" when the type isn't specified
      children: <button>{buttonText}</button>,
    });

    const user = userEvent.setup();
    const button = screen.getByRole('button', {
      name: buttonText,
    });

    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Does not make focused input children trigger submit events when the Enter key is pressed', async () => {
    const inputLabel = "Don't reload on Enter, please";
    const { onSubmit } = await renderRoot({
      children: (
        <label>
          {inputLabel}
          <input type="text" defaultValue="blah" />
        </label>
      ),
    });

    const user = userEvent.setup();
    const input = screen.getByRole('textbox', {
      name: inputLabel,
    });

    await user.click(input);
    await user.keyboard('[Enter]');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
