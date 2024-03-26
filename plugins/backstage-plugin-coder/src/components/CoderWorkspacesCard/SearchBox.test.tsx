import React from 'react';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { CardContext, WorkspacesCardContext } from './Root';
import { SearchBox } from './SearchBox';
import { mockCoderWorkspacesConfig } from '../../testHelpers/mockBackstageData';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

type RenderInputs = Readonly<{
  queryFilter?: string;
}>;

async function renderSearchBox(input?: RenderInputs) {
  const { queryFilter = 'owner:me' } = input ?? {};
  const onFilterChange = jest.fn();

  const mockContext: WorkspacesCardContext = {
    onFilterChange,
    queryFilter,
    headerId: "Doesn't matter",
    workspacesConfig: mockCoderWorkspacesConfig,
    workspacesQuery:
      null as unknown as WorkspacesCardContext['workspacesQuery'],
  };

  const renderOutput = await renderInCoderEnvironment({
    children: (
      <CardContext.Provider value={mockContext}>
        <SearchBox />
      </CardContext.Provider>
    ),
  });

  const inputField = screen.getByRole<HTMLInputElement>('searchbox', {
    name: /Search your Coder workspaces/i,
  });

  return { ...renderOutput, inputField, onFilterChange };
}

describe(`${SearchBox.name}`, () => {
  describe('General functionality', () => {
    const sampleInputText = 'Here is some cool text';

    it('Will update the input immediately in response to the user typing', async () => {
      const { inputField } = await renderSearchBox();
      const user = userEvent.setup();

      // Using triple-click to simulate highlighting all the text in the input
      await user.tripleClick(inputField);
      await user.keyboard(`[Backspace]${sampleInputText}`);

      expect(inputField.value).toBe(sampleInputText);
    });

    it('Will debounce calls to the parent provider as the user types more characters', async () => {
      const { inputField, onFilterChange } = await renderSearchBox();
      const user = userEvent.setup();

      await user.click(inputField);
      await user.keyboard(sampleInputText);

      expect(onFilterChange).not.toHaveBeenCalled();
      await waitFor(() => expect(onFilterChange).toHaveBeenCalledTimes(1));
    });
  });

  /**
   * Two ways to clear the input:
   * 1. Clicking the clear button
   * 2. Hitting backspace on the keyboard until the input field is empty
   *
   * Which both immediately cause the following behavior when triggered:
   * 1. Clears out the visible input
   * 2. Calls the Root query callback with an empty string
   * 3. Cancels any pending debounced calls
   */
  describe('Text-clearing functionality', () => {
    it('Lets the user clear the text via the Clear button', async () => {
      const user = userEvent.setup();
      const { inputField, onFilterChange } = await renderSearchBox({
        queryFilter: '',
      });

      const clearButton = screen.getByRole('button', {
        name: /Clear out search/i,
      });

      const sampleInputText = 'clear me out please';
      await user.click(inputField);
      await user.keyboard(sampleInputText);
      expect(inputField.value).toBe(sampleInputText);
      expect(onFilterChange).not.toHaveBeenCalled();

      await user.click(clearButton);
      expect(inputField.value).toBe('');
      expect(onFilterChange).toHaveBeenCalledTimes(1);
      expect(onFilterChange).toHaveBeenCalledWith('');
    });

    it('Lets the user trigger clear behavior by hitting Backspace', async () => {
      const user = userEvent.setup();
      const { inputField, onFilterChange } = await renderSearchBox({
        queryFilter: 'H',
      });

      await user.click(inputField);
      await user.keyboard('i');
      expect(inputField.value).toBe('Hi');
      expect(onFilterChange).not.toHaveBeenCalled();

      await user.keyboard('[Backspace][Backspace]');
      expect(inputField.value).toBe('');
      expect(onFilterChange).toHaveBeenCalledTimes(1);
      expect(onFilterChange).toHaveBeenCalledWith('');
    });
  });
});
