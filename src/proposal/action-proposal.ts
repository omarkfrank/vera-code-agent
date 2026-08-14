import type { ProposedAction } from "./proposed-action.js";

/**
 * Estado inicial de uma ActionProposal.
 *
 * Neste estágio a proposta ainda não foi
 * materializada nem executada.
 */
export type ActionProposalStatus = "proposed";

/**
 * Representa um conjunto estruturado
 * de ações sugeridas para uma missão.
 *
 * Importante:
 *
 * ActionProposal não é MissionExecution.
 *
 * Uma proposta:
 *
 * - não possui executionId;
 * - não executa operações;
 * - não modifica arquivos;
 * - não representa autorização.
 */
export interface ActionProposal {
  /**
   * Identificador próprio da proposta.
   */
  id: string;

  /**
   * Missão à qual a proposta pertence.
   */
  missionId: string;

  /**
   * Estado atual da proposta.
   */
  status: ActionProposalStatus;

  /**
   * Instante de criação da proposta.
   */
  createdAt: string;

  /**
   * Ações sugeridas em ordem lógica.
   */
  actions: readonly ProposedAction[];
}
