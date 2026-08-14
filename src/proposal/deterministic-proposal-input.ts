/**
 * Operação READ declarada explicitamente
 * para o Deterministic Proposal Provider.
 */
export interface DeterministicReadProposalOperation {
  type: "read";

  target: string;
}

/**
 * Operação CREATE declarada explicitamente
 * para o Deterministic Proposal Provider.
 */
export interface DeterministicCreateProposalOperation {
  type: "create";

  target: string;

  content: string;
}

/**
 * Operações atualmente conhecidas
 * pelo provider determinístico.
 *
 * Esta união não concede qualquer
 * permissão de execução.
 */
export type DeterministicProposalOperation =
  | DeterministicReadProposalOperation
  | DeterministicCreateProposalOperation;

/**
 * Entrada explícita utilizada pelo primeiro
 * provider de propostas da VERA.
 *
 * Não existe interpretação de linguagem
 * natural neste estágio.
 *
 * A ordem declarada no array determina
 * automaticamente a ordem lógica das
 * ProposedActions produzidas.
 */
export interface DeterministicProposalInput {
  operations: readonly DeterministicProposalOperation[];
}
