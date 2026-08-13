import { addExecutionAction } from "../execution/add-execution-action.js";

import { executeMissionActions } from "../execution/execution-workflow.js";

import type {
  ExecutionAction,
  MissionExecution,
} from "../execution/mission-execution.js";

import { prepareMissionExecution } from "../execution/prepare-mission-execution.js";

import { createRepositoryMission } from "../mission/create-repository-mission.js";

import type { Mission } from "../mission/mission.js";

import type { MissionPlan } from "../planning/mission-plan.js";

import { planMission } from "../planning/planning-workflow.js";

import type { MissionVerification } from "../verification/mission-verification.js";

import { verifyMissionExecution } from "../verification/verification-workflow.js";

/**
 * Fábrica responsável por produzir as ações
 * depois que a execução possuir um ID real.
 *
 * A factory pode ser síncrona ou assíncrona.
 *
 * Isso mantém a camada preparada para uma
 * futura fonte externa de ações — inclusive IA —
 * sem conceder a ela autoridade para executar
 * diretamente operações no repositório.
 */
export type MissionActionFactory = (
  executionId: string,
) => ExecutionAction[] | Promise<ExecutionAction[]>;

/**
 * Resultado consolidado do ciclo completo
 * de uma missão de repositório.
 *
 * A aplicação preserva explicitamente:
 *
 * - Mission;
 * - MissionPlan;
 * - MissionExecution;
 * - MissionVerification.
 *
 * Dessa forma cada etapa permanece rastreável.
 */
export interface RepositoryMissionWorkflowResult {
  mission: Mission;

  plan: MissionPlan;

  execution: MissionExecution;

  /**
   * Uma falha operacional durante EXECUTE
   * encerra a missão diretamente em failed.
   *
   * Nesse caso VERIFY não deve ser executado,
   * portanto não existe MissionVerification.
   */
  verification: MissionVerification | null;
}

/**
 * Orquestra o ciclo determinístico completo
 * atualmente suportado pela VERA.
 *
 * Fluxo nominal:
 *
 * requirement
 *     ↓
 * UNDERSTAND
 *     ↓
 * received
 *     ↓
 * PLAN
 *     ↓
 * planned
 *     ↓
 * PREPARE
 *     ↓
 * prepared execution
 *     ↓
 * action factory
 *     ↓
 * authorization / registration
 *     ↓
 * EXECUTE
 *     ↓
 * verifying
 *     ↓
 * VERIFY
 *     ↓
 * completed / failed
 *
 * Importante:
 *
 * esta camada NÃO implementa regras de
 * autorização de filesystem.
 *
 * Ela apenas coordena componentes existentes.
 *
 * As políticas continuam pertencendo às
 * respectivas camadas de execução.
 */
export async function runRepositoryMissionWorkflow(
  directory: string,
  requirement: string,
  createActions: MissionActionFactory,
): Promise<RepositoryMissionWorkflowResult> {
  /**
   * UNDERSTAND
   *
   * Inspeciona o repositório e cria
   * a missão no estado received.
   */
  const receivedMission = await createRepositoryMission(directory, requirement);

  /**
   * PLAN
   *
   * received
   *   ↓
   * analyzing
   *   ↓
   * planned
   */
  const planningResult = planMission(receivedMission);

  /**
   * PREPARE
   *
   * Somente agora nasce execution.id.
   */
  const preparedExecution = prepareMissionExecution(
    planningResult.mission,
    planningResult.plan,
  );

  /**
   * Produzimos as ações somente depois
   * da criação da execução.
   *
   * Isso evita IDs artificiais ou a necessidade
   * de alterar actions posteriormente.
   */
  const actions = await createActions(preparedExecution.id);

  /**
   * Cada ação ainda precisa passar pela
   * camada oficial de autorização.
   *
   * O orchestrator não contorna
   * addExecutionAction().
   */
  let registeredExecution = preparedExecution;

  for (const action of actions) {
    registeredExecution = addExecutionAction(registeredExecution, action);
  }

  /**
   * EXECUTE
   *
   * A workflow operacional decide entre:
   *
   * sucesso:
   * planned → executing → verifying
   *
   * falha:
   * planned → executing → failed
   */
  const executionResult = await executeMissionActions(
    planningResult.mission,
    registeredExecution,
  );

  /**
   * Uma falha operacional já produziu:
   *
   * - Mission(failed);
   * - MissionExecution(failed);
   * - failure evidence.
   *
   * Como failed é terminal, não devemos
   * fabricar uma etapa VERIFY depois disso.
   */
  if (executionResult.mission.status === "failed") {
    return {
      mission: executionResult.mission,

      plan: planningResult.plan,

      execution: executionResult.execution,

      verification: null,
    };
  }

  /**
   * VERIFY
   *
   * Só chegamos aqui quando EXECUTE
   * terminou nominalmente em verifying.
   */
  const verificationResult = verifyMissionExecution(
    executionResult.mission,
    executionResult.execution,
  );

  return {
    mission: verificationResult.mission,

    plan: planningResult.plan,

    execution: executionResult.execution,

    verification: verificationResult.verification,
  };
}
