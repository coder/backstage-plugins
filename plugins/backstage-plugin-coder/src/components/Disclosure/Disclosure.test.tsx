import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { type DisclosureProps, Disclosure } from './Disclosure';

type RenderInputs = Partial<DisclosureProps>;

function render(inputs?: RenderInputs) {
  const { headerText, children, isExpanded, onExpansion } = inputs ?? {};

  return renderInCoderEnvironment({
    children: (
      <Disclosure
        headerText={headerText}
        isExpanded={isExpanded}
        onExpansion={onExpansion}
      >
        {children}
      </Disclosure>
    ),
  });
}

describe(`${Disclosure.name}`, () => {
  it('Will toggle between showing/hiding the disclosure info when the user clicks it', async () => {
    const headerText = 'Blah';
    const children = 'Blah blah blah blah';
    await render({ headerText, children });

    const user = userEvent.setup();
    const disclosureButton = screen.getByRole('button', { name: headerText });
    await user.click(disclosureButton);

    const disclosureInfo = await screen.findByText(children);
    await user.click(disclosureButton);
    expect(disclosureInfo).not.toBeInTheDocument();
  });

  it('Can flip from an uncontrolled input to a controlled one if additional props are passed in', async () => {
    const headerText = 'Blah';
    const children = 'Blah blah blah blah';
    const onExpansion = jest.fn();

    const { rerender } = await render({
      onExpansion,
      headerText,
      children,
      isExpanded: true,
    });

    const user = userEvent.setup();
    const disclosureInfo = await screen.findByText(children);
    const disclosureButton = screen.getByRole('button', { name: headerText });

    await user.click(disclosureButton);
    expect(onExpansion).toHaveBeenCalled();

    rerender(
      <Disclosure
        headerText={headerText}
        onExpansion={onExpansion}
        isExpanded={false}
      >
        {children}
      </Disclosure>,
    );

    expect(disclosureInfo).not.toBeInTheDocument();
  });
});
