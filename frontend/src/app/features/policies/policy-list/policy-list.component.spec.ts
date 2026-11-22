import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Params, Router, RouterOutlet } from '@angular/router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/angular';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { PagedResponse, Policy } from '../../../core/models/policy.models';
import { AlertService } from '../../../core/services/alert.service';
import { PolicyStore } from '../policy.store';
import { PolicyListComponent } from './policy-list.component';

const BASE = 'http://localhost:8080/api/v1/policies';

function policy(id: string, overrides: Partial<Policy> = {}): Policy {
  return {
    id,
    policyNumber: `POL-00000${id}`,
    policyholderName: `Holder ${id}`,
    status: 'Active',
    lineOfBusiness: 'A&H',
    premiumAmount: 1000,
    currency: 'SGD',
    effectiveDate: '2026-01-01',
    expiryDate: '2027-03-15',
    region: 'Singapore',
    underwriter: 'U',
    flaggedForReview: false,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function page(content: Policy[], totalElements = content.length, pageIndex = 0): PagedResponse<Policy> {
  return { content, page: pageIndex, size: 20, totalElements, totalPages: Math.ceil(totalElements / 20) };
}

describe('PolicyListComponent', () => {
  let http: HttpTestingController;

  /**
   * Renders the list inside a real <router-outlet> (as in the app) so its ActivatedRoute is the
   * `policies` route and query-param syncing behaves exactly as in production.
   */
  async function setup(queryParams: Params = {}) {
    const view = await render('<router-outlet />', {
      imports: [RouterOutlet],
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
      routes: [{ path: 'policies', component: PolicyListComponent, providers: [PolicyStore] }],
      initialRoute: (router) => router.createUrlTree(['policies'], { queryParams }),
    });
    http = TestBed.inject(HttpTestingController);
    return { ...view, router: TestBed.inject(Router) };
  }

  const isList = (r: { url: string; method: string }) => r.url === BASE && r.method === 'GET';
  /** Waits for exactly one list request (the component fetches asynchronously after render). */
  const nextListRequest = () => waitFor(() => http.expectOne(isList));
  const dataRows = () => screen.getAllByRole('row').filter((r) => within(r).queryAllByRole('cell').length > 1);
  const checkbox = (policyNumber: string) => screen.getByRole('checkbox', { name: `Select ${policyNumber}` });
  const flagSelectedButton = () => screen.getByRole('button', { name: /flag selected/i });

  afterEach(() => http.verify());

  describe('rendering rows', () => {
    it('renders one row per policy with formatted cells', async () => {
      await setup();
      (await nextListRequest()).flush(
        page([
          policy('1', { policyholderName: 'Changi Logistics Pte Ltd', premiumAmount: 10300, currency: 'SGD' }),
          policy('2', { lineOfBusiness: 'Marine', status: 'Pending', premiumAmount: 125000, currency: 'JPY' }),
          policy('3', { flaggedForReview: true }),
        ]),
      );

      await waitFor(() => expect(dataRows()).toHaveLength(3));
      const [first, second, third] = dataRows();

      expect(within(first).getByText('POL-000001')).toBeTruthy();
      expect(within(first).getByText('Changi Logistics Pte Ltd')).toBeTruthy();
      expect(within(first).getByText('SGD 10,300.00')).toBeTruthy();
      expect(within(first).getByText('Mar 15, 2027')).toBeTruthy();

      expect(within(second).getByText('Marine')).toBeTruthy();
      expect(within(second).getByText('Pending')).toBeTruthy();
      expect(within(second).getByText('JPY 125,000')).toBeTruthy();

      expect(within(third).getByText('Flagged for review')).toBeTruthy();
      expect(screen.getByText('3 policies')).toBeTruthy();
    });

    it('renders the column headers in order', async () => {
      await setup();
      (await nextListRequest()).flush(page([policy('1')]));

      const headers = (await screen.findAllByRole('columnheader')).map((h) => h.textContent?.trim());
      expect(headers).toEqual([
        '', // select-all checkbox
        'Policy #',
        'Policyholder',
        'Line',
        'Status',
        'Premium',
        'Region',
        'Expiry',
        'Flagged',
        'Actions',
      ]);
    });

    it('shows the empty state when nothing matches, with a way to clear filters', async () => {
      const { router } = await setup({ status: 'Expired' });
      (await nextListRequest()).flush(page([]));

      const message = await screen.findByText('No policies match these filters.');
      const emptyState = message.closest('.empty') as HTMLElement;
      fireEvent.click(within(emptyState).getByRole('button', { name: 'Clear filters' }));

      const req = await nextListRequest();
      expect(req.request.params.has('status')).toBe(false);
      expect(router.url).toBe('/policies');
      req.flush(page([policy('1')]));
    });

    it('shows a different message when there are no policies at all', async () => {
      await setup();
      (await nextListRequest()).flush(page([]));
      expect(await screen.findByText('No policies yet.')).toBeTruthy();
    });

    it('shows an inline error with retry (and no duplicate global alert)', async () => {
      await setup();
      (await nextListRequest()).flush({ title: 'Internal Server Error', detail: 'Boom' }, { status: 500, statusText: 'x' });

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toContain('Boom');
      expect(TestBed.inject(AlertService).alerts()).toEqual([]);

      fireEvent.click(within(alert).getByRole('button', { name: /retry/i }));
      (await nextListRequest()).flush(page([policy('1')]));
      await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
      expect(dataRows()).toHaveLength(1);
    });
  });

  describe('query params', () => {
    it('sends URL query params to the API, with A&H encoded', async () => {
      await setup({ lineOfBusiness: 'A&H', region: 'Hong Kong', page: 1, sort: 'premiumAmount,desc' });

      const req = await nextListRequest();
      expect(req.request.urlWithParams).toBe(
        `${BASE}?lineOfBusiness=A%26H&region=Hong%20Kong&page=1&size=20&sort=premiumAmount,desc`,
      );
      req.flush(page([]));
    });

    it('sorting a column updates the URL and the API sort param', async () => {
      const { router } = await setup();
      (await nextListRequest()).flush(page([policy('1')]));

      // The sort header is a role=button named by its text; sortActionDescription is its description.
      fireEvent.click(await screen.findByRole('button', { name: 'Premium' }));
      const req = await nextListRequest();
      expect(req.request.params.get('sort')).toBe('premiumAmount,asc');
      expect(router.url).toBe('/policies?sort=premiumAmount,asc');
      req.flush(page([policy('1')]));
    });

    it('drops invalid params and rewrites the URL', async () => {
      const { router } = await setup({ status: 'Nope', size: 7 });
      (await nextListRequest()).flush(page([]));
      await waitFor(() => expect(router.url).toBe('/policies'));
    });
  });

  describe('filter form', () => {
    it('typing a search updates the URL and re-queries the API', async () => {
      const { router } = await setup();
      (await nextListRequest()).flush(page([policy('1'), policy('2')]));

      fireEvent.input(await screen.findByRole('textbox', { name: 'Search' }), { target: { value: 'Changi' } });

      const req = await nextListRequest();
      expect(req.request.params.get('search')).toBe('Changi');
      expect(router.url).toBe('/policies?search=Changi');
      req.flush(page([policy('1')]));
      await waitFor(() => expect(dataRows()).toHaveLength(1));
    });

    it('selecting a line of business sends A&H and resets to page 0', async () => {
      const { router } = await setup({ page: 3 });
      (await nextListRequest()).flush(page([policy('1')], 100, 3));

      fireEvent.click(await screen.findByRole('combobox', { name: 'Line of business' }));
      fireEvent.click(await screen.findByRole('option', { name: 'A&H' }));

      const req = await nextListRequest();
      expect(req.request.params.get('lineOfBusiness')).toBe('A&H');
      expect(req.request.params.get('page')).toBe('0');
      expect(router.url).toBe('/policies?lineOfBusiness=A%26H');
      req.flush(page([]));
    });

    it('populates the form from a bookmarked URL', async () => {
      await setup({ search: 'Marine', region: 'Japan' });
      (await nextListRequest()).flush(page([]));

      expect(await screen.findByRole('textbox', { name: 'Search' })).toHaveProperty('value', 'Marine');
      await waitFor(() => expect(screen.getByRole('combobox', { name: 'Region' }).textContent).toContain('Japan'));
    });
  });

  describe('bulk select', () => {
    async function setupWithRows() {
      const view = await setup();
      (await nextListRequest()).flush(
        page([policy('1'), policy('2'), policy('3'), policy('4', { flaggedForReview: true })], 40),
      );
      await waitFor(() => expect(dataRows()).toHaveLength(4));
      return view;
    }

    /** Clicks "Flag selected" and returns the ids sent in the PATCH body (then answers it). */
    async function flagAndCaptureIds(): Promise<string[]> {
      fireEvent.click(flagSelectedButton());
      const req: TestRequest = await waitFor(() => http.expectOne(`${BASE}/flag`));
      expect(req.request.method).toBe('PATCH');
      const ids = req.request.body.policyIds as string[];
      req.flush({ results: Object.fromEntries(ids.map((id) => [id, 'updated'])) });
      return ids;
    }

    it('tracks checked IDs and sends them to PATCH /flag', async () => {
      await setupWithRows();
      expect(flagSelectedButton()).toHaveProperty('disabled', true);

      fireEvent.click(checkbox('POL-000001'));
      fireEvent.click(checkbox('POL-000003'));

      expect(await screen.findByText('2 selected')).toBeTruthy();
      expect(flagSelectedButton()).toHaveProperty('disabled', false);
      expect(await flagAndCaptureIds()).toEqual(['1', '3']);
    });

    it('unchecking removes the ID', async () => {
      await setupWithRows();

      fireEvent.click(checkbox('POL-000001'));
      fireEvent.click(checkbox('POL-000002'));
      fireEvent.click(checkbox('POL-000001'));

      expect(await screen.findByText('1 selected')).toBeTruthy();
      expect(await flagAndCaptureIds()).toEqual(['2']);
    });

    it('select-all picks only unflagged rows on the page, and toggles off', async () => {
      await setupWithRows();
      const selectAll = screen.getByRole('checkbox', { name: 'Select all policies on this page' });

      expect(checkbox('POL-000004')).toHaveProperty('disabled', true); // already flagged

      fireEvent.click(selectAll);
      expect(await screen.findByText('3 selected')).toBeTruthy();
      expect(selectAll).toHaveProperty('checked', true);

      fireEvent.click(selectAll);
      expect(await screen.findByText('40 policies')).toBeTruthy();
      expect(flagSelectedButton()).toHaveProperty('disabled', true);
    });

    it('select-all shows indeterminate when some rows are checked', async () => {
      await setupWithRows();
      fireEvent.click(checkbox('POL-000002'));

      const selectAll = screen.getByRole('checkbox', { name: 'Select all policies on this page' });
      await waitFor(() => expect(selectAll).toHaveProperty('indeterminate', true));
    });

    it('flagged rows become flagged and leave the selection', async () => {
      await setupWithRows();
      fireEvent.click(checkbox('POL-000001'));
      await flagAndCaptureIds();

      await waitFor(() => expect(checkbox('POL-000001')).toHaveProperty('disabled', true));
      expect(within(dataRows()[0]).getByText('Flagged for review')).toBeTruthy();
      expect(await screen.findByText('40 policies')).toBeTruthy();
    });

    it('per-row action flags just that policy', async () => {
      await setupWithRows();
      fireEvent.click(checkbox('POL-000003')); // selection should be ignored by the row action

      fireEvent.click(screen.getByRole('button', { name: 'Flag POL-000002 for review' }));
      const req = await waitFor(() => http.expectOne(`${BASE}/flag`));
      expect(req.request.body).toEqual({ policyIds: ['2'] });
      req.flush({ results: { '2': 'updated' } });
    });

    it('changing page clears the selection', async () => {
      await setupWithRows();
      fireEvent.click(checkbox('POL-000001'));
      expect(await screen.findByText('1 selected')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      const req = await nextListRequest();
      expect(req.request.params.get('page')).toBe('1');
      req.flush(page([policy('21')], 40, 1));

      expect(await screen.findByText('40 policies')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('sortable headers expose aria-sort; icon buttons and inputs are labelled', async () => {
      await setup({ sort: 'premiumAmount,desc' });
      (await nextListRequest()).flush(page([policy('1')]));
      await waitFor(() => expect(dataRows()).toHaveLength(1));

      const sortable = screen.getAllByRole('columnheader').filter((th) => th.hasAttribute('aria-sort'));
      expect(sortable).toHaveLength(8);
      expect(sortable.find((th) => th.textContent?.includes('Premium'))!.getAttribute('aria-sort')).toBe('descending');
      expect(sortable.filter((th) => th.getAttribute('aria-sort') === 'none')).toHaveLength(7);

      // Accessible-name queries fail if a control is unlabelled.
      expect(screen.getByRole('button', { name: 'Flag POL-000001 for review' })).toBeTruthy();
      expect(screen.getByRole('checkbox', { name: 'Select POL-000001' })).toBeTruthy();
      for (const name of ['Search', 'Effective date from', 'Effective date to']) {
        expect(screen.getByRole('textbox', { name })).toBeTruthy();
      }
      for (const name of ['Status', 'Line of business', 'Region']) {
        expect(screen.getByRole('combobox', { name })).toBeTruthy();
      }
    });
  });
});
