import type { ActionProposalProvider } from "./action-proposal-provider.js";

import type { ActionProposal } from "./action-proposal.js";

import { createActionProposal } from "./create-action-proposal.js";

import {
  createCreateProposedAction,
  createReadProposedAction,
} from "./create-proposed-action.js";

import type { DeterministicProposalInput } from "./deterministic-proposal-input.js";

/**
 * Primeira implementação concreta
 * de ActionProposalProvider.
 *
 * Este provider é totalmente determinístico:
 *
 * - não utiliza IA;
 * - não interpreta linguagem natural;
 * - não acessa filesystem;
 * - não inspeciona repositórios;
 * - não autoriza execução.
 *
 * Sua única responsabilidade é transformar
 * uma intenção explicitamente tipada em uma
 * ActionProposal estruturada.
 */
export class DeterministicActionProposalProvider implements ActionProposalProvider<DeterministicProposalInput> {
  /**
   * Converte operações declarativas em
   * ProposedActions ordenadas.
   *
   * A posição no array de entrada determina:
   *
   * índice 0 → order 1
   * índice 1 → order 2
   * índice 2 → order 3
   *
   * As factories existentes continuam
   * responsáveis pelas invariantes básicas
   * de cada ProposedAction.
   */
  public async propose(
    missionId: string,
    input: DeterministicProposalInput,
  ): Promise<ActionProposal> {
    const actions = input.operations.map((operation, index) => {
      const order = index + 1;

      switch (operation.type) {
        case "read":
          return createReadProposedAction(order, operation.target);

        case "create":
          return createCreateProposedAction(
            order,
            operation.target,
            operation.content,
          );

        default: {
          /**
           * Proteção de exhaustiveness.
           *
           * Caso a união discriminada ganhe
           * um novo tipo no futuro, TypeScript
           * obrigará este provider a decidir
           * explicitamente como tratá-lo.
           */
          const exhaustiveOperation: never = operation;

          return exhaustiveOperation;
        }
      }
    });

    /**
     * O envelope final continua sendo criado
     * exclusivamente pela factory oficial.
     *
     * Assim preservamos em um único local:
     *
     * - missionId;
     * - UUID;
     * - timestamp;
     * - status;
     * - validações;
     * - ordenação determinística.
     */
    return createActionProposal(missionId, actions);
  }
}
