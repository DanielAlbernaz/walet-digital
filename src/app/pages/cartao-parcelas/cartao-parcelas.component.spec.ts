import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CartaoParcelasComponent } from './cartao-parcelas.component';

describe('CartaoParcelasComponent', () => {
  let component: CartaoParcelasComponent;
  let fixture: ComponentFixture<CartaoParcelasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CartaoParcelasComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CartaoParcelasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
