import { randomUUID } from "node:crypto";

import type { ReadExecutionAction } from "./mission-execution.js";

/**
 * Erro utilizado quando uma ação possui
 * uma definição estrutural inválida.
 */
export class InvalidExecutionActionDefinitionError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidExecutionActionDefinitionError";
  }
}

/**
 * Cria uma ação protegida de leitura.
 *
 * A função somente descreve a operação.
 * Nenhum arquivo é acessado neste momento.
 */
export function createReadExecutionAction(
  executionId: string,
  order: number,
  target: string,
): ReadExecutionAction {
  const normalizedExecutionId = executionId.trim();

  if (normalizedExecutionId.length === 0) {
    throw new InvalidExecutionActionDefinitionError(
      "A ação precisa estar associada a uma execução válida.",
    );
  }

  if (!Number.isInteger(order) || order < 1) {
    throw new InvalidExecutionActionDefinitionError(
      "A ordem da ação deve ser um número inteiro maior ou igual a 1.",
    );
  }

  const normalizedTarget = target.trim();

  if (normalizedTarget.length === 0) {
    throw new InvalidExecutionActionDefinitionError(
      "O alvo da ação de leitura não pode estar vazio.",
    );
  }

  return {
    executionId: normalizedExecutionId,

    id: randomUUID(),

    order,

    type: "read",

    description: `Ler o arquivo "${normalizedTarget}" sem modificá-lo.`,

    target: normalizedTarget,
  };
}
