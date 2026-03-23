import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeletorImportacoes } from './seletor-importacoes';

describe('SeletorImportacoes', () => {
  let component: SeletorImportacoes;
  let fixture: ComponentFixture<SeletorImportacoes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SeletorImportacoes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeletorImportacoes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
