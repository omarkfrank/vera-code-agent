/**
 * Estado atual de uma execução de missão.
 *
 * Nesta etapa suportamos somente "prepared".
 *
 * Novos estados serão introduzidos quando
 * construirmos a Execution Workflow.
 */
export type MissionExecutionStatus = "prepared";

/**
 * Tipos de ações que poderão existir
 * dentro da camada de execução.
 *
 * Embora o contrato já conheça outros tipos,
 * somente `read` possui autorização operacional
 * neste estágio do projeto.
 */
export type ExecutionActionType =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "command";

/**
 * Representa uma ação individual associada
 * a uma MissionExecution.
 */
export interface ExecutionAction {
  /**
   * Identificador da execução proprietária
   * desta ação.
   *
   * Esse vínculo impede que uma ação preparada
   * para uma execução seja registrada em outra.
   */
  executionId: string;

  /**
   * Identificador único da própria ação.
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
   * Para ações sobre arquivos, representa
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
   * Ação responsável pelo resultado.
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
 * Resultado especializado de uma Read Action.
 */
export interface ReadExecutionActionResult extends ExecutionActionResult {
  /**
   * Caminho relativo solicitado.
   */
  target: string;

  /**
   * Conteúdo textual encontrado no arquivo.
   */
  content: string;
}

/**
 * Representa uma execução preparada
 * para uma missão.
 *
 * MissionPlan:
 * descreve o que deve ser feito.
 *
 * MissionExecution:
 * registra como as operações serão preparadas,
 * executadas e posteriormente verificadas.
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
   * Estado atual.
   */
  status: MissionExecutionStatus;

  /**
   * Momento da preparação em ISO 8601.
   */
  preparedAt: string;

  /**
   * Operações formalmente registradas
   * dentro desta execução.
   */
  actions: ExecutionAction[];

  /**
   * Arquivos modificados pela execução.
   *
   * Read Actions não adicionam itens aqui.
   */
  affectedFiles: string[];

  /**
   * Evidências produzidas pelas operações.
   */
  results: ExecutionActionResult[];
}
