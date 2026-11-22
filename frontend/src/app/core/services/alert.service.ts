import { Injectable, signal } from '@angular/core';

export interface Alert {
  id: number;
  title: string;
  message: string;
}

/** Holds the error alerts currently shown in the shell. Fed by the error interceptor. */
@Injectable({ providedIn: 'root' })
export class AlertService {
  private nextId = 1;
  private readonly _alerts = signal<Alert[]>([]);
  readonly alerts = this._alerts.asReadonly();

  error(title: string, message: string): void {
    // Avoid stacking identical banners (e.g. several parallel calls failing with the same cause).
    if (this._alerts().some((a) => a.title === title && a.message === message)) return;
    this._alerts.update((list) => [...list, { id: this.nextId++, title, message }]);
  }

  dismiss(id: number): void {
    this._alerts.update((list) => list.filter((a) => a.id !== id));
  }

  clear(): void {
    this._alerts.set([]);
  }
}
