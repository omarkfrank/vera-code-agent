import { writeFile } from "node:fs/promises";

import { Buffer } from "node:buffer";

import type {
  CreateExecutionActionResult,
  ExecutionAction,
} from "./mission-execution.js";

import {
  RepositoryPathViolationError,
  resolveProtectedRepositoryCreationPath,
} from "./repository-path.js";

/**
 * Limite inicial da capacidade CREATE.
 *
 * Assim como na leitura, mantemos arquivos
 * textuais pequenos e previsíveis.
 *
 * 1 MiB.
 */
export const MAX_CREATE_FILE_SIZE_BYTES = 1024 * 1024;

/**
 * Erro utilizado quando a ação recebida
 * não representa um CREATE válido.
 */
export class InvalidCreateExecutionActionError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidCreateExecutionActionError";
  }
}

/**
 * Erro operacional relacionado à criação
 * de um novo arquivo.
 */
export class RepositoryCreateError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "RepositoryCreateError";
  }
}

/**
 * Erro específico para tentativa de sobrescrita.
 */
export class RepositoryCreateConflictError extends RepositoryCreateError {
  public constructor() {
    super("O arquivo alvo já existe e não pode ser sobrescrito.");

    this.name = "RepositoryCreateConflictError";
  }
}

/**
 * Detecta erros de filesystem através
 * do campo padronizado `code`.
 */
function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

/**
 * Executa a criação protegida de um arquivo.
 *
 * Garantias desta primeira versão:
 *
 * - aceita somente ação `create`;
 * - arquivo permanece dentro do repositório;
 * - diretório pai precisa existir;
 * - symlink no diretório pai é validado;
 * - conteúdo é textual;
 * - tamanho máximo de 1 MiB;
 * - overwrite é proibido;
 * - `wx` aplica exclusividade atomicamente.
 */
export async function executeCreateAction(
  repositoryRoot: string,
  action: ExecutionAction,
): Promise<CreateExecutionActionResult> {
  if (action.type !== "create") {
    throw new InvalidCreateExecutionActionError(
      `A ação "${action.id}" não é do tipo create.`,
    );
  }

  if (typeof action.content !== "string") {
    throw new InvalidCreateExecutionActionError(
      "A ação de criação precisa possuir conteúdo textual.",
    );
  }

  /**
   * Nesta fase trabalhamos apenas com
   * arquivos textuais.
   */
  if (action.content.includes("\u0000")) {
    throw new RepositoryCreateError(
      "O conteúdo do arquivo possui bytes nulos e não pode ser gravado como texto.",
    );
  }

  /**
   * Buffer.byteLength mede bytes UTF-8 reais,
   * diferentemente de String.length.
   */
  const contentSize = Buffer.byteLength(action.content, "utf8");

  if (contentSize > MAX_CREATE_FILE_SIZE_BYTES) {
    throw new RepositoryCreateError(
      `O conteúdo excede o limite de ${MAX_CREATE_FILE_SIZE_BYTES} bytes permitido para criação.`,
    );
  }

  let protectedPath: string;

  try {
    protectedPath = await resolveProtectedRepositoryCreationPath(
      repositoryRoot,
      action.target,
    );
  } catch (error: unknown) {
    /**
     * Violações de segurança permanecem
     * com sua classificação original.
     */
    if (error instanceof RepositoryPathViolationError) {
      throw error;
    }

    /**
     * Nesta primeira versão o CREATE não
     * cria diretórios automaticamente.
     */
    if (hasErrorCode(error, "ENOENT")) {
      throw new RepositoryCreateError("O diretório pai do arquivo não existe.");
    }

    throw error;
  }

  try {
    /**
     * `wx` significa:
     *
     * - write;
     * - exclusive creation.
     *
     * Se o destino já existir, o filesystem
     * retorna EEXIST.
     *
     * Isso evita a vulnerabilidade:
     *
     * exists()
     *   ↓
     * outro processo cria arquivo
     *   ↓
     * writeFile() sobrescreve
     *
     * conhecida como TOCTOU.
     */
    await writeFile(protectedPath, action.content, {
      encoding: "utf8",

      flag: "wx",
    });
  } catch (error: unknown) {
    if (hasErrorCode(error, "EEXIST")) {
      throw new RepositoryCreateConflictError();
    }

    throw new RepositoryCreateError(
      "Não foi possível criar o arquivo solicitado.",
    );
  }

  return {
    executionId: action.executionId,

    actionId: action.id,

    status: "success",

    message: "Arquivo criado com sucesso.",

    target: action.target,

    bytesWritten: contentSize,
  };
}
