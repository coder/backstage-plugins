import { screen } from '@testing-library/react';
import { Root } from './Root';
import { Placeholder } from './Placeholder';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { mockAppConfig } from '../../testHelpers/mockBackstageData';

describe(`${Placeholder.name}`, () => {
  it('Lets the user create a new workspace when call-to-action behavior is enabled', async () => {
    await renderInCoderEnvironment({
      children: (
        <Root>
          <Placeholder displayCta />
        </Root>
      ),
    });

    const link = screen.getByRole<HTMLAnchorElement>('link', {
      name: /Create workspace/i,
    });

    expect(link).not.toBeDisabled();
    expect(link.target).toBe('_blank');
    expect(link.href).toMatch(
      new RegExp(`^${mockAppConfig.deployment.accessUrl}/`),
    );
  });
});
