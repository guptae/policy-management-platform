import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from '../interceptors/error.interceptor';
import { AlertService } from './alert.service';
import { ApiService } from './api.service';

const BASE = 'http://localhost:8080/api/v1/policies';
const EMPTY_PAGE = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
const NOT_FOUND = {
  type: 'about:blank',
  title: 'Resource Not Found',
  status: 404,
  detail: 'Policy not found: 00000000-0000-0000-0000-000000000000',
};

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;
  let alerts: AlertService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // The real interceptor is included so error handling is tested as the app wires it.
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    alerts = TestBed.inject(AlertService);
  });

  afterEach(() => http.verify());

  describe('getPolicies query params', () => {
    it('sends every filter, paging and sort param', () => {
      api
        .getPolicies({
          status: 'Active',
          lineOfBusiness: 'Marine',
          region: 'Hong Kong',
          effectiveDateFrom: '2026-01-01',
          effectiveDateTo: '2026-06-30',
          search: 'Changi',
          page: 2,
          size: 50,
          sort: 'premiumAmount,desc',
        })
        .subscribe();

      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.method).toBe('GET');
      const p = req.request.params;
      expect(p.get('status')).toBe('Active');
      expect(p.get('lineOfBusiness')).toBe('Marine');
      expect(p.get('region')).toBe('Hong Kong');
      expect(p.get('effectiveDateFrom')).toBe('2026-01-01');
      expect(p.get('effectiveDateTo')).toBe('2026-06-30');
      expect(p.get('search')).toBe('Changi');
      expect(p.get('page')).toBe('2');
      expect(p.get('size')).toBe('50');
      expect(p.get('sort')).toBe('premiumAmount,desc');
      req.flush(EMPTY_PAGE);
    });

    it('URL-encodes A&H so it does not split the query string', () => {
      api.getPolicies({ lineOfBusiness: 'A&H' }).subscribe();

      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.urlWithParams).toBe(`${BASE}?lineOfBusiness=A%26H`);
      expect(req.request.params.get('lineOfBusiness')).toBe('A&H');
      req.flush(EMPTY_PAGE);
    });

    it('encodes characters that would otherwise corrupt the query string (& # % +)', () => {
      api.getPolicies({ search: 'A&B #1 100% C+D' }).subscribe();

      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('search')).toBe('A&B #1 100% C+D');
      // '+' must be %2B: a raw '+' is decoded as a space by Spring.
      expect(req.request.urlWithParams).toBe(`${BASE}?search=A%26B%20%231%20100%25%20C%2BD`);
      req.flush(EMPTY_PAGE);
    });

    it('omits null, undefined and blank values but keeps page=0', () => {
      api
        .getPolicies({ status: null, lineOfBusiness: undefined, region: '', search: '   ', sort: null, page: 0, size: 20 })
        .subscribe();

      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.keys()).toEqual(['page', 'size']);
      expect(req.request.urlWithParams).toBe(`${BASE}?page=0&size=20`);
      req.flush(EMPTY_PAGE);
    });

    it('trims surrounding whitespace from values', () => {
      api.getPolicies({ search: '  POL-000001  ' }).subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('search')).toBe('POL-000001');
      req.flush(EMPTY_PAGE);
    });

    it('sends no params for an empty filter', () => {
      api.getPolicies({}).subscribe();
      const req = http.expectOne(BASE);
      expect(req.request.params.keys()).toEqual([]);
      req.flush(EMPTY_PAGE);
    });
  });

  describe('404 handling', () => {
    it('getPolicyById: surfaces the ProblemDetail to the caller without throwing synchronously', () => {
      const next = vi.fn();
      let error: HttpErrorResponse | undefined;

      expect(() =>
        api.getPolicyById('00000000-0000-0000-0000-000000000000').subscribe({ next, error: (e) => (error = e) }),
      ).not.toThrow();
      http
        .expectOne(`${BASE}/00000000-0000-0000-0000-000000000000`)
        .flush(NOT_FOUND, { status: 404, statusText: 'Not Found' });

      expect(next).not.toHaveBeenCalled();
      expect(error).toBeInstanceOf(HttpErrorResponse);
      expect(error!.status).toBe(404);
      expect(error!.error).toEqual(NOT_FOUND);
    });

    it('getPolicyById: raises a single user-facing alert from the ProblemDetail', () => {
      api.getPolicyById('missing').subscribe({ error: () => undefined });
      http.expectOne(`${BASE}/missing`).flush(NOT_FOUND, { status: 404, statusText: 'Not Found' });

      expect(alerts.alerts()).toEqual([{ id: 1, title: 'Resource Not Found', message: NOT_FOUND.detail }]);
    });

    it('getPolicyById: encodes the id in the path', () => {
      api.getPolicyById('a/b?c').subscribe({ error: () => undefined });
      http.expectOne(`${BASE}/a%2Fb%3Fc`).flush(NOT_FOUND, { status: 404, statusText: 'Not Found' });
    });

    it('getPolicyById: falls back to a generic message when the 404 has no ProblemDetail body', () => {
      api.getPolicyById('x').subscribe({ error: () => undefined });
      http.expectOne(`${BASE}/x`).flush(null, { status: 404, statusText: 'Not Found' });

      expect(alerts.alerts()[0]).toMatchObject({ title: 'Request failed (404)', message: 'Not Found' });
    });

    it('getPolicies with handleErrorsLocally: errors reach the caller but no global alert is raised', () => {
      let status: number | undefined;
      api.getPolicies({}, { handleErrorsLocally: true }).subscribe({ error: (e: HttpErrorResponse) => (status = e.status) });
      http.expectOne(BASE).flush(NOT_FOUND, { status: 404, statusText: 'Not Found' });

      expect(status).toBe(404);
      expect(alerts.alerts()).toEqual([]);
    });
  });

  describe('other endpoints', () => {
    it('flagPolicies PATCHes the ids to /flag', () => {
      let result: unknown;
      api.flagPolicies(['a', 'b']).subscribe((r) => (result = r));

      const req = http.expectOne(`${BASE}/flag`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ policyIds: ['a', 'b'] });
      req.flush({ results: { a: 'updated', b: 'not_found' } });
      expect(result).toEqual({ results: { a: 'updated', b: 'not_found' } });
    });

    it('getSummary GETs /summary', () => {
      api.getSummary().subscribe();
      const req = http.expectOne(`${BASE}/summary`);
      expect(req.request.method).toBe('GET');
      req.flush({});
    });
  });
});
