import { transitionMissionStatus } from "../mission/mission-lifecycle.js";

import type { Mission } from "../mission/mission.js";

import { createExecutionFailureResult } from "./create-execution-failure-result.js";

import { executeReadAction } from "./execute-read-action.js";

import type { MissionExecution } from "./mission-execution.js";

import { registerExecutionResult } from "./register-execution-result.js";

/**
 * Resultado produzido pela Execution Workflow.
 */
export interface MissionExecutionWorkflowResult {
  /**
   * Estado da missão depois da execução.
   *
   * Sucesso:
   * verifying
   *
   * Falha:
   * failed
   */
  mission: Mission;

  /**
   * Execução contendo ações e evidências.
   *
   * Sucesso:
   * completed
   *
   * Falha:
   * failed
   */
  execution: MissionExecution;
}

/**
 * Erro específico para violações estruturais
 * da Execution Workflow.
 *
 * Diferentemente de falhas operacionais de ações,
 * estas condições representam inconsistências
 * no próprio fluxo e não são convertidas em
 * ExecutionActionResult.
 */
export class InvalidExecutionWorkflowError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidExecutionWorkflowError";
  }
}

/**
 * Executa as ações registradas em uma
 * MissionExecution.
 *
 * Fluxo de sucesso:
 *
 * Mission(planned)
 *      ↓
 * Mission(executing)
 *      ↓
 * ações executadas
 *      ↓
 * MissionExecution(completed)
 *      ↓
 * Mission(verifying)
 *
 * Fluxo de falha:
 *
 * Mission(executing)
 *      ↓
 * ação falha
 *      ↓
 * resultado failure registrado
 *      ↓
 * MissionExecution(failed)
 *      ↓
 * Mission(failed)
 *
 * A política atual é fail-fast:
 * após a primeira ação operacional com falha,
 * nenhuma ação posterior é executada.
 */
export async function executeMissionActions(
  mission: Mission,
  execution: MissionExecution,
): Promise<MissionExecutionWorkflowResult> {
  /**
   * A execução precisa pertencer
   * à missão recebida.
   */
  if (execution.missionId !== mission.id) {
    throw new InvalidExecutionWorkflowError(
      "A execução informada não pertence à missão.",
    );
  }

  /**
   * Uma execução só pode começar
   * a partir de `prepared`.
   */
  if (execution.status !== "prepared") {
    throw new InvalidExecutionWorkflowError(
      `A execução precisa estar em "prepared". Status atual: ${execution.status}.`,
    );
  }

  /**
   * Não iniciamos uma workflow vazia.
   */
  if (execution.actions.length === 0) {
    throw new InvalidExecutionWorkflowError(
      "A execução não possui ações registradas.",
    );
  }

  /**
   * O Mission Lifecycle protege:
   *
   * planned → executing
   */
  const executingMission = transitionMissionStatus(mission, "executing");

  /**
   * A MissionExecution também avança
   * de forma imutável.
   */
  let currentExecution: MissionExecution = {
    ...execution,
    status: "executing",
  };

  /**
   * A ordem operacional é determinada
   * por action.order.
   */
  const orderedActions = [...currentExecution.actions].sort(
    (firstAction, secondAction) => firstAction.order - secondAction.order,
  );

  for (const action of orderedActions) {
    /**
     * Validação defensiva.
     *
     * O registro já deveria impedir tipos
     * não autorizados, mas uma workflow nunca
     * deve confiar exclusivamente em outra camada.
     */
    if (action.type !== "read") {
      throw new InvalidExecutionWorkflowError(
        `A Execution Workflow ainda não suporta ações do tipo "${action.type}".`,
      );
    }

    try {
      const result = await executeReadAction(
        mission.repositoryInspection.directory,
        action,
      );

      currentExecution = registerExecutionResult(currentExecution, result);
    } catch (error: unknown) {
      /**
       * Uma falha operacional é transformada
       * em evidência antes da execução ser
       * encerrada.
       */
      const failureResult = createExecutionFailureResult(action, error);

      currentExecution = registerExecutionResult(
        currentExecution,
        failureResult,
      );

      /**
       * A política atual é fail-fast.
       */
      const failedMission = transitionMissionStatus(executingMission, "failed");

      return {
        mission: failedMission,

        execution: {
          ...currentExecution,
          status: "failed",
        },
      };
    }
  }

  /**
   * Todas as ações operacionais foram executadas
   * com sucesso.
   *
   * A Execution termina e a Mission entra
   * formalmente na etapa de verificação.
   */
  const verifyingMission = transitionMissionStatus(
    executingMission,
    "verifying",
  );

  return {
    mission: verifyingMission,

    execution: {
      ...currentExecution,
      status: "completed",
    },
  };
}
