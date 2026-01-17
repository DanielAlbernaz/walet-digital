import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { PlanFeatures } from '../models/plan';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[appFeature]'
})
export class FeatureDirective implements OnInit, OnDestroy {
  @Input() appFeature: keyof PlanFeatures = 'installments';
  private featuresSubscription?: Subscription;
  private currentFeatures: PlanFeatures | null = null;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.featuresSubscription = this.authService.currentFeatures$.subscribe(features => {
      this.currentFeatures = features;
      this.updateView();
    });
  }

  ngOnDestroy(): void {
    if (this.featuresSubscription) {
      this.featuresSubscription.unsubscribe();
    }
  }

  private updateView(): void {
    const hasFeature = this.authService.hasFeature(this.appFeature);

    if (hasFeature) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
