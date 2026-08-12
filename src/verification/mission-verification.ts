/**
 * Estado final de uma verificação.
 */
export type MissionVerificationStatus = "passed" | "failed";

/**
 * Estado individual de um critério
 * determinístico de verificação.
 */
export type VerificationCheckStatus = "passed" | "failed";

/**
 * Representa uma regra avaliada durante
 * a fase VERIFY da VERA.
 */
export interface VerificationCheck {
  /**
   * Identificador estável da regra.
   *
   * Pode ser utilizado futuramente em logs,
   * relatórios, CLI e integrações com IA.
   */
  id: string;

  /**
   * Resultado da regra.
   */
  status: VerificationCheckStatus;

  /**
   * Evidência textual produzida pela regra.
   */
  message: string;
}

/**
 * Evidência consolidada da verificação
 * de uma missão.
 */
export interface MissionVerification {
  /**
   * Missão verificada.
   */
  missionId: string;

  /**
   * Execução utilizada como fonte
   * de evidências.
   */
  executionId: string;

  /**
   * Resultado consolidado.
   */
  status: MissionVerificationStatus;

  /**
   * Momento da verificação em ISO 8601.
   */
  verifiedAt: string;

  /**
   * Critérios avaliados.
   *
   * Mantemos todas as evidências, inclusive
   * quando alguma verificação falha.
   */
  checks: VerificationCheck[];
}
