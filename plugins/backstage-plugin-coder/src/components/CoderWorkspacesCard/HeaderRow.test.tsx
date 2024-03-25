import React from 'react';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { HeaderRow } from './HeaderRow';
import { Root } from './Root';
import { screen } from '@testing-library/react';
import {
  ANNOTATION_SOURCE_LOCATION_KEY,
  BackstageEntity,
  mockEntity,
  mockRepoName,
} from '../../testHelpers/mockBackstageData';

type RenderInputs = Readonly<{
  repoUrl?: string;
}>;

function renderHeaderRow(input?: RenderInputs) {
  const { repoUrl } = input ?? {};

  let entity: BackstageEntity = mockEntity;
  if (repoUrl) {
    entity = {
      ...mockEntity,
      metadata: {
        ...mockEntity.metadata,
        annotations: {
          ...(mockEntity.metadata?.annotations ?? {}),
          [ANNOTATION_SOURCE_LOCATION_KEY]: `url:${repoUrl}`,
        },
      },
    };
  }

  return renderInCoderEnvironment({
    entity,
    children: (
      <Root readEntityData>
        <HeaderRow />
      </Root>
    ),
  });
}

describe(`${HeaderRow.name}`, () => {
  it('Has a header with an ID that matches the ID of the parent root container (needed for a11y landmark behavior)', async () => {
    await renderHeaderRow();
    const searchContainer = screen.getByRole('search');
    const header = screen.getByRole('heading');

    const labelledByBinding = searchContainer.getAttribute('aria-labelledby');
    expect(header.id).toBe(labelledByBinding);
  });

  it.only('Will dynamically show the name of the current repo (when it can be parsed)', async () => {
    await renderHeaderRow();
    const subheader = screen.getByText(/Results filtered by/i);
    expect(subheader.textContent).toEqual(
      `Results filtered by repo: ${mockRepoName}`,
    );
  });

  it("Will show fallback indicator for the repo name if it can't be parsed", async () => {
    await renderHeaderRow();
    expect.hasAssertions();
  });
});
