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
}

/**
 * Operação CREATE aceita pela interface `vera run`.
 */
export interface RunCreateRequest {
  type: "create";
  target: string;
  content: string;
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
 * vera run create health.ts --content "export {};"
 *
 * Esta função é deliberadamente pura:
 *
 * - não acessa filesystem;
 * - não executa missões;
 * - não modifica process.exitCode;
 * - apenas converte argumentos em um contrato tipado.
 */
export function parseRunCommandArguments(
  args: readonly string[],
): RunCommandRequest {
  const [operation, rawTarget, ...remainingArguments] = args;

  if (operation === undefined) {
    throw new InvalidRunCommandArgumentsError(
      "Nenhuma operação foi informada para o comando run.",
    );
  }

  switch (operation) {
    case "read": {
      const target = normalizeTarget(rawTarget);

      /**
       * READ possui somente:
       *
       * vera run read <target>
       *
       * Argumentos adicionais são rejeitados
       * para evitar interpretação ambígua.
       */
      if (remainingArguments.length > 0) {
        throw new InvalidRunCommandArgumentsError(
          "A operação read aceita somente o arquivo alvo. Exemplo: vera run read package.json",
        );
      }

      return {
        type: "read",

        target,
      };
    }

    case "create": {
      const target = normalizeTarget(rawTarget);

      /**
       * Sintaxe inicial e explícita:
       *
       * vera run create <target> --content <content>
       *
       * Não utilizamos parsing permissivo nesta fase.
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
       * --content ausente       → inválido
       * --content ""            → válido
       *
       * Portanto não verificamos content.length.
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
 * Importante:
 *
 * esta função NÃO acessa os executores
 * protegidos diretamente.
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

  /**
   * Primeiro validamos exclusivamente
   * a interface da CLI.
   */
  try {
    request = parseRunCommandArguments(args);
  } catch (error: unknown) {
    if (error instanceof InvalidRunCommandArgumentsError) {
      console.error(`[ERROR] ${error.message}`);

      console.error('Use "vera help" para consultar a sintaxe disponível.');

      process.exitCode = 1;
      return;
    }

    console.error("[ERROR] Não foi possível interpretar o comando run.");

    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("[MISSION] Iniciando workflow completo...");
  console.log("");

  console.log(`Operação: ${request.type.toUpperCase()}`);

  console.log(`Alvo:     ${request.target}`);

  console.log("");

  try {
    const requirement = createRequirement(request);

    /**
     * O Application Workflow recebe uma factory.
     *
     * Somente após PREPARE conhecemos o executionId
     * real que obrigatoriamente precisa ser associado
     * à ação.
     */
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

    console.log(`[MISSION] ID: ${result.mission.id}`);

    console.log(`[PLAN] Status: ${result.plan.status}`);

    console.log(`[EXECUTE] Status: ${result.execution.status}`);

    /**
     * Falha operacional.
     *
     * Nesse cenário o Application Workflow
     * corretamente não executa VERIFY.
     */
    if (result.mission.status === "failed") {
      const failureResult = result.execution.results.find(
        (executionResult) => executionResult.status === "failure",
      );

      console.error("");
      console.error("[FAILED] A missão não pôde ser concluída.");

      if (failureResult !== undefined) {
        console.error(`[EVIDENCE] ${failureResult.message}`);
      }

      process.exitCode = 1;
      return;
    }

    /**
     * Uma missão não-failed precisa ter passado
     * formalmente pela Verification Workflow.
     */
    if (result.verification === null) {
      console.error("");
      console.error("[ERROR] A missão terminou sem evidência de verificação.");

      process.exitCode = 1;
      return;
    }

    console.log(`[VERIFY] Status: ${result.verification.status}`);

    /**
     * READ exibe o conteúdo obtido pela própria
     * evidência da Execution Workflow.
     */
    if (request.type === "read") {
      const content = findReadContent(result.execution.results);

      if (content !== null) {
        console.log("");
        console.log("[OUTPUT]");
        console.log(content);
      }
    }

    /**
     * CREATE apresenta a evidência física
     * de gravação produzida pelo executor.
     */
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
     * Mantemos o mesmo padrão dos comandos
     * inspect e plan para repositórios inválidos.
     */
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.error("[ERROR] package.json não encontrado.");

      console.error(`Diretório analisado: ${currentDirectory}`);

      process.exitCode = 1;
      return;
    }

    if (error instanceof SyntaxError) {
      console.error("[ERROR] package.json contém JSON inválido.");

      process.exitCode = 1;
      return;
    }

    /**
     * Não expomos stack trace ou detalhes internos
     * pela interface normal da CLI.
     */
    console.error("[ERROR] Não foi possível executar a missão.");

    process.exitCode = 1;
  }
}
