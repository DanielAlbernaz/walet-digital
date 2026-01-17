import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { faTimes, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { InviteService } from '../../../services/invite/invite.service';
import { UserRole } from '../../../models/finance-account';

@Component({
  selector: 'app-invite-modal',
  templateUrl: './invite-modal.component.html',
  styleUrls: ['./invite-modal.component.scss']
})
export class InviteModalComponent {
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() inviteCreated = new EventEmitter<void>();

  inviteForm: FormGroup;
  isLoading: boolean = false;
  errorMessage: string = '';

  faTimes = faTimes;
  faEnvelope = faEnvelope;

  roleOptions: { value: UserRole; label: string }[] = [
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Viewer' }
  ];

  constructor(
    private fb: FormBuilder,
    private inviteService: InviteService
  ) {
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      role: ['editor', Validators.required]
    });
  }

  onClose(): void {
    this.close.emit();
    this.inviteForm.reset({ role: 'editor' });
    this.errorMessage = '';
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.onClose();
    }
  }

  onSubmit(): void {
    if (this.inviteForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      const { email, role } = this.inviteForm.value;

      this.inviteService.createInvite({ email, role }).subscribe({
        next: () => {
          this.isLoading = false;
          this.inviteCreated.emit();
          this.onClose();
        },
        error: (error) => {
          this.isLoading = false;
          if (error.error && typeof error.error === 'string') {
            this.errorMessage = error.error;
          } else if (error.error?.message) {
            this.errorMessage = error.error.message;
          } else {
            this.errorMessage = 'Erro ao criar convite. Tente novamente.';
          }
        }
      });
    } else {
      this.markFormGroupTouched(this.inviteForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}
