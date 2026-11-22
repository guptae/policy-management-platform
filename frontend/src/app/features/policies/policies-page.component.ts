import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PolicyListComponent } from './policy-list/policy-list.component';
import { PolicySummaryComponent } from './policy-summary/policy-summary.component';
import { PolicyStore } from './policy.store';

/** Route container: provides the list store and lays out the summary tiles and the policy list. */
@Component({
  selector: 'app-policies-page',
  imports: [PolicyListComponent, PolicySummaryComponent],
  providers: [PolicyStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-policy-summary />
    <app-policy-list />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
  `,
})
export class PoliciesPageComponent {}
