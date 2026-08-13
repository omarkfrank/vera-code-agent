import assert from "node:assert/strict";

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";

import { tmpdir } from "node:os";

import { join } from "node:path";

import { describe, it } from "node:test";

import { runRepositoryMissionWorkflow } from "../../src/application/repository-mission-workflow.js";

import { createFileExecutionAction } from "../../src/execution/create-file-execution-action.js";

import { createReadExecutionAction } from "../../src/execution/create-read-execution-action.js";

import { InvalidExecutionActionRegistrationError } from "../../src/execution/add-execution-action.js";

/**
 * Cria um repositório temporário mínimo
 * reconhecível pela inspeção da VERA.
 */
async function createTemporaryRepository(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "vera-mission-workflow-"));

  await writeFile(
    join(directory, "package.json"),
    JSON.stringify(
      {
        name: "vera-workflow-fixture",

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

describe("Repository Mission Workflow", () => {
  it("deve concluir ciclo READ completo até completed", async () => {
    const directory = await createTemporaryRepository();

    try {
      const result = await runRepositoryMissionWorkflow(
        directory,
        "Ler package.json com segurança.",
        (executionId) => [
          createReadExecutionAction(executionId, 1, "package.json"),
        ],
      );

      assert.equal(result.mission.status, "completed");

      assert.equal(result.execution.status, "completed");

      assert.equal(result.verification?.status, "passed");

      assert.equal(result.execution.results.length, 1);

      assert.deepEqual(result.execution.affectedFiles, []);

      assert.equal(result.plan.missionId, result.mission.id);

      assert.equal(result.execution.missionId, result.mission.id);
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve concluir ciclo CREATE completo até completed", async () => {
    const directory = await createTemporaryRepository();

    try {
      const result = await runRepositoryMissionWorkflow(
        directory,
        "Criar health.ts sem sobrescrever arquivos.",
        (executionId) => [
          createFileExecutionAction(
            executionId,
            1,
            "health.ts",
            'export const health = "ok";\n',
          ),
        ],
      );

      assert.equal(result.mission.status, "completed");

      assert.equal(result.execution.status, "completed");

      assert.equal(result.verification?.status, "passed");

      assert.deepEqual(result.execution.affectedFiles, ["health.ts"]);

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

  it("deve suportar READ seguido de CREATE no ciclo completo", async () => {
    const directory = await createTemporaryRepository();

    try {
      const result = await runRepositoryMissionWorkflow(
        directory,
        "Inspecionar package.json e criar generated.ts.",
        (executionId) => [
          createReadExecutionAction(executionId, 1, "package.json"),

          createFileExecutionAction(
            executionId,
            2,
            "generated.ts",
            "export {};\n",
          ),
        ],
      );

      assert.equal(result.mission.status, "completed");

      assert.equal(result.execution.results.length, 2);

      assert.deepEqual(result.execution.affectedFiles, ["generated.ts"]);

      assert.equal(result.verification?.status, "passed");
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve preservar failure operacional sem executar VERIFY", async () => {
    const directory = await createTemporaryRepository();

    try {
      await writeFile(
        join(directory, "existing.ts"),
        "conteúdo original",
        "utf8",
      );

      const result = await runRepositoryMissionWorkflow(
        directory,
        "Criar existing.ts.",
        (executionId) => [
          createFileExecutionAction(
            executionId,
            1,
            "existing.ts",
            "novo conteúdo",
          ),
        ],
      );

      assert.equal(result.mission.status, "failed");

      assert.equal(result.execution.status, "failed");

      assert.equal(result.verification, null);

      assert.equal(result.execution.results[0]?.status, "failure");

      assert.deepEqual(result.execution.affectedFiles, []);

      /**
       * A falha não pode alterar
       * o arquivo preexistente.
       */
      assert.equal(
        await readFile(join(directory, "existing.ts"), "utf8"),
        "conteúdo original",
      );
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve rejeitar ação associada a outra execução", async () => {
    const directory = await createTemporaryRepository();

    try {
      await assert.rejects(
        runRepositoryMissionWorkflow(
          directory,
          "Executar ação inválida.",
          () => [
            createReadExecutionAction(
              "foreign-execution-id",
              1,
              "package.json",
            ),
          ],
        ),
        InvalidExecutionActionRegistrationError,
      );
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });
});
