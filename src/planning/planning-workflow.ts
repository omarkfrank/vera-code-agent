import { transitionMissionStatus } from "../mission/mission-lifecycle.js";

import type { Mission } from "../mission/mission.js";

import type { MissionPlan } from "./mission-plan.js";

import { createMissionPlan } from "./mission-planner.js";

/**
 * Resultado produzido pela workflow de planejamento.
 *
 * A operação retorna:
 *
 * - a missão já atualizada para o estado "planned";
 * - o plano estruturado associado à missão.
 *
 * Os dois objetos permanecem explicitamente separados,
 * pois representam responsabilidades diferentes.
 */
export interface MissionPlanningResult {
  mission: Mission;
  plan: MissionPlan;
}

/**
 * Orquestra o ciclo de planejamento de uma missão.
 *
 * Fluxo:
 *
 * received
 *    ↓
 * analyzing
 *    ↓
 * criação do MissionPlan
 *    ↓
 * planned
 *
 * Esta função não executa alterações no repositório.
 * Seu objetivo é exclusivamente coordenar o lifecycle
 * da missão durante a etapa de planejamento.
 *
 * @param mission Missão que deverá ser planejada.
 * @returns Missão planejada e seu respectivo plano.
 *
 * @throws InvalidMissionStatusTransitionError
 * quando a missão não estiver em um estado compatível
 * com o início da workflow.
 */
export function planMission(mission: Mission): MissionPlanningResult {
  /**
   * Uma missão precisa entrar formalmente em análise
   * antes que um plano seja produzido.
   *
   * A transitionMissionStatus() retorna uma nova Mission,
   * preservando a imutabilidade da original.
   */
  const analyzingMission = transitionMissionStatus(mission, "analyzing");

  /**
   * O planner permanece uma função independente
   * da state machine.
   *
   * Ele recebe uma missão contextualizada e produz
   * somente o contrato de planejamento.
   */
  const plan = createMissionPlan(analyzingMission);

  /**
   * Após a criação bem-sucedida do plano,
   * a missão pode avançar para "planned".
   */
  const plannedMission = transitionMissionStatus(analyzingMission, "planned");

  return {
    mission: plannedMission,
    plan,
  };
}
