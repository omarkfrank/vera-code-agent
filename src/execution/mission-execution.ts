/**
 * Estado atual de uma execução de missão.
 *
 * Nesta primeira etapa suportamos somente "prepared".
 *
 * Os estados de execução efetiva serão introduzidos
 * quando construirmos a Execution Workflow.
 */
export type MissionExecutionStatus = "prepared";

/**
 * Tipos de ações que futuramente poderão ser
 * executadas pela VERA sobre um repositório.
 *
 * A declaração antecipada desse contrato permitirá
 * validar ações antes que elas alcancem filesystem,
 * shell ou outras capacidades operacionais.
 */
export type ExecutionActionType =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "command";

/**
 * Representa uma ação individual preparada
 * para uma futura execução.
 *
 * Neste checkpoint ainda não criaremos ações reais.
 * O contrato apenas define como elas deverão existir.
 */
export interface ExecutionAction {
  /**
   * Identificador único da ação.
   */
  id: string;

  /**
   * Ordem da ação dentro da execução.
   */
  order: number;

  /**
   * Categoria operacional.
   */
  type: ExecutionActionType;

  /**
   * Descrição humana e técnica da operação.
   */
  description: string;

  /**
   * Recurso alvo da operação.
   *
   * Exemplos futuros:
   *
   * src/routes/health.ts
   * package.json
   * npm test
   *
   * null representa uma ação cujo alvo ainda
   * não foi determinado.
   */
  target: string | null;
}

/**
 * Resultado possível de uma ação executada.
 *
 * Ainda não utilizaremos esse contrato neste marco,
 * mas ele estabelece a estrutura que posteriormente
 * receberá evidências da Execution Workflow.
 */
export type ExecutionActionResultStatus = "success" | "failure" | "skipped";

/**
 * Evidência produzida depois da execução
 * de uma ação individual.
 */
export interface ExecutionActionResult {
  /**
   * Ação que originou este resultado.
   */
  actionId: string;

  /**
   * Resultado operacional.
   */
  status: ExecutionActionResultStatus;

  /**
   * Informação produzida pela operação.
   */
  message: string;
}

/**
 * Representa uma execução preparada para uma missão.
 *
 * É importante distinguir:
 *
 * MissionPlan
 * → descreve o que deve ser feito.
 *
 * MissionExecution
 * → representa como essas operações serão
 * preparadas, executadas e registradas.
 */
export interface MissionExecution {
  /**
   * Identificador exclusivo da execução.
   */
  id: string;

  /**
   * Missão associada à execução.
   */
  missionId: string;

  /**
   * Estado atual da execução.
   */
  status: MissionExecutionStatus;

  /**
   * Momento em que a execução foi preparada,
   * armazenado em ISO 8601.
   */
  preparedAt: string;

  /**
   * Operações preparadas para execução.
   *
   * Inicialmente permanece vazio.
   */
  actions: ExecutionAction[];

  /**
   * Arquivos que poderão sofrer alterações.
   *
   * A lista começará vazia até que exista
   * uma etapa responsável por determinar
   * mudanças concretas.
   */
  affectedFiles: string[];

  /**
   * Resultados produzidos durante a execução.
   *
   * Uma execução recém-preparada ainda não
   * possui resultados.
   */
  results: ExecutionActionResult[];
}
