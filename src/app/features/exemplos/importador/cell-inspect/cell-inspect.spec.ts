import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CellInspect } from './cell-inspect';

describe('CellInspect', () => {
  let component: CellInspect;
  let fixture: ComponentFixture<CellInspect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CellInspect]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CellInspect);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
