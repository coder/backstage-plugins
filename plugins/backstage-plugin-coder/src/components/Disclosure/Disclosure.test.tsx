import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type DisclosureProps, Disclosure } from './Disclosure';

type RenderInputs = Partial<DisclosureProps>;

function renderDisclosure(inputs?: RenderInputs) {
  const { headerText, children, isExpanded, onExpansionToggle } = inputs ?? {};

  return render(
    <Disclosure
      headerText={headerText}
      isExpanded={isExpanded}
      onExpansionToggle={onExpansionToggle}
    >
      {children}
    </Disclosure>,
  );
}

describe(`${Disclosure.name}`, () => {
  it('Will toggle between showing/hiding the disclosure info when the user clicks it', async () => {
    const headerText = 'Blah';
    const children = 'Blah blah blah blah';
    renderDisclosure({ headerText, children });

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
    const onExpansionToggle = jest.fn();

    const { rerender } = renderDisclosure({
      onExpansionToggle,
      headerText,
      children,
      isExpanded: true,
    });

    const user = userEvent.setup();
    const disclosureInfo = await screen.findByText(children);
    const disclosureButton = screen.getByRole('button', { name: headerText });

    await user.click(disclosureButton);
    expect(onExpansionToggle).toHaveBeenCalled();

    rerender(
      <Disclosure
        headerText={headerText}
        onExpansionToggle={onExpansionToggle}
        isExpanded={false}
      >
        {children}
      </Disclosure>,
    );

    expect(disclosureInfo).not.toBeInTheDocument();
  });
});
