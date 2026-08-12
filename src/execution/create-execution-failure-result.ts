import type {
  ExecutionAction,
  ExecutionActionResult,
} from "./mission-execution.js";

import {
  InvalidCreateExecutionActionError,
  RepositoryCreateError,
} from "./execute-create-action.js";

import {
  InvalidReadExecutionActionError,
  RepositoryReadError,
} from "./execute-read-action.js";

import { RepositoryPathViolationError } from "./repository-path.js";

/**
 * Converte uma falha operacional em
 * evidência estruturada da execução.
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
 * Normaliza falhas operacionais sem expor
 * detalhes internos desnecessários.
 */
function describeExecutionFailure(error: unknown): string {
  if (
    error instanceof RepositoryPathViolationError ||
    error instanceof RepositoryReadError ||
    error instanceof InvalidReadExecutionActionError ||
    error instanceof RepositoryCreateError ||
    error instanceof InvalidCreateExecutionActionError
  ) {
    return error.message;
  }

  if (error instanceof Error && "code" in error && error.code === "ENOENT") {
    return "Arquivo alvo não encontrado.";
  }

  return "Falha inesperada durante a execução da ação.";
}
