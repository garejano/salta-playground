import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseResponse, CellCursor, CellData, CellError, ColunaImportacao, UpdateCell } from '../importador.models';
import { ScrollContainer } from '../../scroll-container/scroll-container';

@Component({
  selector: 'cell-inspect',
  templateUrl: './cell-inspect.html',
  styleUrl: './cell-inspect.scss',
  imports: [ScrollContainer, CommonModule]
})
export class CellInspect {
  // ============================================
  // INPUTS E OUTPUTS
  // ============================================

  @Input() cursor: CellCursor;
  @Input() etapa: ColunaImportacao;
  @Input() cell: CellData;

  @Output() update = new EventEmitter<UpdateCell>();
  @Output() selecionaErro = new EventEmitter<CellError | null>();
  @Output() validarEtapa = new EventEmitter<void>();

  // ============================================
  // ESTADO DO COMPONENTE
  // ============================================

  erroSelecionado: CellError | null = null;

  // ============================================
  // GETTERS
  // ============================================

  /**
   * Verifica se todos os erros foram resolvidos ou removidos
   */
  get todosErrosResolvidos(): boolean {
    if (!this.etapa?.errors) return true;
    const errors = Object.values(this.etapa.errors);
    if (errors.length === 0) return true;
    return errors.every(e => e.resolved || e.remove);
  }

  /**
   * Retorna a contagem de erros pendentes
   */
  get errosPendentes(): number {
    if (!this.etapa?.errors) return 0;
    return Object.values(this.etapa.errors).filter(e => !e.resolved && !e.remove).length;
  }

  /**
   * Retorna a contagem total de erros
   */
  get totalErros(): number {
    if (!this.etapa?.errors) return 0;
    return Object.values(this.etapa.errors).length;
  }

  get options(): BaseResponse[] {
    const set_prox = new Set(this.erroSelecionado?.proximidade.map(x => { return x.hash }))
    const options = this.etapa.options.filter((t) => {
      return !set_prox.has(t.hash)
    })

    return options;
  }

  toggleErro(error: CellError) {
    if (this.erroSelecionado === error) {
      this.erroSelecionado = null;
    } else {
      this.erroSelecionado = error;
    }
    this.selecionaErro.emit(this.erroSelecionado);
  }

  selectOption(option: BaseResponse, error: CellError) {
    error.resolved_value = option.descricao;
    error.resolved = true;
    error.changed = true;
    this.update.emit({
      original_normalized: error.original.normalized,
      option,
      linhas: error.linhas,
      restore: false,
    });
    this.erroSelecionado = null;
  }

  restore(error: CellError) {
    error.changed = false;
    error.resolved = false;
    this.update.emit({
      original_normalized: error.original.normalized,
      option: { descricao: error.original.value },
      linhas: error.linhas,
      restore: true,
    });
  }

  autoCorrect() {
    Object.values(this.etapa.errors).forEach((error: CellError) => {
      if (!error.resolved && !error.remove && error.proximidade.length > 0) {
        this.selectOption(error.proximidade[0], error);
      }
    });
  }

  remove(error: CellError) {
    error.remove = true;
    //TODO: Validar qual linha sera atualizar
    // atualiza linhas via EventEmitter -> ImportadorComponent
    this.erroSelecionado = null;
    this.selecionaErro.emit(this.erroSelecionado);
  }

  undoRemove(error: CellError): void {
    error.remove = false;
    this.erroSelecionado = null;
    this.selecionaErro.emit(this.erroSelecionado);
  }

  executeAction(error: CellError) {
    if (error.remove) {
      this.undoRemove(error)
      return;
    }

    if (error.changed) {
      this.restore(error)
      return;
    }

    this.remove(error);

  }

  getActionIcon(error: CellError): string {
    if (error.remove) return 'restore_from_trash';
    if (error.changed) return 'settings_backup_restore';
    return 'delete';
  }

  getActionTitle(error: CellError): string {
    if (error.remove) return 'Desfazer remoção';
    if (error.changed) return 'Restaurar valor original';
    return 'Marcar linha para remoção';
  }

  // ============================================
  // VALIDAÇÃO DA ETAPA
  // ============================================

  /**
   * Emite evento para validar a etapa atual e avançar.
   * Só é possível validar quando todos os erros estão resolvidos.
   */
  onValidarEtapa(): void {
    if (!this.todosErrosResolvidos) {
      console.warn('Ainda existem erros pendentes');
      return;
    }
    this.validarEtapa.emit();
  }
}
