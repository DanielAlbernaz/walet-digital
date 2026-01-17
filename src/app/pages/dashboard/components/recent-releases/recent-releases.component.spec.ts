import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentReleasesComponent } from './recent-releases.component';

describe('RecentReleasesComponent', () => {
  let component: RecentReleasesComponent;
  let fixture: ComponentFixture<RecentReleasesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RecentReleasesComponent]
    });
    fixture = TestBed.createComponent(RecentReleasesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
