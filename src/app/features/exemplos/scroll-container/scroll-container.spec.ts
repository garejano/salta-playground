import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScrollContainer } from './scroll-container';

describe('ScrollContainer', () => {
  let component: ScrollContainer;
  let fixture: ComponentFixture<ScrollContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ScrollContainer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScrollContainer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
