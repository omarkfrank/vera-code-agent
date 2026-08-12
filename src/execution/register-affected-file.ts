import type { MissionExecution } from "./mission-execution.js";

/**
 * Erro específico para inconsistências
 * no registro de arquivos modificados.
 */
export class InvalidAffectedFileRegistrationError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidAffectedFileRegistrationError";
  }
}

/**
 * Registra um arquivo como fisicamente afetado
 * por uma Create Action concluída com sucesso.
 *
 * A função não modifica o filesystem.
 * Ela registra apenas a evidência da mutação.
 */
export function registerAffectedFile(
  execution: MissionExecution,
  actionId: string,
): MissionExecution {
  if (execution.status !== "executing") {
    throw new InvalidAffectedFileRegistrationError(
      `Arquivos afetados só podem ser registrados durante uma execução ativa. Status atual: ${execution.status}.`,
    );
  }

  const action = execution.actions.find(
    (registeredAction) => registeredAction.id === actionId,
  );

  if (action === undefined) {
    throw new InvalidAffectedFileRegistrationError(
      `A ação "${actionId}" não está registrada nesta execução.`,
    );
  }

  /**
   * Nesta fase somente CREATE possui
   * autorização para modificar arquivos.
   */
  if (action.type !== "create") {
    throw new InvalidAffectedFileRegistrationError(
      "Somente uma Create Action pode registrar arquivos afetados nesta versão.",
    );
  }

  /**
   * A mutação só pode ser registrada depois
   * de existir uma evidência operacional success.
   */
  const successfulResult = execution.results.find(
    (result) => result.actionId === action.id && result.status === "success",
  );

  if (successfulResult === undefined) {
    throw new InvalidAffectedFileRegistrationError(
      "O arquivo só pode ser registrado após uma Create Action concluída com sucesso.",
    );
  }

  if (execution.affectedFiles.includes(action.target)) {
    throw new InvalidAffectedFileRegistrationError(
      `O arquivo "${action.target}" já está registrado como afetado.`,
    );
  }

  return {
    ...execution,

    affectedFiles: [...execution.affectedFiles, action.target],
  };
}
