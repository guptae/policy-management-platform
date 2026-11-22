import { Component } from '@angular/core';
import { ShellComponent } from './features/shell/shell.component';

@Component({
  selector: 'app-root',
  imports: [ShellComponent],
  template: '<app-shell />',
})
export class App {}
