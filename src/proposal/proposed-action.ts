/**
 * Tipos de ações que a camada de proposta
 * conhece atualmente.
 *
 * Importante:
 *
 * este contrato NÃO concede autorização
 * para executar essas operações.
 *
 * Ele representa apenas a intenção proposta.
 */
export type ProposedActionType = "read" | "create";

/**
 * Campos compartilhados por qualquer
 * ação proposta pela VERA.
 */
export interface ProposedActionBase {
  /**
   * Ordem lógica sugerida para a ação.
   */
  order: number;

  /**
   * Tipo da operação proposta.
   */
  type: ProposedActionType;

  /**
   * Caminho relativo pretendido dentro
   * do repositório.
   *
   * A proteção real do caminho continuará
   * pertencendo à camada de execução.
   */
  target: string;
}

/**
 * Proposta de leitura.
 *
 * Nenhum acesso ao filesystem ocorre
 * através deste contrato.
 */
export interface ProposedReadAction extends ProposedActionBase {
  type: "read";
}

/**
 * Proposta de criação de arquivo.
 *
 * O conteúdo permanece apenas como dado
 * até que uma futura etapa de materialização
 * produza uma ExecutionAction autorizável.
 */
export interface ProposedCreateAction extends ProposedActionBase {
  type: "create";

  content: string;
}

/**
 * União discriminada de todas as ações
 * atualmente reconhecidas pela camada
 * de proposta.
 */
export type ProposedAction = ProposedReadAction | ProposedCreateAction;
