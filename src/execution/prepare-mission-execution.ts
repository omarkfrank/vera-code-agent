import { randomUUID } from "node:crypto";

import type { Mission } from "../mission/mission.js";
import type { MissionPlan } from "../planning/mission-plan.js";

import type { MissionExecution } from "./mission-execution.js";

/**
 * Erro específico utilizado quando uma execução
 * não pode ser preparada com segurança.
 *
 * A camada de CLI e as futuras workflows poderão
 * diferenciar esta condição de falhas inesperadas.
 */
export class InvalidMissionExecutionPreparationError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidMissionExecutionPreparationError";
  }
}

/**
 * Prepara uma estrutura de execução para
 * uma missão já planejada.
 *
 * Regras atuais:
 *
 * - a Mission precisa estar em "planned";
 * - o MissionPlan precisa pertencer à mesma missão;
 * - nenhuma operação real é executada;
 * - nenhuma modificação de arquivos é realizada.
 *
 * @param mission Missão pronta para execução.
 * @param plan Plano associado à missão.
 * @returns Estrutura inicial da execução.
 */
export function prepareMissionExecution(
  mission: Mission,
  plan: MissionPlan,
): MissionExecution {
  /**
   * Uma missão ainda não planejada não pode
   * avançar para preparação de execução.
   */
  if (mission.status !== "planned") {
    throw new InvalidMissionExecutionPreparationError(
      `A missão precisa estar em "planned" para preparar a execução. Status atual: ${mission.status}.`,
    );
  }

  /**
   * O plano recebido precisa necessariamente
   * pertencer à mesma missão.
   *
   * Essa verificação evita executar um plano
   * produzido para outro contexto.
   */
  if (plan.missionId !== mission.id) {
    throw new InvalidMissionExecutionPreparationError(
      "O plano informado não pertence à missão.",
    );
  }

  /**
   * Neste primeiro estágio apenas preparamos
   * o envelope operacional.
   *
   * As ações concretas serão criadas em uma
   * etapa posterior e explicitamente validada.
   */
  return {
    id: randomUUID(),
    missionId: mission.id,
    status: "prepared",
    preparedAt: new Date().toISOString(),
    actions: [],
    affectedFiles: [],
    results: [],
  };
}
