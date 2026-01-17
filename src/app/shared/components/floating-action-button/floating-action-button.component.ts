import { Component, EventEmitter, Output } from '@angular/core';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-floating-action-button',
  templateUrl: './floating-action-button.component.html',
  styleUrls: ['./floating-action-button.component.scss']
})
export class FloatingActionButtonComponent {
  @Output() clicked = new EventEmitter<void>();

  faPlus = faPlus;

  onClick(): void {
    this.clicked.emit();
  }
}
