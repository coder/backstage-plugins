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
  readEntityData?: boolean;
  repoUrl?: string;
}>;

function renderHeaderRow(input?: RenderInputs) {
  const { repoUrl, readEntityData = false } = input ?? {};

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
      <Root readEntityData={readEntityData}>
        <HeaderRow />
      </Root>
    ),
  });
}

describe(`${HeaderRow.name}`, () => {
  const subheaderTextMatcher = /Results filtered by/i;

  it('Has a header with an ID that matches the ID of the parent root container (needed for a11y landmark behavior)', async () => {
    await renderHeaderRow();
    const searchContainer = screen.getByRole('search');
    const header = screen.getByRole('heading');

    const labelledByBinding = searchContainer.getAttribute('aria-labelledby');
    expect(header.id).toBe(labelledByBinding);
  });

  it('Will hide text about filtering active repos if the Root is not configured to read entity data', async () => {
    await renderHeaderRow({ readEntityData: false });
    const subheader = screen.queryByText(subheaderTextMatcher);
    expect(subheader).not.toBeInTheDocument();
  });

  it('Will dynamically show the name of the current repo (when it can be parsed)', async () => {
    await renderHeaderRow({ readEntityData: true });
    const subheader = screen.getByText(subheaderTextMatcher);

    expect(subheader.textContent).toEqual(
      `Results filtered by repo: ${mockRepoName}`,
    );
  });

  it("Will show fallback indicator for the repo name if it can't be parsed", async () => {
    await renderHeaderRow({
      readEntityData: true,
      repoUrl: 'https://www.blah.com/unknown/repo/format',
    });

    const subheader = screen.getByText(subheaderTextMatcher);
    expect(subheader.textContent).toEqual('Results filtered by repo URL');
  });
});
