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
 * A função somente descreve a operação.
 * Nenhum arquivo é acessado neste momento.
 *
 * @param executionId Execução proprietária da ação.
 * @param order Ordem da ação dentro da execução.
 * @param target Caminho relativo dentro do repositório.
 */
export function createReadExecutionAction(
  executionId: string,
  order: number,
  target: string,
): ExecutionAction {
  const normalizedExecutionId = executionId.trim();

  /**
   * Toda ação precisa estar associada
   * explicitamente a uma execução.
   */
  if (normalizedExecutionId.length === 0) {
    throw new InvalidExecutionActionDefinitionError(
      "A ação precisa estar associada a uma execução válida.",
    );
  }

  /**
   * A ordem precisa ser determinística
   * e utilizar valores inteiros positivos.
   */
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
