import { randomUUID } from "node:crypto";

import type { RepositoryInspection } from "../inspection/repository-inspection.js";
import type { Mission } from "./mission.js";

/**
 * Cria uma nova missão da VERA.
 *
 * Responsabilidades:
 *
 * - normalizar o requisito recebido;
 * - impedir requisitos vazios;
 * - gerar um identificador único;
 * - registrar o instante de criação;
 * - iniciar a missão no estado "received";
 * - associar o diagnóstico atual do repositório.
 *
 * A função não executa código, não modifica arquivos
 * e não utiliza inteligência artificial.
 *
 * @param requirement Requisito fornecido pelo usuário.
 * @param repositoryInspection Diagnóstico atual do repositório.
 * @returns Nova missão pronta para entrar na fase de análise.
 */
export function createMission(
  requirement: string,
  repositoryInspection: RepositoryInspection,
): Mission {
  /**
   * Removemos espaços desnecessários das extremidades,
   * preservando o conteúdo interno escrito pelo usuário.
   */
  const normalizedRequirement = requirement.trim();

  /**
   * Uma missão sem requisito não possui significado
   * operacional e deve ser rejeitada imediatamente.
   */
  if (normalizedRequirement.length === 0) {
    throw new Error("O requisito da missão não pode estar vazio.");
  }

  return {
    id: randomUUID(),
    requirement: normalizedRequirement,
    status: "received",
    createdAt: new Date().toISOString(),
    repositoryInspection,
  };
}
