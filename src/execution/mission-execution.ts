/**
 * Estado operacional de uma execução de missão.
 */
export type MissionExecutionStatus =
  | "prepared"
  | "executing"
  | "completed"
  | "failed";

/**
 * Tipos de ações conhecidos pela camada
 * de execução da VERA.
 *
 * Conhecer um tipo não significa que ele
 * esteja autorizado pela workflow atual.
 */
export type ExecutionActionType =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "command";

/**
 * Campos comuns a todas as ações operacionais.
 */
interface BaseExecutionAction {
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
   * Descrição humana e técnica.
   */
  description: string;

  /**
   * Recurso alvo da operação.
   */
  target: string | null;
}

/**
 * Ação protegida de leitura.
 */
export interface ReadExecutionAction extends BaseExecutionAction {
  type: "read";

  /**
   * Read sempre possui um arquivo alvo.
   */
  target: string;
}

/**
 * Ação protegida de criação.
 *
 * Nesta primeira versão CREATE significa:
 *
 * "criar um NOVO arquivo textual".
 *
 * Sobrescrita não é permitida.
 */
export interface CreateExecutionAction extends BaseExecutionAction {
  type: "create";

  /**
   * Arquivo relativo ao repositório.
   */
  target: string;

  /**
   * Conteúdo textual que será gravado.
   */
  content: string;
}

/**
 * Operações conhecidas pelo contrato,
 * porém ainda sem capacidade operacional.
 */
export interface RestrictedExecutionAction extends BaseExecutionAction {
  type: "update" | "delete" | "command";
}

/**
 * União discriminada das ações conhecidas.
 *
 * Essa estrutura permitirá à TypeScript
 * compreender propriedades específicas de
 * cada operação através do campo `type`.
 */
export type ExecutionAction =
  | ReadExecutionAction
  | CreateExecutionAction
  | RestrictedExecutionAction;

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
  target: string;

  /**
   * Conteúdo textual lido.
   */
  content: string;
}

/**
 * Resultado especializado de uma Create Action.
 */
export interface CreateExecutionActionResult extends ExecutionActionResult {
  /**
   * Arquivo criado.
   */
  target: string;

  /**
   * Quantidade real de bytes UTF-8 gravados.
   */
  bytesWritten: number;
}

/**
 * Representa uma execução associada
 * a uma missão da VERA.
 */
export interface MissionExecution {
  /**
   * Identificador exclusivo.
   */
  id: string;

  /**
   * Missão proprietária.
   */
  missionId: string;

  /**
   * Estado operacional.
   */
  status: MissionExecutionStatus;

  /**
   * Momento de preparação em ISO 8601.
   */
  preparedAt: string;

  /**
   * Ações registradas.
   */
  actions: ExecutionAction[];

  /**
   * Arquivos fisicamente modificados
   * pela execução.
   */
  affectedFiles: string[];

  /**
   * Evidências produzidas.
   */
  results: ExecutionActionResult[];
}
