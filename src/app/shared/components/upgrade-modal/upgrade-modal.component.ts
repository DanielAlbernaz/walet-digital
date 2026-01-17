import { Component, EventEmitter, Input, Output } from '@angular/core';
import { faTimes, faCrown } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-upgrade-modal',
  templateUrl: './upgrade-modal.component.html',
  styleUrls: ['./upgrade-modal.component.scss']
})
export class UpgradeModalComponent {
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();

  faTimes = faTimes;
  faCrown = faCrown;

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.onClose();
    }
  }
}
