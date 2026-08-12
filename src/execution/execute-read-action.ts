import { readFile, stat } from "node:fs/promises";

import type {
  ExecutionAction,
  ReadExecutionActionResult,
} from "./mission-execution.js";

import { resolveProtectedRepositoryPath } from "./repository-path.js";

/**
 * Limite inicial de segurança para leitura textual.
 *
 * Um agente de código normalmente precisa compreender
 * código-fonte e arquivos de configuração, não carregar
 * arquivos arbitrariamente grandes em memória.
 *
 * 1 MiB por arquivo é suficiente para esta etapa
 * inicial e poderá futuramente ser configurável.
 */
export const MAX_READ_FILE_SIZE_BYTES = 1024 * 1024;

/**
 * Erro utilizado quando a operação recebida não
 * representa uma Read Action válida.
 */
export class InvalidReadExecutionActionError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidReadExecutionActionError";
  }
}

/**
 * Erro relacionado ao conteúdo ou às propriedades
 * do recurso que está sendo lido.
 */
export class RepositoryReadError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "RepositoryReadError";
  }
}

/**
 * Executa uma ação protegida de leitura.
 *
 * Garantias atuais:
 *
 * - aceita somente ações do tipo `read`;
 * - exige alvo definido;
 * - impede caminhos absolutos;
 * - impede traversal para fora do repositório;
 * - valida o caminho físico real;
 * - aceita somente arquivos regulares;
 * - limita o tamanho máximo da leitura;
 * - rejeita conteúdo aparentemente binário;
 * - não modifica nenhum recurso.
 *
 * @param repositoryRoot Raiz autorizada do repositório.
 * @param action Ação de leitura previamente criada.
 */
export async function executeReadAction(
  repositoryRoot: string,
  action: ExecutionAction,
): Promise<ReadExecutionActionResult> {
  if (action.type !== "read") {
    throw new InvalidReadExecutionActionError(
      `A ação "${action.id}" não é do tipo read.`,
    );
  }

  if (action.target === null) {
    throw new InvalidReadExecutionActionError(
      "A ação de leitura precisa possuir um alvo.",
    );
  }

  /**
   * Esta chamada representa nossa principal
   * fronteira de segurança de filesystem.
   */
  const protectedPath = await resolveProtectedRepositoryPath(
    repositoryRoot,
    action.target,
  );

  const fileStats = await stat(protectedPath);

  /**
   * Diretórios e outros tipos de recurso não
   * fazem parte desta capacidade inicial.
   */
  if (!fileStats.isFile()) {
    throw new RepositoryReadError(
      "A ação de leitura aceita somente arquivos regulares.",
    );
  }

  /**
   * Evitamos carregar arquivos excessivamente
   * grandes durante a análise.
   */
  if (fileStats.size > MAX_READ_FILE_SIZE_BYTES) {
    throw new RepositoryReadError(
      `O arquivo excede o limite de ${MAX_READ_FILE_SIZE_BYTES} bytes permitido para leitura.`,
    );
  }

  /**
   * Nesta fase a VERA trabalha exclusivamente
   * com arquivos textuais UTF-8.
   */
  const content = await readFile(protectedPath, "utf-8");

  /**
   * Bytes nulos são uma heurística simples para
   * evitar tratar arquivos binários como código-fonte.
   */
  if (content.includes("\u0000")) {
    throw new RepositoryReadError(
      "O arquivo aparenta conter conteúdo binário e não pode ser lido como texto.",
    );
  }

  return {
    actionId: action.id,
    status: "success",
    message: "Arquivo lido com sucesso.",
    target: action.target,
    content,
  };
}
