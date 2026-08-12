import { randomUUID } from "node:crypto";

import type { ExecutionAction } from "./mission-execution.js";

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
 * A função apenas descreve a operação.
 * Nenhum arquivo é acessado neste momento.
 *
 * @param order Ordem da ação na execução.
 * @param target Caminho relativo dentro do repositório.
 */
export function createReadExecutionAction(
  order: number,
  target: string,
): ExecutionAction {
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
    id: randomUUID(),
    order,
    type: "read",
    description: `Ler o arquivo "${normalizedTarget}" sem modificá-lo.`,
    target: normalizedTarget,
  };
}
