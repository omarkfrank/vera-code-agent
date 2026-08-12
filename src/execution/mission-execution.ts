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
 * Tipos de ações que poderão ser executadas
 * pela VERA sobre um repositório.
 *
 * Apenas `read` começará a possuir implementação
 * operacional neste estágio.
 */
export type ExecutionActionType =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "command";

/**
 * Representa uma ação individual preparada
 * para uma execução.
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
   * Para ações sobre arquivos, deve representar
   * um caminho relativo à raiz do repositório.
   */
  target: string | null;
}

/**
 * Resultado possível de uma ação executada.
 */
export type ExecutionActionResultStatus = "success" | "failure" | "skipped";

/**
 * Evidência produzida depois da execução
 * de uma ação individual.
 */
export interface ExecutionActionResult {
  /**
   * Ação que originou o resultado.
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
 * Resultado específico de uma ação de leitura.
 *
 * Mantemos esse contrato especializado porque
 * uma leitura bem-sucedida também produz conteúdo.
 */
export interface ReadExecutionActionResult extends ExecutionActionResult {
  /**
   * Caminho relativo solicitado pela ação.
   */
  target: string;

  /**
   * Conteúdo textual encontrado no arquivo.
   */
  content: string;
}

/**
 * Representa uma execução preparada para uma missão.
 *
 * MissionPlan:
 * descreve o que deve ser feito.
 *
 * MissionExecution:
 * representa como essas operações serão
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
   * Momento da preparação em ISO 8601.
   */
  preparedAt: string;

  /**
   * Operações preparadas para execução.
   */
  actions: ExecutionAction[];

  /**
   * Arquivos que poderão sofrer alterações.
   *
   * A leitura não deve adicionar arquivos
   * a esta coleção.
   */
  affectedFiles: string[];

  /**
   * Resultados produzidos pelas operações.
   */
  results: ExecutionActionResult[];
}
