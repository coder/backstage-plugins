import React from 'react';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { CardContext, WorkspacesCardContext } from './Root';
import { SearchBox } from './SearchBox';
import { mockCoderWorkspacesConfig } from '../../testHelpers/mockBackstageData';

async function renderSearchBox() {
  const onFilterChange = jest.fn();
  const mockContext: WorkspacesCardContext = {
    onFilterChange,
    queryFilter: 'owner:me',
    headerId: "Doesn't matter",
    workspacesConfig: mockCoderWorkspacesConfig,
    workspacesQuery:
      null as unknown as WorkspacesCardContext['workspacesQuery'],
  };

  const output = await renderInCoderEnvironment({
    children: (
      <CardContext.Provider value={mockContext}>
        <SearchBox />
      </CardContext.Provider>
    ),
  });

  return { ...output, onFilterChange };
}

describe(`${SearchBox.name}`, () => {
  /**
   * Functionality to test:
   * 1. Clicking anywhere in the searchbox area (aside from the clear button)
   *    will cause the main input to receive focus
   * 2. Clicking the clear button will:
   *    1. Cancel any pending debounced calls
   *    2. Immediately clear out the input
   *    3. Immediately clear out the query callback passed via root
   * 3. Typing behavior
   *    1. Typing immediately updates the input
   *    2. Typing does not immediately dispatch any updates to the Root callback
   *       (update is eventually resolved via debouncing)
   *    3. Clearing out the input field via keyboard is functionally equivalent
   *       to clicking the clear button
   */
});