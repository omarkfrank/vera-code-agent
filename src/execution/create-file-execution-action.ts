import { randomUUID } from "node:crypto";

import type { CreateExecutionAction } from "./mission-execution.js";

/**
 * Erro utilizado quando a definição
 * de uma Create Action é inválida.
 */
export class InvalidCreateExecutionActionDefinitionError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidCreateExecutionActionDefinitionError";
  }
}

/**
 * Descreve uma operação de criação de arquivo.
 *
 * Esta função NÃO escreve no filesystem.
 *
 * Ela apenas cria o contrato operacional que
 * poderá posteriormente ser submetido às
 * políticas e ao executor da VERA.
 */
export function createFileExecutionAction(
  executionId: string,
  order: number,
  target: string,
  content: string,
): CreateExecutionAction {
  const normalizedExecutionId = executionId.trim();

  if (normalizedExecutionId.length === 0) {
    throw new InvalidCreateExecutionActionDefinitionError(
      "A ação precisa estar associada a uma execução válida.",
    );
  }

  if (!Number.isInteger(order) || order < 1) {
    throw new InvalidCreateExecutionActionDefinitionError(
      "A ordem da ação deve ser um número inteiro maior ou igual a 1.",
    );
  }

  const normalizedTarget = target.trim();

  if (normalizedTarget.length === 0) {
    throw new InvalidCreateExecutionActionDefinitionError(
      "O alvo da ação de criação não pode estar vazio.",
    );
  }

  /**
   * Validação defensiva para chamadas JavaScript
   * ou outras fronteiras que possam contornar
   * a tipagem TypeScript.
   */
  if (typeof content !== "string") {
    throw new InvalidCreateExecutionActionDefinitionError(
      "O conteúdo do arquivo precisa ser textual.",
    );
  }

  return {
    executionId: normalizedExecutionId,

    id: randomUUID(),

    order,

    type: "create",

    description: `Criar o novo arquivo "${normalizedTarget}" sem sobrescrever recursos existentes.`,

    target: normalizedTarget,

    content,
  };
}
