/**
 * Estado operacional de uma execução de missão.
 *
 * prepared:
 * a execução foi criada e pode receber ações.
 *
 * executing:
 * as ações registradas estão sendo processadas.
 *
 * completed:
 * todas as ações foram executadas com sucesso e
 * a missão pode avançar para verificação.
 *
 * failed:
 * uma operação falhou e a execução foi interrompida.
 */
export type MissionExecutionStatus =
  | "prepared"
  | "executing"
  | "completed"
  | "failed";

/**
 * Tipos de ações conhecidos pelo contrato
 * da camada de execução.
 *
 * Conhecer um tipo não significa autorizá-lo.
 *
 * Atualmente somente `read` possui autorização
 * operacional.
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
   * Execução proprietária da ação.
   */
  executionId: string;

  /**
   * Identificador exclusivo da ação.
   */
  id: string;

  /**
   * Ordem operacional.
   */
  order: number;

  /**
   * Categoria da ação.
   */
  type: ExecutionActionType;

  /**
   * Descrição humana e técnica.
   */
  description: string;

  /**
   * Recurso alvo.
   */
  target: string | null;
}

/**
 * Resultado operacional possível.
 */
export type ExecutionActionResultStatus = "success" | "failure" | "skipped";

/**
 * Evidência produzida por uma ação.
 */
export interface ExecutionActionResult {
  /**
   * Execução que produziu o resultado.
   */
  executionId: string;

  /**
   * Ação responsável pelo resultado.
   */
  actionId: string;

  /**
   * Estado da operação.
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
   * Conteúdo textual lido.
   */
  content: string;
}

/**
 * Representa uma execução associada
 * a uma missão da VERA.
 */
export interface MissionExecution {
  /**
   * Identificador exclusivo da execução.
   */
  id: string;

  /**
   * Missão proprietária da execução.
   */
  missionId: string;

  /**
   * Estado operacional atual.
   */
  status: MissionExecutionStatus;

  /**
   * Momento de preparação em ISO 8601.
   */
  preparedAt: string;

  /**
   * Ações formalmente registradas.
   */
  actions: ExecutionAction[];

  /**
   * Arquivos modificados.
   *
   * Read Actions não adicionam itens aqui.
   */
  affectedFiles: string[];

  /**
   * Evidências produzidas pelas ações.
   */
  results: ExecutionActionResult[];
}
