import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { PolicySummary } from '../../../core/models/policy.models';
import { AlertService } from '../../../core/services/alert.service';
import { PolicySummaryComponent } from './policy-summary.component';

const URL = 'http://localhost:8080/api/v1/policies/summary';

const SUMMARY: PolicySummary = {
  totalPolicies: 210,
  countByStatus: { Active: 120, Expired: 40, Pending: 30, Cancelled: 20 },
  totalPremiumByLineOfBusiness: {
    Marine: { USD: 5000 },
    'A&H': { JPY: 125000, SGD: 1234.5 },
  },
  expiringSoonCount: 7,
};

describe('PolicySummaryComponent', () => {
  let fixture: ComponentFixture<PolicySummaryComponent>;
  let http: HttpTestingController;
  const el = (): HTMLElement => fixture.nativeElement;
  const text = (sel: string) => [...el().querySelectorAll(sel)].map((n) => n.textContent?.trim());

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PolicySummaryComponent);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('shows a skeleton, then four tiles and the premium table', async () => {
    expect(el().querySelectorAll('.skeleton-tile').length).toBe(4);

    http.expectOne(URL).flush(SUMMARY);
    await fixture.whenStable();

    expect(el().querySelector('.skeleton-tile')).toBeNull();
    expect(text('.tile-label')).toEqual(['Active policies', 'Expired policies', 'Pending policies', 'Expiring soon']);
    expect(text('.tile-value')).toEqual(['120', '40', '30', '7']);

    // Columns: currencies alphabetical. Rows: canonical LOB order (A&H before Marine).
    expect(text('thead th')).toEqual(['Line of business', 'JPY', 'SGD', 'USD']);
    expect(text('tbody th')).toEqual(['A&H', 'Marine']);
    // Missing currency: visual dash (aria-hidden) plus "None" for screen readers.
    expect(text('tbody tr:first-child td')).toEqual(['125,000', '1,234.50', '—None']);
  });

  it('refresh button re-fetches', async () => {
    http.expectOne(URL).flush(SUMMARY);
    await fixture.whenStable();

    el().querySelector<HTMLButtonElement>('button.refresh')!.click();
    http.expectOne(URL).flush({ ...SUMMARY, expiringSoonCount: 9 });
    await fixture.whenStable();
    expect(text('.tile-value')[3]).toBe('9');
  });

  it('shows an inline error with retry and no global alert', async () => {
    http.expectOne(URL).flush({ title: 'Internal Server Error', detail: 'Boom' }, { status: 500, statusText: 'x' });
    await fixture.whenStable();

    expect(el().querySelector('app-error-alert')?.textContent).toContain('Boom');
    expect(TestBed.inject(AlertService).alerts()).toEqual([]);

    const retry = [...el().querySelectorAll('app-error-alert button')].find((b) => b.textContent?.includes('Retry'));
    (retry as HTMLButtonElement).click();
    http.expectOne(URL).flush(SUMMARY);
    await fixture.whenStable();
    expect(el().querySelector('app-error-alert')).toBeNull();
    expect(el().querySelectorAll('.tile').length).toBe(4);
  });
});
