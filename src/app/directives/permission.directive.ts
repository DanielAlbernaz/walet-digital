import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { Subscription } from 'rxjs';

type PermissionType = 'create' | 'edit' | 'delete' | 'invite';

@Directive({
  selector: '[appPermission]'
})
export class PermissionDirective implements OnInit, OnDestroy {
  @Input() appPermission: PermissionType = 'create';
  private roleSubscription?: Subscription;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Escutar mudanças no role
    this.roleSubscription = this.authService.currentRole$.subscribe((role) => {
      this.updateView();
    });
    
    // Verificar permissão imediatamente
    this.updateView();
  }

  ngOnDestroy(): void {
    if (this.roleSubscription) {
      this.roleSubscription.unsubscribe();
    }
  }

  private updateView(): void {
    let hasPermission = false;

    switch (this.appPermission) {
      case 'create':
        hasPermission = this.authService.canCreate();
        break;
      case 'edit':
        hasPermission = this.authService.canEdit();
        break;
      case 'delete':
        hasPermission = this.authService.canDelete();
        break;
      case 'invite':
        hasPermission = this.authService.canInvite();
        break;
    }


    if (hasPermission) {
      if (!this.viewContainer.length) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    } else {
      this.viewContainer.clear();
    }
  }
}
