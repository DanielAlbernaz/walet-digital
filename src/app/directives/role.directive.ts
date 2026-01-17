import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { UserRole } from '../models/finance-account';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[appRole]'
})
export class RoleDirective implements OnInit, OnDestroy {
  @Input() appRole: UserRole | UserRole[] = [];
  private roleSubscription?: Subscription;
  private currentRole: UserRole | null = null;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.roleSubscription = this.authService.currentRole$.subscribe(role => {
      this.currentRole = role;
      this.updateView();
    });
  }

  ngOnDestroy(): void {
    if (this.roleSubscription) {
      this.roleSubscription.unsubscribe();
    }
  }

  private updateView(): void {
    const allowedRoles = Array.isArray(this.appRole) ? this.appRole : [this.appRole];
    const hasPermission = this.currentRole && allowedRoles.includes(this.currentRole);

    if (hasPermission) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
