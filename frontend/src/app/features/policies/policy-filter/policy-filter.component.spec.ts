import { fireEvent, render, screen, waitFor } from '@testing-library/angular';
import { PolicyCriteria } from '../policy-query-params';
import { PolicyFilterComponent } from './policy-filter.component';

const NO_CRITERIA: PolicyCriteria = {
  search: null,
  status: null,
  lineOfBusiness: null,
  region: null,
  effectiveDateFrom: null,
  effectiveDateTo: null,
};

async function setup(inputs: { criteria?: PolicyCriteria; disabled?: boolean } = {}) {
  const criteriaChange = vi.fn<(c: PolicyCriteria) => void>();
  const view = await render(PolicyFilterComponent, { inputs, on: { criteriaChange } });
  return { ...view, criteriaChange };
}

/** Opens a mat-select by its label and picks an option (options render in the overlay). */
async function choose(selectLabel: string, option: string) {
  fireEvent.click(screen.getByRole('combobox', { name: selectLabel }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

describe('PolicyFilterComponent', () => {
  it('emits the search text (debounced and trimmed)', async () => {
    const { criteriaChange } = await setup();
    const search = screen.getByRole('textbox', { name: 'Search' });

    fireEvent.input(search, { target: { value: 'Ch' } });
    fireEvent.input(search, { target: { value: '  Changi  ' } });

    await waitFor(() => expect(criteriaChange).toHaveBeenCalledTimes(1)); // one emission for the burst
    expect(criteriaChange).toHaveBeenLastCalledWith({ ...NO_CRITERIA, search: 'Changi' });
  });

  it('emits status, line of business and region selections', async () => {
    const { criteriaChange } = await setup();

    await choose('Status', 'Active');
    await waitFor(() => expect(criteriaChange).toHaveBeenLastCalledWith({ ...NO_CRITERIA, status: 'Active' }));

    await choose('Line of business', 'A&H');
    await waitFor(() =>
      expect(criteriaChange).toHaveBeenLastCalledWith({ ...NO_CRITERIA, status: 'Active', lineOfBusiness: 'A&H' }),
    );

    await choose('Region', 'Hong Kong');
    await waitFor(() =>
      expect(criteriaChange).toHaveBeenLastCalledWith({
        ...NO_CRITERIA,
        status: 'Active',
        lineOfBusiness: 'A&H',
        region: 'Hong Kong',
      }),
    );
  });

  it('emits effective dates as yyyy-MM-dd', async () => {
    const { criteriaChange } = await setup();

    // Native date adapter parses en-US M/D/YYYY.
    fireEvent.input(screen.getByRole('textbox', { name: 'Effective date from' }), { target: { value: '1/15/2026' } });
    fireEvent.input(screen.getByRole('textbox', { name: 'Effective date to' }), { target: { value: '6/30/2026' } });

    await waitFor(() =>
      expect(criteriaChange).toHaveBeenLastCalledWith({
        ...NO_CRITERIA,
        effectiveDateFrom: '2026-01-15',
        effectiveDateTo: '2026-06-30',
      }),
    );
  });

  it('reflects the criteria input without emitting it back', async () => {
    const { criteriaChange } = await setup({
      criteria: { ...NO_CRITERIA, search: 'Marine', status: 'Pending', effectiveDateFrom: '2026-03-01' },
    });

    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveProperty('value', 'Marine');
    expect(screen.getByRole('textbox', { name: 'Effective date from' })).toHaveProperty('value', '3/1/2026');
    // mat-select renders its trigger label once its options have initialised (one more CD pass).
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Status' }).textContent).toContain('Pending'));

    await new Promise((r) => setTimeout(r, 400)); // longer than the debounce
    expect(criteriaChange).not.toHaveBeenCalled();
  });

  it('"Clear filters" is disabled when nothing is filtered', async () => {
    await setup();
    expect(screen.getByRole('button', { name: /clear filters/i })).toHaveProperty('disabled', true);
  });

  it('"Clear filters" emits empty criteria', async () => {
    const { criteriaChange } = await setup({ criteria: { ...NO_CRITERIA, region: 'Japan', status: 'Active' } });
    const clear = screen.getByRole('button', { name: /clear filters/i });
    expect(clear).toHaveProperty('disabled', false);

    fireEvent.click(clear);
    await waitFor(() => expect(criteriaChange).toHaveBeenLastCalledWith(NO_CRITERIA));
    expect(criteriaChange).toHaveBeenCalledTimes(1);
  });

  it('disables the dropdowns while loading but keeps search editable', async () => {
    await setup({ disabled: true });

    expect(screen.getByRole('combobox', { name: 'Status' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('combobox', { name: 'Line of business' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('combobox', { name: 'Region' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveProperty('disabled', false);
  });
});
