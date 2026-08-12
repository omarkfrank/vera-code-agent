import type { RepositoryInspection } from "../inspection/repository-inspection.js";

/**
 * Estados operacionais possíveis de uma missão da VERA.
 *
 * A missão deverá evoluir progressivamente entre esses
 * estados conforme o Agent Code Mode amadurecer.
 */
export type MissionStatus =
  | "received"
  | "analyzing"
  | "planned"
  | "executing"
  | "verifying"
  | "completed"
  | "failed";

/**
 * Representa uma missão de engenharia recebida pela VERA.
 *
 * Uma missão nasce a partir de um requisito fornecido
 * pelo usuário e carrega também o diagnóstico estruturado
 * do repositório em que será executada.
 *
 * Nesta fase inicial, a missão ainda não possui plano,
 * alterações de arquivos ou resultados de verificação.
 * Esses elementos serão adicionados gradualmente.
 */
export interface Mission {
  /**
   * Identificador único da missão.
   */
  id: string;

  /**
   * Requisito original normalizado.
   *
   * Exemplo:
   * "Adicionar endpoint GET /health com testes."
   */
  requirement: string;

  /**
   * Estado operacional atual da missão.
   */
  status: MissionStatus;

  /**
   * Data e horário de criação em formato ISO 8601.
   */
  createdAt: string;

  /**
   * Estado conhecido do repositório no momento
   * em que a missão foi criada.
   */
  repositoryInspection: RepositoryInspection;
}
