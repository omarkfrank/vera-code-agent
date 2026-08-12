import type { MissionExecution } from "../execution/mission-execution.js";

import { transitionMissionStatus } from "../mission/mission-lifecycle.js";

import type { Mission } from "../mission/mission.js";

import type { MissionVerification } from "./mission-verification.js";

import { verifyExecutionEvidence } from "./verify-execution-evidence.js";

/**
 * Resultado consolidado da Verification Workflow.
 */
export interface VerificationWorkflowResult {
  /**
   * Missão após a decisão da verificação.
   *
   * passed:
   * completed
   *
   * failed:
   * failed
   */
  mission: Mission;

  /**
   * Evidência completa da verificação.
   */
  verification: MissionVerification;
}

/**
 * Erro utilizado para violações estruturais
 * da Verification Workflow.
 *
 * Uma verificação reprovada NÃO é uma exceção.
 *
 * Exceções representam uso incorreto da workflow.
 */
export class InvalidVerificationWorkflowError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidVerificationWorkflowError";
  }
}

/**
 * Executa a fase VERIFY de uma missão.
 *
 * Fluxo:
 *
 * Mission(verifying)
 *       ↓
 * Execution Evidence
 *       ↓
 * deterministic verification
 *       ↓
 * passed ─────→ Mission(completed)
 *
 * failed ─────→ Mission(failed)
 */
export function verifyMissionExecution(
  mission: Mission,
  execution: MissionExecution,
): VerificationWorkflowResult {
  /**
   * Esta workflow existe exclusivamente
   * para missões que chegaram formalmente
   * à fase VERIFY.
   */
  if (mission.status !== "verifying") {
    throw new InvalidVerificationWorkflowError(
      `A missão precisa estar em "verifying". Status atual: ${mission.status}.`,
    );
  }

  /**
   * Não podemos utilizar evidências de
   * outra missão.
   */
  if (execution.missionId !== mission.id) {
    throw new InvalidVerificationWorkflowError(
      "A execução informada não pertence à missão.",
    );
  }

  const verification = verifyExecutionEvidence(execution);

  /**
   * A própria state machine continua sendo
   * responsável pela mudança de estado.
   */
  const targetStatus =
    verification.status === "passed" ? "completed" : "failed";

  const verifiedMission = transitionMissionStatus(mission, targetStatus);

  return {
    mission: verifiedMission,

    verification,
  };
}
