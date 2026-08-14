import type { ActionProposal } from "./action-proposal.js";

/**
 * Contrato comum para qualquer componente
 * capaz de produzir uma ActionProposal.
 *
 * TInput representa o formato de entrada
 * específico utilizado por cada provider.
 *
 * Exemplos futuros:
 *
 * - DeterministicProposalInput;
 * - AIProposalInput;
 * - algum provider remoto.
 *
 * O retorno é assíncrono por design para
 * permitir providers que futuramente dependam
 * de chamadas externas sem alterar este contrato.
 */
export interface ActionProposalProvider<TInput> {
  /**
   * Produz uma proposta associada
   * a uma missão existente.
   *
   * Importante:
   *
   * produzir uma proposta NÃO significa:
   *
   * - autorizar uma ação;
   * - executar uma ação;
   * - acessar o filesystem;
   * - modificar o repositório.
   */
  propose(missionId: string, input: TInput): Promise<ActionProposal>;
}
