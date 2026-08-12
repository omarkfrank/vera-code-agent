import type {
  ExecutionAction,
  ExecutionActionType,
  MissionExecution,
} from "./mission-execution.js";

/**
 * Tipos de operação atualmente autorizados
 * pela política de execução da VERA.
 *
 * O contrato conhece ações futuras como create,
 * update, delete e command, porém elas ainda
 * não possuem autorização operacional.
 */
const AUTHORIZED_ACTION_TYPES: ReadonlySet<ExecutionActionType> = new Set([
  "read",
]);

/**
 * Erro específico para tentativas inválidas
 * de registrar uma ação em uma execução.
 */
export class InvalidExecutionActionRegistrationError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidExecutionActionRegistrationError";
  }
}

/**
 * Registra uma ação dentro de uma MissionExecution.
 *
 * A operação é imutável:
 *
 * - a execução original não é alterada;
 * - um novo objeto MissionExecution é retornado;
 * - o array original de ações também é preservado.
 *
 * Regras atuais:
 *
 * - a ação deve pertencer à execução;
 * - o tipo da ação precisa estar autorizado;
 * - ID da ação deve ser válido e não duplicado;
 * - ordem deve ser inteira positiva e não duplicada;
 * - Read Actions precisam possuir alvo;
 * - nenhuma ação é executada neste momento.
 *
 * @param execution Execução que receberá a ação.
 * @param action Ação previamente preparada.
 */
export function addExecutionAction(
  execution: MissionExecution,
  action: ExecutionAction,
): MissionExecution {
  /**
   * Impede que uma ação preparada para outra
   * execução seja reutilizada indevidamente.
   */
  if (action.executionId !== execution.id) {
    throw new InvalidExecutionActionRegistrationError(
      "A ação informada não pertence a esta execução.",
    );
  }

  /**
   * Mesmo que o tipo exista no contrato,
   * ele precisa também estar autorizado.
   *
   * Atualmente somente `read` está liberado.
   */
  if (!AUTHORIZED_ACTION_TYPES.has(action.type)) {
    throw new InvalidExecutionActionRegistrationError(
      `A ação do tipo "${action.type}" ainda não está autorizada para execução.`,
    );
  }

  /**
   * Fazemos validação defensiva mesmo quando
   * a ação foi produzida por uma fábrica.
   *
   * Isso protege a função contra objetos
   * criados manualmente por outras camadas.
   */
  if (action.id.trim().length === 0) {
    throw new InvalidExecutionActionRegistrationError(
      "A ação precisa possuir um identificador válido.",
    );
  }

  if (!Number.isInteger(action.order) || action.order < 1) {
    throw new InvalidExecutionActionRegistrationError(
      "A ordem da ação deve ser um número inteiro maior ou igual a 1.",
    );
  }

  /**
   * Uma Read Action precisa obrigatoriamente
   * possuir um alvo textual válido.
   */
  if (
    action.type === "read" &&
    (action.target === null || action.target.trim().length === 0)
  ) {
    throw new InvalidExecutionActionRegistrationError(
      "A ação de leitura precisa possuir um alvo válido.",
    );
  }

  /**
   * IDs duplicados prejudicariam a associação
   * futura entre ações e resultados.
   */
  const duplicateId = execution.actions.some(
    (registeredAction) => registeredAction.id === action.id,
  );

  if (duplicateId) {
    throw new InvalidExecutionActionRegistrationError(
      `Já existe uma ação registrada com o ID "${action.id}".`,
    );
  }

  /**
   * Cada posição operacional deve ser ocupada
   * por apenas uma ação.
   */
  const duplicateOrder = execution.actions.some(
    (registeredAction) => registeredAction.order === action.order,
  );

  if (duplicateOrder) {
    throw new InvalidExecutionActionRegistrationError(
      `Já existe uma ação registrada na ordem ${action.order}.`,
    );
  }

  /**
   * Retornamos uma nova execução.
   *
   * affectedFiles e results permanecem intactos,
   * pois registrar uma ação ainda não significa
   * executá-la.
   */
  return {
    ...execution,

    actions: [...execution.actions, action],
  };
}
