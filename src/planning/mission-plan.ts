/**
 * Tipos de atividade que podem compor
 * uma etapa do plano de missão.
 *
 * Essa classificação permitirá que a VERA,
 * futuramente, trate cada categoria de forma
 * específica durante a execução.
 */
export type MissionPlanStepType =
  | "analysis"
  | "implementation"
  | "test"
  | "verification"
  | "documentation";

/**
 * Estado inicial de um plano criado pela VERA.
 *
 * Outros estados poderão ser adicionados quando
 * introduzirmos execução e acompanhamento do plano.
 */
export type MissionPlanStatus = "planned";

/**
 * Representa uma etapa individual dentro
 * de um plano de missão.
 */
export interface MissionPlanStep {
  /**
   * Posição da etapa dentro do plano.
   */
  order: number;

  /**
   * Categoria operacional da etapa.
   */
  type: MissionPlanStepType;

  /**
   * Título curto e objetivo.
   */
  title: string;

  /**
   * Descrição do trabalho esperado.
   */
  description: string;
}

/**
 * Representa o plano estruturado de uma missão.
 *
 * O MissionPlan será o contrato utilizado futuramente
 * entre o núcleo da VERA e a camada de Inteligência
 * Artificial responsável pelo planejamento.
 */
export interface MissionPlan {
  /**
   * Identificador da missão que originou o plano.
   */
  missionId: string;

  /**
   * Objetivo principal do plano.
   */
  objective: string;

  /**
   * Estado atual do planejamento.
   */
  status: MissionPlanStatus;

  /**
   * Sequência ordenada de atividades planejadas.
   */
  steps: MissionPlanStep[];

  /**
   * Riscos identificados antes da execução.
   */
  risks: string[];

  /**
   * Condições necessárias para considerar
   * a missão corretamente implementada.
   */
  acceptanceCriteria: string[];
}
