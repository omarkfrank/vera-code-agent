import type {
  ProposedCreateAction,
  ProposedReadAction,
} from "./proposed-action.js";

/**
 * Erro utilizado quando uma ação proposta
 * possui uma definição estrutural inválida.
 *
 * Uma proposta inválida nunca deve alcançar
 * a futura etapa de materialização.
 */
export class InvalidProposedActionError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidProposedActionError";
  }
}

/**
 * Valida e normaliza a ordem declarada
 * para uma ProposedAction.
 */
function validateOrder(order: number): number {
  if (!Number.isInteger(order) || order <= 0) {
    throw new InvalidProposedActionError(
      "A ordem da ação proposta deve ser um número inteiro positivo.",
    );
  }

  return order;
}

/**
 * Valida e normaliza o caminho informado
 * para uma ação proposta.
 *
 * Esta validação trata apenas integridade
 * básica do contrato.
 *
 * Regras de segurança como:
 *
 * - traversal;
 * - caminhos absolutos;
 * - symlinks;
 * - Alternate Data Streams;
 *
 * continuam pertencendo à camada protegida
 * de execução.
 */
function normalizeTarget(target: string): string {
  if (typeof target !== "string") {
    throw new InvalidProposedActionError(
      "O arquivo alvo da ação proposta deve ser textual.",
    );
  }

  const normalizedTarget = target.trim();

  if (normalizedTarget.length === 0) {
    throw new InvalidProposedActionError(
      "A ação proposta precisa informar um arquivo alvo.",
    );
  }

  return normalizedTarget;
}

/**
 * Cria uma proposta estrutural de READ.
 *
 * Nenhuma operação real é executada.
 */
export function createReadProposedAction(
  order: number,
  target: string,
): ProposedReadAction {
  return {
    order: validateOrder(order),

    type: "read",

    target: normalizeTarget(target),
  };
}

/**
 * Cria uma proposta estrutural de CREATE.
 *
 * Conteúdo vazio continua sendo válido.
 *
 * A existência do arquivo, limite de tamanho,
 * byte nulo e demais políticas somente serão
 * avaliados posteriormente pelas camadas
 * responsáveis.
 */
export function createCreateProposedAction(
  order: number,
  target: string,
  content: string,
): ProposedCreateAction {
  if (typeof content !== "string") {
    throw new InvalidProposedActionError(
      "O conteúdo da ação CREATE proposta deve ser textual.",
    );
  }

  return {
    order: validateOrder(order),

    type: "create",

    target: normalizeTarget(target),

    content,
  };
}
