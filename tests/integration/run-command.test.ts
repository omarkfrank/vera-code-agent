import assert from "node:assert/strict";

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";

import { tmpdir } from "node:os";

import { join } from "node:path";

import { describe, it } from "node:test";

import { runRunCommand } from "../../src/cli/commands/run-command.js";

/**
 * Resultado capturado da interface CLI.
 */
interface CapturedCliOutput {
  stdout: string[];
  stderr: string[];
  exitCode: number | string | undefined;
}

/**
 * Cria um repositório temporário mínimo
 * reconhecido pelo RepositoryInspector.
 */
async function createTemporaryRepository(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "vera-run-command-"));

  await writeFile(
    join(directory, "package.json"),
    JSON.stringify(
      {
        name: "vera-run-command-fixture",

        version: "1.0.0",

        type: "module",
      },
      null,
      2,
    ),
    "utf8",
  );

  return directory;
}

/**
 * Captura stdout, stderr e exitCode sem
 * depender de um processo externo.
 *
 * O estado global é restaurado ao final
 * de cada execução.
 */
async function captureCliOutput(
  action: () => Promise<void>,
): Promise<CapturedCliOutput> {
  const stdout: string[] = [];

  const stderr: string[] = [];

  const originalLog = console.log;

  const originalError = console.error;

  const originalExitCode = process.exitCode;

  process.exitCode = undefined;

  console.log = (...data: unknown[]): void => {
    stdout.push(data.map((value) => String(value)).join(" "));
  };

  console.error = (...data: unknown[]): void => {
    stderr.push(data.map((value) => String(value)).join(" "));
  };

  try {
    await action();

    return {
      stdout,

      stderr,

      exitCode: process.exitCode,
    };
  } finally {
    console.log = originalLog;

    console.error = originalError;

    process.exitCode = originalExitCode;
  }
}

describe("Run Command", () => {
  it("deve executar READ pelo workflow completo", async () => {
    const directory = await createTemporaryRepository();

    try {
      const output = await captureCliOutput(async () => {
        await runRunCommand(["read", "package.json"], directory);
      });

      const stdout = output.stdout.join("\n");

      assert.notEqual(output.exitCode, 1);

      assert.match(stdout, /\[PLAN\] Status: planned/);

      assert.match(stdout, /\[EXECUTE\] Status: completed/);

      assert.match(stdout, /\[VERIFY\] Status: passed/);

      assert.match(stdout, /\[OUTPUT\]/);

      assert.match(stdout, /vera-run-command-fixture/);

      assert.match(stdout, /\[COMPLETED\]/);
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve executar CREATE pelo workflow completo", async () => {
    const directory = await createTemporaryRepository();

    try {
      const output = await captureCliOutput(async () => {
        await runRunCommand(
          ["create", "health.ts", "--content", 'export const health = "ok";\n'],
          directory,
        );
      });

      const stdout = output.stdout.join("\n");

      assert.notEqual(output.exitCode, 1);

      assert.match(stdout, /\[VERIFY\] Status: passed/);

      assert.match(stdout, /\[WRITE\] Arquivo criado: health\.ts/);

      assert.match(stdout, /\[COMPLETED\]/);

      assert.equal(
        await readFile(join(directory, "health.ts"), "utf8"),
        'export const health = "ok";\n',
      );
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve criar arquivo textual vazio", async () => {
    const directory = await createTemporaryRepository();

    try {
      const output = await captureCliOutput(async () => {
        await runRunCommand(
          ["create", "empty.txt", "--content", ""],
          directory,
        );
      });

      assert.notEqual(output.exitCode, 1);

      assert.equal(await readFile(join(directory, "empty.txt"), "utf8"), "");
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve reportar conflito sem sobrescrever arquivo existente", async () => {
    const directory = await createTemporaryRepository();

    try {
      const target = join(directory, "existing.ts");

      await writeFile(target, "conteúdo original", "utf8");

      const output = await captureCliOutput(async () => {
        await runRunCommand(
          ["create", "existing.ts", "--content", "novo conteúdo"],
          directory,
        );
      });

      assert.equal(output.exitCode, 1);

      assert.match(output.stderr.join("\n"), /\[FAILED\]/);

      assert.match(output.stderr.join("\n"), /não pode ser sobrescrito/);

      assert.equal(await readFile(target, "utf8"), "conteúdo original");
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve rejeitar operação não autorizada pela CLI", async () => {
    const directory = await createTemporaryRepository();

    try {
      const output = await captureCliOutput(async () => {
        await runRunCommand(["delete", "package.json"], directory);
      });

      assert.equal(output.exitCode, 1);

      assert.match(output.stderr.join("\n"), /Operação desconhecida/);

      /**
       * O arquivo continua existindo,
       * comprovando ausência de mutação.
       */
      const manifest = await readFile(join(directory, "package.json"), "utf8");

      assert.match(manifest, /vera-run-command-fixture/);
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });
});
