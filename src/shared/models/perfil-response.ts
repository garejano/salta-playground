export interface PerfilResponseData {
  data: PerfilResponse;
  message: string;

}

export interface PerfilResponse {
  possuiAcessoProfessor: boolean;
  possuiAcessoCoordenacao: boolean;
  possuiAcessoMonitor: boolean;

}
