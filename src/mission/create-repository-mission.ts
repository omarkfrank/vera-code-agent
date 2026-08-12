import { inspectRepository } from "../inspection/repository-inspector.js";
import { createMission } from "./create-mission.js";
import type { Mission } from "./mission.js";

/**
 * Cria uma missão associada ao estado atual de um repositório.
 *
 * Esta função representa a primeira composição entre:
 *
 * - o requisito fornecido pelo usuário;
 * - a inspeção técnica do repositório;
 * - o modelo de missão da VERA.
 *
 * Nesta etapa ainda não existe planejamento por IA.
 * A função apenas estabelece o contexto confiável sobre
 * o qual o futuro Mission Planner irá trabalhar.
 *
 * @param directory Diretório do repositório analisado.
 * @param requirement Requisito informado pelo usuário.
 * @returns Missão criada com o diagnóstico atual do repositório.
 */
export async function createRepositoryMission(
  directory: string,
  requirement: string,
): Promise<Mission> {
  /**
   * Antes de criar a missão, coletamos o estado atual
   * do repositório.
   *
   * Isso garante que toda missão tenha contexto técnico
   * associado desde o momento em que nasce.
   */
  const repositoryInspection = await inspectRepository(directory);

  /**
   * A fábrica centraliza regras como:
   *
   * - normalização do requisito;
   * - geração de UUID;
   * - timestamp;
   * - status inicial "received".
   */
  return createMission(requirement, repositoryInspection);
}
