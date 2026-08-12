import { readFile, stat } from "node:fs/promises";

import type {
  ExecutionAction,
  ReadExecutionActionResult,
} from "./mission-execution.js";

import { resolveProtectedRepositoryPath } from "./repository-path.js";

/**
 * Limite máximo inicial permitido
 * para leitura textual.
 *
 * 1 MiB.
 */
export const MAX_READ_FILE_SIZE_BYTES = 1024 * 1024;

/**
 * Erro utilizado quando a operação recebida
 * não representa uma Read Action válida.
 */
export class InvalidReadExecutionActionError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidReadExecutionActionError";
  }
}

/**
 * Erro relacionado ao recurso que
 * está sendo lido.
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
 * Garantias:
 *
 * - aceita somente `read`;
 * - exige alvo;
 * - respeita a fronteira do repositório;
 * - aceita somente arquivos regulares;
 * - limita tamanho;
 * - rejeita conteúdo aparentemente binário;
 * - nunca modifica o filesystem.
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

  const protectedPath = await resolveProtectedRepositoryPath(
    repositoryRoot,
    action.target,
  );

  const fileStats = await stat(protectedPath);

  if (!fileStats.isFile()) {
    throw new RepositoryReadError(
      "A ação de leitura aceita somente arquivos regulares.",
    );
  }

  if (fileStats.size > MAX_READ_FILE_SIZE_BYTES) {
    throw new RepositoryReadError(
      `O arquivo excede o limite de ${MAX_READ_FILE_SIZE_BYTES} bytes permitido para leitura.`,
    );
  }

  const content = await readFile(protectedPath, "utf-8");

  /**
   * Byte nulo é utilizado como heurística simples
   * para identificar conteúdo aparentemente binário.
   */
  if (content.includes("\u0000")) {
    throw new RepositoryReadError(
      "O arquivo aparenta conter conteúdo binário e não pode ser lido como texto.",
    );
  }

  return {
    executionId: action.executionId,
    actionId: action.id,
    status: "success",
    message: "Arquivo lido com sucesso.",
    target: action.target,
    content,
  };
}
