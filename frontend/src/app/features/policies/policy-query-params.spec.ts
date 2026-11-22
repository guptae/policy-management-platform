import { convertToParamMap } from '@angular/router';
import { paramsFromQuery, queryFromParams, sameQuery } from './policy-query-params';

describe('policy query params', () => {
  it('round-trips a full query', () => {
    const params = {
      search: 'marine',
      status: 'Active',
      lineOfBusiness: 'A&H',
      region: 'Hong Kong',
      effectiveDateFrom: '2026-01-01',
      effectiveDateTo: '2026-06-30',
      page: '2',
      size: '50',
      sort: 'premiumAmount,desc',
    };
    const query = queryFromParams(convertToParamMap(params));
    expect(query).toEqual({ ...params, page: 2, size: 50 });
    expect(paramsFromQuery(query)).toEqual({ ...params, page: 2, size: 50 });
  });

  it('drops invalid values and defaults', () => {
    const query = queryFromParams(
      convertToParamMap({
        status: 'Bogus',
        lineOfBusiness: 'AH',
        region: 'Narnia',
        effectiveDateFrom: '01/02/2026',
        page: '-1',
        size: '7',
        sort: 'underwriter;drop table,desc',
      }),
    );
    expect(query).toEqual({
      search: null,
      status: null,
      lineOfBusiness: null,
      region: null,
      effectiveDateFrom: null,
      effectiveDateTo: null,
      page: 0,
      size: 20,
      sort: null,
    });
    expect(paramsFromQuery(query)).toEqual({});
  });

  it('treats blank and missing values as equal', () => {
    expect(sameQuery({ search: '  ', status: null }, {})).toBe(true);
    expect(sameQuery({ page: 1 }, {})).toBe(false);
  });
});
