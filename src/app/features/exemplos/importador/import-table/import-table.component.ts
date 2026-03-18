import { Component, HostListener, Input, OnInit, QueryList, ViewChildren, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClickOutsideDirective } from '../click-outside.directive';
import { CellCursor, TableData } from '../importador.models';

@Component({
  selector: 'app-import-table',
  templateUrl: './import-table.component.html',
  styleUrls: ['./import-table.component.scss'],
  imports: [CommonModule, ClickOutsideDirective]
})
export class ImportTableComponent implements OnInit, AfterViewChecked {
  @Input() etapaCounter: number = 0;
  @Input() data: TableData;
  @Input() cellCursor: CellCursor;

  @ViewChildren('cell') cellElements: QueryList<ElementRef>;
  @ViewChild('tableContainer') tableContainer: ElementRef<HTMLDivElement>;

  focused: boolean = false;

  constructor() { }

  ngOnInit(): void { }

  ngAfterViewChecked(): void {
    this.scrollToSelectedCell();
  }

  private scrollToSelectedCell() {
    if (!this.focused) return;
    if (!this.cellElements) return;
    const cellElementsArray = this.cellElements.toArray();
    const targetIndex = this.getSelectedCellIndex();
    const selectedEl = cellElementsArray[targetIndex];
    if (selectedEl) {
      selectedEl.nativeElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      // Ajuste manual para sticky header
      const container = this.tableContainer?.nativeElement;
      if (!container) return;
      const thead = container.querySelector('thead');
      if (thead) {
        const cellRect = selectedEl.nativeElement.getBoundingClientRect();
        const theadRect = thead.getBoundingClientRect();
        // Se célula ficou atrás do header, corrige scroll
        if (cellRect.top < theadRect.bottom) {
          container.scrollTop -= thead.offsetHeight;
        }
      }
    }
  }

  private getSelectedCellIndex(): number {
    const rowLen = this.data?.rows?.length || 0;
    const colLen = this.data?.headers?.length || 0;
    if (rowLen === 0 || colLen === 0) return -1;
    return this.cellCursor.row * colLen + this.cellCursor.col;
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.focused) return;
    event.preventDefault();

    switch (event.key) {
      case 'ArrowUp':

        if (this.cellCursor.row == 0) return;
        this.cellCursor.row -= 1;
        break;

      case 'ArrowDown':
        if (this.cellCursor.row == this.data.rows.length - 1) return;
        this.cellCursor.row += 1;
        break;

      case 'ArrowLeft':

        if (this.cellCursor.col == 0) return;
        this.cellCursor.col -= 1;
        break;

      case 'ArrowRight':
        if (this.cellCursor.col == this.data.headers.length - 1) return;
        this.cellCursor.col += 1;
        break;
    }
  }

  focusOut() {
    this.focused = false;
  }

  cellSelected(row: number, col: number): boolean {
    return this.cellCursor.col == col && this.cellCursor.row == row;
  }

  selectCell(row: number, col: number): void {
    // if (col != this.etapaCounter) return
    this.cellCursor.col = col;
    this.cellCursor.row = row;
  }

}
