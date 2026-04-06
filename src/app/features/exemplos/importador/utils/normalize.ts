/**
 * Normaliza uma string para comparação: remove acentos, caracteres especiais,
 * indicadores ordinais, espaços duplicados e converte para minúsculas.
 */
export function normalize(term: string): string {
  if (!term) return '';

  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')                            // Remove acentos
    .replace(/[ªº]/g, '')                                       // Remove indicadores ordinais
    .replace(/[°]/g, '')                                        // Remove símbolos de grau
    .replace(/[–—]/g, '-')                                      // Normaliza traços
    .replace(/['']/g, "'")                                      // Normaliza apóstrofos
    .replace(/[""]/g, '"')                                      // Normaliza aspas
    .replace(/[․]/g, '.')                                       // Normaliza pontos especiais
    .replace(/[،]/g, ',')                                       // Normaliza vírgulas especiais
    .replace(/[\u00A0\u2000-\u200B\u2028-\u2029\u3000]/g, ' ')  // Normaliza espaços especiais
    .replace(/[^\w\s\-\.]/g, '')                                // Remove caracteres especiais
    .replace(/\s+/g, ' ')                                       // Normaliza espaços múltiplos
    .trim();
}
