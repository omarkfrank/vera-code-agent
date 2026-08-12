import type {
  ExecutionActionResult,
  MissionExecution,
} from "./mission-execution.js";

/**
 * Erro específico utilizado quando uma evidência
 * não pode ser registrada em uma execução.
 */
export class InvalidExecutionResultRegistrationError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidExecutionResultRegistrationError";
  }
}

/**
 * Registra o resultado de uma ação
 * dentro da MissionExecution.
 *
 * Regras:
 *
 * - execução precisa estar em `executing`;
 * - resultado precisa pertencer à execução;
 * - ação precisa existir;
 * - cada ação pode possuir apenas um resultado;
 * - operação é imutável.
 */
export function registerExecutionResult(
  execution: MissionExecution,
  result: ExecutionActionResult,
): MissionExecution {
  if (execution.status !== "executing") {
    throw new InvalidExecutionResultRegistrationError(
      `Resultados só podem ser registrados durante uma execução ativa. Status atual: ${execution.status}.`,
    );
  }

  if (result.executionId !== execution.id) {
    throw new InvalidExecutionResultRegistrationError(
      "O resultado informado não pertence a esta execução.",
    );
  }

  /**
   * Toda evidência precisa corresponder
   * a uma ação registrada anteriormente.
   */
  const registeredAction = execution.actions.find(
    (action) => action.id === result.actionId,
  );

  if (registeredAction === undefined) {
    throw new InvalidExecutionResultRegistrationError(
      `A ação "${result.actionId}" não está registrada nesta execução.`,
    );
  }

  /**
   * Nesta fase cada ação produz exatamente
   * uma evidência final.
   */
  const duplicatedResult = execution.results.some(
    (registeredResult) => registeredResult.actionId === result.actionId,
  );

  if (duplicatedResult) {
    throw new InvalidExecutionResultRegistrationError(
      `Já existe um resultado registrado para a ação "${result.actionId}".`,
    );
  }

  return {
    ...execution,

    results: [...execution.results, result],
  };
}
