import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AlertService } from '../services/alert.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let alerts: AlertService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    alerts = TestBed.inject(AlertService);
  });

  it('surfaces ProblemDetail title/detail and re-throws', () => {
    let errored = false;
    http.get('/x').subscribe({ error: () => (errored = true) });
    ctrl
      .expectOne('/x')
      .flush({ title: 'Resource Not Found', detail: 'Policy 1 not found', status: 404 }, { status: 404, statusText: 'Not Found' });

    expect(errored).toBe(true);
    expect(alerts.alerts()).toEqual([{ id: 1, title: 'Resource Not Found', message: 'Policy 1 not found' }]);
  });

  it('reports network failures', () => {
    http.get('/x').subscribe({ error: () => undefined });
    ctrl.expectOne('/x').error(new ProgressEvent('error'), { status: 0 });
    expect(alerts.alerts()[0].title).toBe('Cannot reach server');
  });
});
