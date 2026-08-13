import { runRepositoryMissionWorkflow } from "../../application/repository-mission-workflow.js";

import { createFileExecutionAction } from "../../execution/create-file-execution-action.js";

import { createReadExecutionAction } from "../../execution/create-read-execution-action.js";

import type { ExecutionActionResult } from "../../execution/mission-execution.js";

/**
 * Operação READ aceita pela interface `vera run`.
 */
export interface RunReadRequest {
  type: "read";
  target: string;
  jsonOutput: boolean;
}

/**
 * Operação CREATE aceita pela interface `vera run`.
 */
export interface RunCreateRequest {
  type: "create";
  target: string;
  content: string;
  jsonOutput: boolean;
}

/**
 * Conjunto de operações atualmente expostas
 * pela CLI através do workflow completo.
 *
 * UPDATE, DELETE e COMMAND permanecem
 * deliberadamente indisponíveis.
 */
export type RunCommandRequest = RunReadRequest | RunCreateRequest;

/**
 * Erro específico para argumentos inválidos
 * fornecidos ao comando `vera run`.
 */
export class InvalidRunCommandArgumentsError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = "InvalidRunCommandArgumentsError";
  }
}

/**
 * Indica se `--json` foi solicitado na posição
 * oficialmente suportada pela gramática da CLI.
 *
 * Nesta etapa a opção deve ser sempre o último
 * argumento do comando.
 */
function hasJsonOutputOption(args: readonly string[]): boolean {
  return args.length > 0 && args.at(-1) === "--json";
}

/**
 * Remove a opção terminal `--json` antes
 * da interpretação da operação.
 */
function removeJsonOutputOption(args: readonly string[]): readonly string[] {
  if (!hasJsonOutputOption(args)) {
    return args;
  }

  return args.slice(0, -1);
}

/**
 * Valida um target informado pela CLI.
 */
function normalizeTarget(target: string | undefined): string {
  const normalizedTarget = target?.trim() ?? "";

  if (normalizedTarget.length === 0) {
    throw new InvalidRunCommandArgumentsError(
      "Nenhum arquivo alvo foi informado.",
    );
  }

  return normalizedTarget;
}

/**
 * Interpreta os argumentos recebidos após:
 *
 * vera run
 *
 * Exemplos:
 *
 * vera run read package.json
 *
 * vera run read package.json --json
 *
 * vera run create health.ts --content "export {};"
 *
 * vera run create health.ts --content "export {};" --json
 *
 * Esta função permanece pura:
 *
 * - não acessa filesystem;
 * - não executa missões;
 * - não modifica process.exitCode;
 * - apenas converte argumentos em contrato tipado.
 */
export function parseRunCommandArguments(
  args: readonly string[],
): RunCommandRequest {
  const jsonOutput = hasJsonOutputOption(args);

  const operationArguments = removeJsonOutputOption(args);

  const [operation, rawTarget, ...remainingArguments] = operationArguments;

  if (operation === undefined) {
    throw new InvalidRunCommandArgumentsError(
      "Nenhuma operação foi informada para o comando run.",
    );
  }

  switch (operation) {
    case "read": {
      const target = normalizeTarget(rawTarget);

      /**
       * READ aceita:
       *
       * vera run read <target>
       *
       * ou:
       *
       * vera run read <target> --json
       */
      if (remainingArguments.length > 0) {
        throw new InvalidRunCommandArgumentsError(
          "A operação read aceita somente o arquivo alvo e a opção terminal --json. Exemplo: vera run read package.json --json",
        );
      }

      return {
        type: "read",

        target,

        jsonOutput,
      };
    }

    case "create": {
      const target = normalizeTarget(rawTarget);

      /**
       * Sintaxe suportada:
       *
       * vera run create <target> --content <content>
       *
       * opcionalmente:
       *
       * vera run create <target> --content <content> --json
       */
      if (remainingArguments.length === 0) {
        throw new InvalidRunCommandArgumentsError(
          'A operação create exige a opção --content. Exemplo: vera run create health.ts --content "export {};"',
        );
      }

      const [contentOption, content, ...unexpectedArguments] =
        remainingArguments;

      if (contentOption !== "--content") {
        throw new InvalidRunCommandArgumentsError(
          `Opção desconhecida para create: "${contentOption ?? ""}".`,
        );
      }

      /**
       * Diferenciamos:
       *
       * --content ausente → inválido
       * --content ""      → válido
       */
      if (content === undefined) {
        throw new InvalidRunCommandArgumentsError(
          "A opção --content foi informada sem um conteúdo correspondente.",
        );
      }

      if (unexpectedArguments.length > 0) {
        throw new InvalidRunCommandArgumentsError(
          "Foram informados argumentos adicionais após o conteúdo do arquivo.",
        );
      }

      return {
        type: "create",

        target,

        content,

        jsonOutput,
      };
    }

    default:
      throw new InvalidRunCommandArgumentsError(
        `Operação desconhecida para run: "${operation}".`,
      );
  }
}

/**
 * Procura conteúdo textual produzido por
 * uma Read Action concluída.
 */
function findReadContent(
  results: readonly ExecutionActionResult[],
): string | null {
  for (const result of results) {
    if ("content" in result && typeof result.content === "string") {
      return result.content;
    }
  }

  return null;
}

/**
 * Procura a quantidade de bytes registrada
 * por uma Create Action concluída.
 */
function findBytesWritten(
  results: readonly ExecutionActionResult[],
): number | null {
  for (const result of results) {
    if ("bytesWritten" in result && typeof result.bytesWritten === "number") {
      return result.bytesWritten;
    }
  }

  return null;
}

/**
 * Cria um requisito determinístico para
 * alimentar a Mission/Planning Workflow.
 *
 * Nesta fase ainda não existe IA interpretando
 * linguagem natural para gerar ações.
 */
function createRequirement(request: RunCommandRequest): string {
  switch (request.type) {
    case "read":
      return `Ler o arquivo "${request.target}" sem modificá-lo.`;

    case "create":
      return `Criar o arquivo "${request.target}" sem sobrescrever arquivos existentes.`;
  }
}

/**
 * Executa o comando:
 *
 * vera run
 *
 * Toda operação atravessa:
 *
 * Application Workflow
 * → Mission
 * → Plan
 * → Authorization
 * → Execution
 * → Evidence
 * → Verification.
 */
export async function runRunCommand(
  args: readonly string[] = [],
  currentDirectory: string = process.cwd(),
): Promise<void> {
  let request: RunCommandRequest;

  const jsonOutputRequested = hasJsonOutputOption(args);

  /**
   * Primeiro validamos exclusivamente
   * a interface da CLI.
   */
  try {
    request = parseRunCommandArguments(args);
  } catch (error: unknown) {
    if (error instanceof InvalidRunCommandArgumentsError) {
      if (jsonOutputRequested) {
        console.log(
          JSON.stringify(
            {
              command: "run",

              status: "error",

              error: error.message,
            },
            null,
            2,
          ),
        );

        process.exitCode = 1;
        return;
      }

      console.error(`[ERROR] ${error.message}`);

      console.error('Use "vera help" para consultar a sintaxe disponível.');

      process.exitCode = 1;
      return;
    }

    if (jsonOutputRequested) {
      console.log(
        JSON.stringify(
          {
            command: "run",

            status: "error",

            error: "Não foi possível interpretar o comando run.",
          },
          null,
          2,
        ),
      );

      process.exitCode = 1;
      return;
    }

    console.error("[ERROR] Não foi possível interpretar o comando run.");

    process.exitCode = 1;
    return;
  }

  /**
   * No modo humano mostramos o início
   * da missão antes da execução.
   *
   * Em JSON stdout precisa permanecer puro.
   */
  if (!request.jsonOutput) {
    console.log("");
    console.log("[MISSION] Iniciando workflow completo...");
    console.log("");

    console.log(`Operação: ${request.type.toUpperCase()}`);

    console.log(`Alvo:     ${request.target}`);

    console.log("");
  }

  try {
    const requirement = createRequirement(request);

    const result = await runRepositoryMissionWorkflow(
      currentDirectory,
      requirement,
      (executionId) => {
        switch (request.type) {
          case "read":
            return [createReadExecutionAction(executionId, 1, request.target)];

          case "create":
            return [
              createFileExecutionAction(
                executionId,
                1,
                request.target,
                request.content,
              ),
            ];
        }
      },
    );

    /**
     * Falha operacional.
     *
     * Nesse cenário EXECUTE já encerrou
     * formalmente a Mission em failed.
     */
    if (result.mission.status === "failed") {
      const failureResult = result.execution.results.find(
        (executionResult) => executionResult.status === "failure",
      );

      const failureMessage =
        failureResult?.message ?? "A missão não pôde ser concluída.";

      if (request.jsonOutput) {
        console.log(
          JSON.stringify(
            {
              command: "run",

              operation: request.type,

              target: request.target,

              status: "failed",

              mission: {
                id: result.mission.id,

                status: result.mission.status,
              },

              plan: {
                status: result.plan.status,
              },

              execution: {
                id: result.execution.id,

                status: result.execution.status,

                affectedFiles: result.execution.affectedFiles,
              },

              verification: null,

              error: failureMessage,
            },
            null,
            2,
          ),
        );

        process.exitCode = 1;
        return;
      }

      console.log(`[MISSION] ID: ${result.mission.id}`);

      console.log(`[PLAN] Status: ${result.plan.status}`);

      console.log(`[EXECUTE] Status: ${result.execution.status}`);

      console.error("");
      console.error("[FAILED] A missão não pôde ser concluída.");

      console.error(`[EVIDENCE] ${failureMessage}`);

      process.exitCode = 1;
      return;
    }

    /**
     * Uma missão não-failed precisa possuir
     * evidência formal de VERIFY.
     */
    if (result.verification === null) {
      if (request.jsonOutput) {
        console.log(
          JSON.stringify(
            {
              command: "run",

              operation: request.type,

              target: request.target,

              status: "error",

              mission: {
                id: result.mission.id,

                status: result.mission.status,
              },

              execution: {
                id: result.execution.id,

                status: result.execution.status,
              },

              verification: null,

              error: "A missão terminou sem evidência de verificação.",
            },
            null,
            2,
          ),
        );

        process.exitCode = 1;
        return;
      }

      console.error("");
      console.error("[ERROR] A missão terminou sem evidência de verificação.");

      process.exitCode = 1;
      return;
    }

    /**
     * Saída estruturada para automações.
     */
    if (request.jsonOutput) {
      switch (request.type) {
        case "read": {
          console.log(
            JSON.stringify(
              {
                command: "run",

                operation: request.type,

                target: request.target,

                status: "completed",

                mission: {
                  id: result.mission.id,

                  status: result.mission.status,
                },

                plan: {
                  status: result.plan.status,
                },

                execution: {
                  id: result.execution.id,

                  status: result.execution.status,

                  affectedFiles: result.execution.affectedFiles,
                },

                verification: {
                  status: result.verification.status,
                },

                result: {
                  content: findReadContent(result.execution.results),
                },
              },
              null,
              2,
            ),
          );

          return;
        }

        case "create": {
          console.log(
            JSON.stringify(
              {
                command: "run",

                operation: request.type,

                target: request.target,

                status: "completed",

                mission: {
                  id: result.mission.id,

                  status: result.mission.status,
                },

                plan: {
                  status: result.plan.status,
                },

                execution: {
                  id: result.execution.id,

                  status: result.execution.status,

                  affectedFiles: result.execution.affectedFiles,
                },

                verification: {
                  status: result.verification.status,
                },

                result: {
                  bytesWritten: findBytesWritten(result.execution.results),
                },
              },
              null,
              2,
            ),
          );

          return;
        }
      }
    }

    /**
     * A partir daqui temos somente
     * apresentação destinada ao usuário humano.
     */
    console.log(`[MISSION] ID: ${result.mission.id}`);

    console.log(`[PLAN] Status: ${result.plan.status}`);

    console.log(`[EXECUTE] Status: ${result.execution.status}`);

    console.log(`[VERIFY] Status: ${result.verification.status}`);

    if (request.type === "read") {
      const content = findReadContent(result.execution.results);

      if (content !== null) {
        console.log("");
        console.log("[OUTPUT]");
        console.log(content);
      }
    }

    if (request.type === "create") {
      const bytesWritten = findBytesWritten(result.execution.results);

      console.log("");

      console.log(`[WRITE] Arquivo criado: ${request.target}`);

      if (bytesWritten !== null) {
        console.log(`[WRITE] Bytes gravados: ${bytesWritten}`);
      }
    }

    console.log("");
    console.log("[COMPLETED] Missão concluída com sucesso.");
    console.log("");
  } catch (error: unknown) {
    /**
     * Diretório sem package.json.
     */
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      if (request.jsonOutput) {
        console.log(
          JSON.stringify(
            {
              command: "run",

              operation: request.type,

              target: request.target,

              status: "error",

              error: "package.json não encontrado.",

              directory: currentDirectory,
            },
            null,
            2,
          ),
        );

        process.exitCode = 1;
        return;
      }

      console.error("[ERROR] package.json não encontrado.");

      console.error(`Diretório analisado: ${currentDirectory}`);

      process.exitCode = 1;
      return;
    }

    /**
     * package.json inválido.
     */
    if (error instanceof SyntaxError) {
      if (request.jsonOutput) {
        console.log(
          JSON.stringify(
            {
              command: "run",

              operation: request.type,

              target: request.target,

              status: "error",

              error: "package.json contém JSON inválido.",
            },
            null,
            2,
          ),
        );

        process.exitCode = 1;
        return;
      }

      console.error("[ERROR] package.json contém JSON inválido.");

      process.exitCode = 1;
      return;
    }

    /**
     * Fallback para falhas estruturais
     * não previstas.
     */
    if (request.jsonOutput) {
      console.log(
        JSON.stringify(
          {
            command: "run",

            operation: request.type,

            target: request.target,

            status: "error",

            error: "Não foi possível executar a missão.",
          },
          null,
          2,
        ),
      );

      process.exitCode = 1;
      return;
    }

    console.error("[ERROR] Não foi possível executar a missão.");

    process.exitCode = 1;
  }
}
