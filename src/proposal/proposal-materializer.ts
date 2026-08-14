import { createFileExecutionAction } from "../execution/create-file-execution-action.js";

import { createReadExecutionAction } from "../execution/create-read-execution-action.js";

import type {
  ExecutionAction,
  MissionExecution,
} from "../execution/mission-execution.js";

import type { ActionProposal } from "./action-proposal.js";

/**
 * Erro utilizado quando uma ActionProposal
 * não pode ser materializada com segurança
 * para uma execução específica.
 *
 * Materializar significa apenas converter
 * intenção em contratos operacionais.
 *
 * Nenhuma ação é executada por este componente.
 */
export class InvalidProposalMaterializationError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidProposalMaterializationError";
  }
}

/**
 * Converte uma ActionProposal em
 * ExecutionActions pertencentes a uma
 * MissionExecution real.
 *
 * Responsabilidades desta camada:
 *
 * - validar o vínculo entre proposta e execução;
 * - exigir uma execução ainda preparada;
 * - associar cada ação ao executionId real;
 * - utilizar as factories oficiais de execução;
 * - preservar a ordem declarada na proposta.
 *
 * Esta função NÃO:
 *
 * - registra ações na execução;
 * - autoriza políticas operacionais;
 * - acessa o filesystem;
 * - executa READ ou CREATE;
 * - altera proposta ou execução.
 */
export function materializeActionProposal(
  proposal: ActionProposal,
  execution: MissionExecution,
): ExecutionAction[] {
  /**
   * Uma proposta criada para outra missão
   * nunca deve ser vinculada à execução atual.
   */
  if (proposal.missionId !== execution.missionId) {
    throw new InvalidProposalMaterializationError(
      "A proposta não pertence à missão associada à execução.",
    );
  }

  /**
   * Materializamos apenas sobre uma execução
   * ainda no estado prepared.
   *
   * Isso evita associar novas ações a uma
   * execução já iniciada ou finalizada.
   */
  if (execution.status !== "prepared") {
    throw new InvalidProposalMaterializationError(
      "A proposta somente pode ser materializada para uma execução preparada.",
    );
  }

  return proposal.actions.map((proposedAction) => {
    switch (proposedAction.type) {
      case "read":
        /**
         * A factory oficial continua sendo
         * responsável pela criação da ação
         * operacional READ e de seu UUID.
         */
        return createReadExecutionAction(
          execution.id,
          proposedAction.order,
          proposedAction.target,
        );

      case "create":
        /**
         * A factory oficial de CREATE mantém
         * o contrato operacional já utilizado
         * pela camada de execução.
         */
        return createFileExecutionAction(
          execution.id,
          proposedAction.order,
          proposedAction.target,
          proposedAction.content,
        );

      default: {
        /**
         * Exhaustiveness check.
         *
         * Caso ProposedAction ganhe um novo
         * tipo, TypeScript obrigará esta camada
         * a tratar explicitamente a operação.
         */
        const exhaustiveAction: never = proposedAction;

        return exhaustiveAction;
      }
    }
  });
}
