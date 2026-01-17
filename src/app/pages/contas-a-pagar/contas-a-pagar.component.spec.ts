import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContasAPagarComponent } from './contas-a-pagar.component';

describe('ContasAPagarComponent', () => {
  let component: ContasAPagarComponent;
  let fixture: ComponentFixture<ContasAPagarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ContasAPagarComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContasAPagarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
