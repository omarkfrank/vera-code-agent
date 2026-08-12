import type {
  ExecutionAction,
  ExecutionActionResult,
} from "./mission-execution.js";

import {
  InvalidReadExecutionActionError,
  RepositoryReadError,
} from "./execute-read-action.js";

import { RepositoryPathViolationError } from "./repository-path.js";

/**
 * Converte uma falha operacional em uma
 * evidência estruturada da execução.
 *
 * A camada de domínio não deve depender de uma
 * exceção não tratada para saber que uma ação falhou.
 *
 * Em vez disso, produzimos:
 *
 * ExecutionActionResult {
 *   status: "failure"
 * }
 *
 * @param action Ação que estava sendo executada.
 * @param error Falha produzida pela operação.
 */
export function createExecutionFailureResult(
  action: ExecutionAction,
  error: unknown,
): ExecutionActionResult {
  return {
    executionId: action.executionId,
    actionId: action.id,
    status: "failure",
    message: describeExecutionFailure(error),
  };
}

/**
 * Produz uma mensagem segura e previsível
 * para uma falha operacional.
 *
 * Erros de domínio conhecidos podem preservar
 * suas mensagens.
 *
 * Erros de infraestrutura são normalizados para
 * evitar expor detalhes internos desnecessários,
 * como caminhos absolutos do sistema operacional.
 */
function describeExecutionFailure(error: unknown): string {
  if (
    error instanceof RepositoryPathViolationError ||
    error instanceof RepositoryReadError ||
    error instanceof InvalidReadExecutionActionError
  ) {
    return error.message;
  }

  /**
   * Arquivo inexistente é uma condição operacional
   * comum e pode ser comunicada explicitamente.
   */
  if (error instanceof Error && "code" in error && error.code === "ENOENT") {
    return "Arquivo alvo não encontrado.";
  }

  /**
   * Fallback seguro para condições inesperadas.
   */
  return "Falha inesperada durante a execução da ação.";
}
