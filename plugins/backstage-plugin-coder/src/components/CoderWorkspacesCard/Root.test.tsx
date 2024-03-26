import React, { type ReactNode } from 'react';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { Root } from './Root';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

type RenderInputs = Readonly<{
  children: ReactNode;
}>;

function renderRoot(inputs?: RenderInputs) {
  const { children } = inputs ?? {};
  return renderInCoderEnvironment({
    children: <Root>{children}</Root>,
  });
}

describe(`${Root.name}`, () => {
  //   const originalWindow = window;
  //   let currentReload: typeof window.location.reload;

  //   beforeEach(() => {
  //     jest.spyOn(global, 'window', 'get').mockImplementation(() => {
  //       currentReload = jest.fn();
  //       return {
  //         ...originalWindow,
  //         location: {
  //           ...originalWindow.location,
  //           reload: currentReload,
  //         },
  //       };
  //     });
  //   });

  //   afterEach(() => {
  //     jest.restoreAllMocks();
  //   });

  it("Is exposed to the accessibility tree as a 'search' element", async () => {
    await renderRoot();
    expect(() => screen.getByRole('search')).not.toThrow();
  });

  it("Does not cause any button children of type 'submit' to trigger page reloads when they are clicked", async () => {
    const buttonText = "Don't trigger reloads please";
    const onClick = jest.fn();

    await renderRoot({
      // All buttons are automatically of type "submit" when the type isn't
      // specified, but it helps to be explicit
      children: (
        <button type="submit" onClick={onClick}>
          {buttonText}
        </button>
      ),
    });

    const user = userEvent.setup();
    const button = screen.getByRole('button', {
      name: buttonText,
    });

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.only('Does not make input children trigger full page reloads when the Enter key is pressed while focused', async () => {
    const inputLabel = "Don't reload on Enter, please";
    const onChange = jest.fn();

    await renderRoot({
      children: (
        <label>
          {inputLabel}
          <input type="text" defaultValue="blah" onChange={onChange} />
        </label>
      ),
    });

    const user = userEvent.setup();
    const input = screen.getByRole('textbox', {
      name: inputLabel,
    });

    await user.click(input);
    await user.keyboard('[Enter]');
  });
});
