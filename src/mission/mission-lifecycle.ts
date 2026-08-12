import type { Mission, MissionStatus } from "./mission.js";

/**
 * Define explicitamente todas as transições de estado
 * permitidas durante o ciclo de vida de uma missão.
 *
 * O objetivo é impedir alterações arbitrárias em
 * `mission.status` e tornar o comportamento operacional
 * da VERA previsível, testável e auditável.
 *
 * Estados terminais:
 *
 * - completed
 * - failed
 *
 * Esses estados não permitem novas transições.
 */
const ALLOWED_TRANSITIONS: Readonly<
  Record<MissionStatus, readonly MissionStatus[]>
> = {
  received: ["analyzing", "failed"],

  analyzing: ["planned", "failed"],

  planned: ["executing", "failed"],

  executing: ["verifying", "failed"],

  verifying: ["completed", "failed"],

  completed: [],

  failed: [],
};

/**
 * Erro específico para tentativas de transição
 * inválidas no ciclo de vida de uma missão.
 *
 * Utilizar um erro próprio permite que camadas superiores,
 * como CLI e futuros executores, diferenciem uma violação
 * de lifecycle de outras falhas inesperadas.
 */
export class InvalidMissionStatusTransitionError extends Error {
  /**
   * Estado da missão antes da tentativa.
   */
  public readonly currentStatus: MissionStatus;

  /**
   * Estado solicitado pela operação.
   */
  public readonly targetStatus: MissionStatus;

  public constructor(
    currentStatus: MissionStatus,
    targetStatus: MissionStatus,
  ) {
    super(`Transição de status inválida: ${currentStatus} -> ${targetStatus}.`);

    this.name = "InvalidMissionStatusTransitionError";

    this.currentStatus = currentStatus;
    this.targetStatus = targetStatus;
  }
}

/**
 * Verifica se uma determinada transição
 * é permitida pela state machine da VERA.
 *
 * Esta função não altera nenhum estado.
 *
 * @param currentStatus Estado atual da missão.
 * @param targetStatus Estado desejado.
 * @returns true quando a transição é permitida.
 */
export function canTransitionMissionStatus(
  currentStatus: MissionStatus,
  targetStatus: MissionStatus,
): boolean {
  return ALLOWED_TRANSITIONS[currentStatus].includes(targetStatus);
}

/**
 * Realiza uma transição válida de estado.
 *
 * A função utiliza uma abordagem imutável:
 * a Mission original não é modificada.
 *
 * Em vez disso, uma nova Mission é retornada
 * contendo o novo status.
 *
 * @param mission Missão atualmente processada.
 * @param targetStatus Próximo estado solicitado.
 * @returns Nova Mission contendo o estado atualizado.
 *
 * @throws InvalidMissionStatusTransitionError
 * quando a transição não fizer parte do lifecycle.
 */
export function transitionMissionStatus(
  mission: Mission,
  targetStatus: MissionStatus,
): Mission {
  if (!canTransitionMissionStatus(mission.status, targetStatus)) {
    throw new InvalidMissionStatusTransitionError(mission.status, targetStatus);
  }

  return {
    ...mission,
    status: targetStatus,
  };
}
