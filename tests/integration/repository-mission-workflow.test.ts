import assert from "node:assert/strict";

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";

import { tmpdir } from "node:os";

import { join } from "node:path";

import { describe, it } from "node:test";

import {
  runRepositoryMissionWorkflow,
  runRepositoryMissionWorkflowFromProposal,
} from "../../src/application/repository-mission-workflow.js";

import { InvalidExecutionActionRegistrationError } from "../../src/execution/add-execution-action.js";

import { createFileExecutionAction } from "../../src/execution/create-file-execution-action.js";

import { createReadExecutionAction } from "../../src/execution/create-read-execution-action.js";

import type { ActionProposalProvider } from "../../src/proposal/action-proposal-provider.js";

import { createActionProposal } from "../../src/proposal/create-action-proposal.js";

import { createReadProposedAction } from "../../src/proposal/create-proposed-action.js";

import { DeterministicActionProposalProvider } from "../../src/proposal/deterministic-action-proposal-provider.js";

import { InvalidProposalMaterializationError } from "../../src/proposal/proposal-materializer.js";

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
  /**
   * =========================================================
   * FLUXO ORIGINAL — MissionActionFactory
   * =========================================================
   *
   * Estes testes permanecem para comprovar
   * retrocompatibilidade.
   */

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

  /**
   * =========================================================
   * NOVO FLUXO — ActionProposalProvider
   * =========================================================
   */

  it("deve concluir ciclo READ orientado por proposta", async () => {
    const directory = await createTemporaryRepository();

    try {
      const provider = new DeterministicActionProposalProvider();

      const result = await runRepositoryMissionWorkflowFromProposal(
        directory,
        "Ler package.json através de uma proposta.",
        provider,
        {
          operations: [
            {
              type: "read",

              target: "package.json",
            },
          ],
        },
      );

      assert.equal(result.proposal.status, "proposed");

      assert.equal(result.proposal.missionId, result.mission.id);

      assert.equal(result.mission.status, "completed");

      assert.equal(result.execution.status, "completed");

      assert.equal(result.verification?.status, "passed");

      assert.equal(result.execution.results.length, 1);

      assert.equal(result.execution.actions[0]?.type, "read");
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve concluir ciclo CREATE orientado por proposta", async () => {
    const directory = await createTemporaryRepository();

    try {
      const provider = new DeterministicActionProposalProvider();

      const result = await runRepositoryMissionWorkflowFromProposal(
        directory,
        "Criar proposal-health.ts através de uma proposta.",
        provider,
        {
          operations: [
            {
              type: "create",

              target: "proposal-health.ts",

              content: 'export const health = "proposal";\n',
            },
          ],
        },
      );

      assert.equal(result.mission.status, "completed");

      assert.equal(result.execution.status, "completed");

      assert.equal(result.verification?.status, "passed");

      assert.deepEqual(result.execution.affectedFiles, ["proposal-health.ts"]);

      assert.equal(
        await readFile(join(directory, "proposal-health.ts"), "utf8"),
        'export const health = "proposal";\n',
      );
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve concluir READ seguido de CREATE orientados por proposta", async () => {
    const directory = await createTemporaryRepository();

    try {
      const provider = new DeterministicActionProposalProvider();

      const result = await runRepositoryMissionWorkflowFromProposal(
        directory,
        "Ler package.json e criar proposal-generated.ts.",
        provider,
        {
          operations: [
            {
              type: "read",

              target: "package.json",
            },

            {
              type: "create",

              target: "proposal-generated.ts",

              content: "export {};\n",
            },
          ],
        },
      );

      assert.equal(result.mission.status, "completed");

      assert.equal(result.execution.results.length, 2);

      assert.deepEqual(
        result.execution.actions.map((action) => action.type),
        ["read", "create"],
      );

      assert.deepEqual(result.execution.affectedFiles, [
        "proposal-generated.ts",
      ]);

      assert.equal(result.verification?.status, "passed");
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve preservar failure operacional no fluxo orientado por proposta", async () => {
    const directory = await createTemporaryRepository();

    try {
      await writeFile(
        join(directory, "proposal-existing.ts"),
        "conteúdo original",
        "utf8",
      );

      const provider = new DeterministicActionProposalProvider();

      const result = await runRepositoryMissionWorkflowFromProposal(
        directory,
        "Tentar criar proposal-existing.ts.",
        provider,
        {
          operations: [
            {
              type: "create",

              target: "proposal-existing.ts",

              content: "novo conteúdo",
            },
          ],
        },
      );

      assert.equal(result.proposal.status, "proposed");

      assert.equal(result.mission.status, "failed");

      assert.equal(result.execution.status, "failed");

      assert.equal(result.verification, null);

      assert.equal(result.execution.results[0]?.status, "failure");

      assert.deepEqual(result.execution.affectedFiles, []);

      assert.equal(
        await readFile(join(directory, "proposal-existing.ts"), "utf8"),
        "conteúdo original",
      );
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve rejeitar proposta pertencente a outra missão antes da execução", async () => {
    const directory = await createTemporaryRepository();

    try {
      /**
       * Provider propositalmente inválido.
       *
       * Ele ignora o missionId recebido
       * e produz uma proposta vinculada
       * a outra missão.
       */
      const foreignMissionProvider: ActionProposalProvider<null> = {
        async propose() {
          return createActionProposal("foreign-mission-id", [
            createReadProposedAction(1, "package.json"),
          ]);
        },
      };

      await assert.rejects(
        runRepositoryMissionWorkflowFromProposal(
          directory,
          "Executar proposta pertencente a outra missão.",
          foreignMissionProvider,
          null,
        ),
        InvalidProposalMaterializationError,
      );

      /**
       * A rejeição ocorre antes de qualquer
       * operação física no repositório.
       *
       * O fixture original continua íntegro.
       */
      const packageContent = await readFile(
        join(directory, "package.json"),
        "utf8",
      );

      assert.equal(packageContent.includes("vera-workflow-fixture"), true);
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });
});
