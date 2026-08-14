import { randomUUID } from "node:crypto";

import type { ActionProposal } from "./action-proposal.js";

import type { ProposedAction } from "./proposed-action.js";

/**
 * Erro utilizado quando o envelope
 * de uma ActionProposal é inválido.
 */
export class InvalidActionProposalError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidActionProposalError";
  }
}

/**
 * Valida defensivamente uma ação recebida
 * pela fábrica da proposta.
 *
 * Mesmo que TypeScript ofereça segurança
 * estática, futuras fontes externas — como
 * modelos de IA — poderão produzir dados
 * em runtime.
 */
function validateAction(action: ProposedAction): void {
  if (!Number.isInteger(action.order) || action.order <= 0) {
    throw new InvalidActionProposalError(
      "Todas as ações propostas devem possuir uma ordem inteira positiva.",
    );
  }

  if (typeof action.target !== "string" || action.target.trim().length === 0) {
    throw new InvalidActionProposalError(
      "Todas as ações propostas devem possuir um arquivo alvo válido.",
    );
  }

  switch (action.type) {
    case "read":
      return;

    case "create":
      if (typeof action.content !== "string") {
        throw new InvalidActionProposalError(
          "A ação CREATE proposta precisa possuir conteúdo textual.",
        );
      }

      return;
  }
}

/**
 * Cria uma ActionProposal associada
 * a uma missão existente.
 *
 * A fábrica:
 *
 * - valida o vínculo com a missão;
 * - exige ao menos uma ação;
 * - rejeita ordens duplicadas;
 * - ordena deterministicamente as ações;
 * - não modifica o array original;
 * - não executa nenhuma operação.
 */
export function createActionProposal(
  missionId: string,
  actions: readonly ProposedAction[],
): ActionProposal {
  if (typeof missionId !== "string" || missionId.trim().length === 0) {
    throw new InvalidActionProposalError(
      "A proposta precisa estar associada a uma missão válida.",
    );
  }

  if (actions.length === 0) {
    throw new InvalidActionProposalError(
      "A proposta precisa possuir ao menos uma ação.",
    );
  }

  for (const action of actions) {
    validateAction(action);
  }

  const usedOrders = new Set<number>();

  for (const action of actions) {
    if (usedOrders.has(action.order)) {
      throw new InvalidActionProposalError(
        `A ordem ${action.order} está duplicada na proposta.`,
      );
    }

    usedOrders.add(action.order);
  }

  /**
   * Copiamos e ordenamos as ações.
   *
   * Assim a entrada original permanece
   * intocada e o resultado se torna
   * deterministicamente ordenado.
   */
  const orderedActions = [...actions]
    .sort((firstAction, secondAction) => firstAction.order - secondAction.order)
    .map((action) => ({
      ...action,
    }));

  return {
    id: randomUUID(),

    missionId: missionId.trim(),

    status: "proposed",

    createdAt: new Date().toISOString(),

    actions: orderedActions,
  };
}
