import { transitionMissionStatus } from "../mission/mission-lifecycle.js";

import type { Mission } from "../mission/mission.js";

import { createExecutionFailureResult } from "./create-execution-failure-result.js";

import { executeCreateAction } from "./execute-create-action.js";

import { executeReadAction } from "./execute-read-action.js";

import type {
  ExecutionAction,
  ExecutionActionResult,
  MissionExecution,
} from "./mission-execution.js";

import { registerAffectedFile } from "./register-affected-file.js";

import { registerExecutionResult } from "./register-execution-result.js";

/**
 * Ações atualmente autorizadas pela
 * Execution Workflow.
 *
 * O contrato geral da VERA também conhece
 * update, delete e command, porém essas
 * capacidades permanecem bloqueadas.
 */
type AuthorizedExecutionAction = Extract<
  ExecutionAction,
  {
    type: "read" | "create";
  }
>;

/**
 * Resultado produzido pela Execution Workflow.
 */
export interface MissionExecutionWorkflowResult {
  /**
   * Missão após a execução.
   */
  mission: Mission;

  /**
   * Execução contendo ações, resultados
   * e arquivos afetados.
   */
  execution: MissionExecution;
}

/**
 * Erro estrutural da Execution Workflow.
 *
 * Esse erro representa uma violação das
 * regras da própria workflow, e não uma
 * falha operacional comum de filesystem.
 */
export class InvalidExecutionWorkflowError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidExecutionWorkflowError";
  }
}

/**
 * Valida e refina o tipo das ações recebidas.
 *
 * O uso de `asserts` é especialmente importante:
 * além de validar em runtime, informamos ao
 * TypeScript que, após esta função concluir,
 * todas as ações pertencem ao conjunto
 * atualmente autorizado:
 *
 * - read;
 * - create.
 */
function validateExecutionSequence(
  actions: ExecutionAction[],
): asserts actions is AuthorizedExecutionAction[] {
  /**
   * Primeira barreira:
   * somente capacidades autorizadas.
   */
  for (const action of actions) {
    if (action.type !== "read" && action.type !== "create") {
      throw new InvalidExecutionWorkflowError(
        `A Execution Workflow ainda não suporta ações do tipo "${action.type}".`,
      );
    }
  }

  /**
   * Política inicial de escrita:
   * no máximo um CREATE por execução.
   *
   * Isso reduz o risco de mutações parciais
   * caso uma missão apresente problemas.
   */
  const createActions = actions.filter((action) => action.type === "create");

  if (createActions.length > 1) {
    throw new InvalidExecutionWorkflowError(
      "A política atual permite no máximo uma Create Action por execução.",
    );
  }

  const createAction = createActions[0];

  /**
   * Caso exista CREATE, ele precisa ser
   * obrigatoriamente a última operação.
   *
   * Assim:
   *
   * READ
   * READ
   * CREATE
   *
   * é permitido.
   *
   * CREATE
   * READ
   *
   * é bloqueado antes de qualquer mutação.
   */
  if (createAction !== undefined) {
    const finalAction = actions.at(-1);

    if (finalAction?.id !== createAction.id) {
      throw new InvalidExecutionWorkflowError(
        "A Create Action precisa ser a última operação da execução.",
      );
    }
  }
}

/**
 * Executa exclusivamente uma ação pertencente
 * ao conjunto autorizado da VERA.
 *
 * Esta função resolve também uma importante
 * questão de tipagem:
 *
 * ela SEMPRE retorna ExecutionActionResult
 * ou lança uma exceção.
 *
 * Portanto não existe caminho válido em que
 * `operationResult` permaneça indefinido.
 */
async function executeAuthorizedAction(
  repositoryRoot: string,
  action: AuthorizedExecutionAction,
): Promise<ExecutionActionResult> {
  switch (action.type) {
    case "read":
      return executeReadAction(repositoryRoot, action);

    case "create":
      return executeCreateAction(repositoryRoot, action);
  }

  /**
   * Proteção de exhaustiveness.
   *
   * Se futuramente adicionarmos outro tipo
   * a AuthorizedExecutionAction e esquecermos
   * de tratá-lo acima, o TypeScript acusará
   * o problema durante o desenvolvimento.
   */
  const exhaustiveAction: never = action;

  throw new InvalidExecutionWorkflowError(
    `Ação autorizada sem executor implementado: ${String(exhaustiveAction)}.`,
  );
}

/**
 * Executa as ações registradas em uma missão.
 *
 * Fluxo atual:
 *
 * Mission(planned)
 *      ↓
 * preflight completo
 *      ↓
 * Mission(executing)
 *      ↓
 * READ / CREATE
 *      ↓
 * resultados
 *      ↓
 * affectedFiles
 *      ↓
 * Mission(verifying)
 *
 * Em caso de falha operacional:
 *
 * Mission(executing)
 *      ↓
 * failure result
 *      ↓
 * Mission(failed)
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
   * Uma nova execução operacional só pode
   * partir do estado prepared.
   */
  if (execution.status !== "prepared") {
    throw new InvalidExecutionWorkflowError(
      `A execução precisa estar em "prepared". Status atual: ${execution.status}.`,
    );
  }

  if (execution.actions.length === 0) {
    throw new InvalidExecutionWorkflowError(
      "A execução não possui ações registradas.",
    );
  }

  /**
   * Criamos uma cópia ordenada.
   *
   * A execução original permanece intacta.
   */
  const orderedActions = [...execution.actions].sort(
    (firstAction, secondAction) => firstAction.order - secondAction.order,
  );

  /**
   * IMPORTANTE:
   *
   * toda a sequência é validada antes de
   * qualquer acesso ou mutação física.
   *
   * Depois desta chamada, TypeScript também
   * sabe que orderedActions contém somente
   * READ ou CREATE.
   */
  validateExecutionSequence(orderedActions);

  /**
   * O Mission Lifecycle continua sendo
   * a autoridade responsável pela mudança:
   *
   * planned → executing
   */
  const executingMission = transitionMissionStatus(mission, "executing");

  let currentExecution: MissionExecution = {
    ...execution,

    status: "executing",
  };

  for (const action of orderedActions) {
    /**
     * Declaramos explicitamente o contrato
     * esperado.
     *
     * Agora não existe `undefined` possível:
     *
     * - a função retorna ExecutionActionResult;
     * - ou lança uma exceção;
     * - e o catch encerra a workflow.
     */
    let operationResult: ExecutionActionResult;

    try {
      operationResult = await executeAuthorizedAction(
        mission.repositoryInspection.directory,
        action,
      );
    } catch (error: unknown) {
      /**
       * Falhas operacionais são convertidas
       * em evidência estruturada.
       */
      const failureResult = createExecutionFailureResult(action, error);

      currentExecution = registerExecutionResult(
        currentExecution,
        failureResult,
      );

      const failedMission = transitionMissionStatus(executingMission, "failed");

      return {
        mission: failedMission,

        execution: {
          ...currentExecution,

          status: "failed",
        },
      };
    }

    /**
     * Ao chegar aqui o TypeScript possui
     * uma garantia concreta:
     *
     * operationResult: ExecutionActionResult
     *
     * portanto não existe mais a ambiguidade
     * observada anteriormente.
     */
    currentExecution = registerExecutionResult(
      currentExecution,
      operationResult,
    );

    /**
     * Somente CREATE modifica fisicamente
     * o repositório nesta etapa.
     *
     * O arquivo é registrado somente depois
     * de existir um resultado operacional
     * de sucesso.
     */
    if (action.type === "create") {
      currentExecution = registerAffectedFile(currentExecution, action.id);
    }
  }

  /**
   * Todas as operações foram concluídas.
   *
   * A execução termina operacionalmente
   * e a missão avança para VERIFY.
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
