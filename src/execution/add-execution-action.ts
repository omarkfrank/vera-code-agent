import type {
  ExecutionAction,
  ExecutionActionType,
  MissionExecution,
} from "./mission-execution.js";

/**
 * Capacidades atualmente autorizadas pela VERA.
 *
 * READ:
 * operação sem mutação.
 *
 * CREATE:
 * criação exclusiva de arquivo novo, sem overwrite.
 *
 * UPDATE, DELETE e COMMAND permanecem bloqueadas.
 */
const AUTHORIZED_ACTION_TYPES: ReadonlySet<ExecutionActionType> = new Set([
  "read",
  "create",
]);

/**
 * Erro específico para tentativas inválidas
 * de registrar ações em uma MissionExecution.
 */
export class InvalidExecutionActionRegistrationError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidExecutionActionRegistrationError";
  }
}

/**
 * Registra uma ação operacional dentro
 * de uma MissionExecution.
 *
 * A operação permanece imutável.
 */
export function addExecutionAction(
  execution: MissionExecution,
  action: ExecutionAction,
): MissionExecution {
  if (action.executionId !== execution.id) {
    throw new InvalidExecutionActionRegistrationError(
      "A ação informada não pertence a esta execução.",
    );
  }

  if (!AUTHORIZED_ACTION_TYPES.has(action.type)) {
    throw new InvalidExecutionActionRegistrationError(
      `A ação do tipo "${action.type}" ainda não está autorizada para execução.`,
    );
  }

  if (action.id.trim().length === 0) {
    throw new InvalidExecutionActionRegistrationError(
      "A ação precisa possuir um identificador válido.",
    );
  }

  if (!Number.isInteger(action.order) || action.order < 1) {
    throw new InvalidExecutionActionRegistrationError(
      "A ordem da ação deve ser um número inteiro maior ou igual a 1.",
    );
  }

  /**
   * READ e CREATE obrigatoriamente operam
   * sobre um alvo textual válido.
   */
  if (
    (action.type === "read" || action.type === "create") &&
    action.target.trim().length === 0
  ) {
    throw new InvalidExecutionActionRegistrationError(
      `A ação do tipo "${action.type}" precisa possuir um alvo válido.`,
    );
  }

  /**
   * CREATE precisa carregar conteúdo textual.
   *
   * A fábrica já garante isso em TypeScript,
   * mas mantemos validação defensiva para
   * fronteiras JavaScript ou objetos manuais.
   */
  if (action.type === "create" && typeof action.content !== "string") {
    throw new InvalidExecutionActionRegistrationError(
      "A ação de criação precisa possuir conteúdo textual.",
    );
  }

  const duplicateId = execution.actions.some(
    (registeredAction) => registeredAction.id === action.id,
  );

  if (duplicateId) {
    throw new InvalidExecutionActionRegistrationError(
      `Já existe uma ação registrada com o ID "${action.id}".`,
    );
  }

  const duplicateOrder = execution.actions.some(
    (registeredAction) => registeredAction.order === action.order,
  );

  if (duplicateOrder) {
    throw new InvalidExecutionActionRegistrationError(
      `Já existe uma ação registrada na ordem ${action.order}.`,
    );
  }

  return {
    ...execution,

    actions: [...execution.actions, action],
  };
}
