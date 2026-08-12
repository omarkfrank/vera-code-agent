import assert from "node:assert/strict";

import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";

import { tmpdir } from "node:os";

import { join } from "node:path";

import { describe, it } from "node:test";

import { addExecutionAction } from "../../src/execution/add-execution-action.js";

import { createFileExecutionAction } from "../../src/execution/create-file-execution-action.js";

import { createReadExecutionAction } from "../../src/execution/create-read-execution-action.js";

import {
  executeMissionActions,
  InvalidExecutionWorkflowError,
} from "../../src/execution/execution-workflow.js";

import type { MissionExecution } from "../../src/execution/mission-execution.js";

import type { Mission } from "../../src/mission/mission.js";

function createMission(directory: string): Mission {
  return {
    id: "create-workflow-mission",

    requirement: "Criar arquivo com segurança.",

    status: "planned",

    createdAt: "2026-08-12T12:00:00.000Z",

    repositoryInspection: {
      directory,

      project: {
        name: "create-workflow-project",

        version: "1.0.0",

        runtime: "Node.js",

        moduleSystem: "ESM",

        packageManager: "npm",
      },

      scripts: [],

      technologies: ["TypeScript"],

      configurationFiles: [],

      git: {
        detected: false,
      },
    },
  };
}

function createExecution(mission: Mission): MissionExecution {
  return {
    id: "create-workflow-execution",

    missionId: mission.id,

    status: "prepared",

    preparedAt: "2026-08-12T12:01:00.000Z",

    actions: [],

    affectedFiles: [],

    results: [],
  };
}

describe("Create Execution Workflow", () => {
  it("deve criar arquivo e registrar mutação de ponta a ponta", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-create-workflow-"));

    try {
      const mission = createMission(directory);

      const execution = createExecution(mission);

      const action = createFileExecutionAction(
        execution.id,
        1,
        "health.ts",
        'export const health = "ok";\n',
      );

      const registered = addExecutionAction(execution, action);

      const result = await executeMissionActions(mission, registered);

      assert.equal(result.mission.status, "verifying");

      assert.equal(result.execution.status, "completed");

      assert.deepEqual(result.execution.affectedFiles, ["health.ts"]);

      assert.equal(result.execution.results[0]?.status, "success");

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

  it("deve permitir READ antes de CREATE", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "vera-read-create-workflow-"),
    );

    try {
      await writeFile(join(directory, "package.json"), "{}", "utf8");

      const mission = createMission(directory);

      const execution = createExecution(mission);

      const readAction = createReadExecutionAction(
        execution.id,
        1,
        "package.json",
      );

      const createAction = createFileExecutionAction(
        execution.id,
        2,
        "generated.ts",
        "export {};\n",
      );

      const withRead = addExecutionAction(execution, readAction);

      const withBoth = addExecutionAction(withRead, createAction);

      const result = await executeMissionActions(mission, withBoth);

      assert.equal(result.execution.results.length, 2);

      assert.deepEqual(result.execution.affectedFiles, ["generated.ts"]);
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve rejeitar CREATE que não seja a última ação antes de qualquer mutação", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "vera-create-order-policy-"),
    );

    try {
      await writeFile(join(directory, "package.json"), "{}", "utf8");

      const mission = createMission(directory);

      const execution = createExecution(mission);

      const createAction = createFileExecutionAction(
        execution.id,
        1,
        "should-not-exist.ts",
        "export {};\n",
      );

      const readAction = createReadExecutionAction(
        execution.id,
        2,
        "package.json",
      );

      const withCreate = addExecutionAction(execution, createAction);

      const withBoth = addExecutionAction(withCreate, readAction);

      await assert.rejects(executeMissionActions(mission, withBoth), {
        name: "InvalidExecutionWorkflowError",

        message: "A Create Action precisa ser a última operação da execução.",
      });

      await assert.rejects(access(join(directory, "should-not-exist.ts")));
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve rejeitar múltiplas Create Actions antes de qualquer mutação", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "vera-create-count-policy-"),
    );

    try {
      const mission = createMission(directory);

      const execution = createExecution(mission);

      const first = createFileExecutionAction(
        execution.id,
        1,
        "first.ts",
        "export {};\n",
      );

      const second = createFileExecutionAction(
        execution.id,
        2,
        "second.ts",
        "export {};\n",
      );

      const withFirst = addExecutionAction(execution, first);

      const withBoth = addExecutionAction(withFirst, second);

      await assert.rejects(
        executeMissionActions(mission, withBoth),
        InvalidExecutionWorkflowError,
      );

      await assert.rejects(access(join(directory, "first.ts")));

      await assert.rejects(access(join(directory, "second.ts")));
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve transformar conflito de criação em failure sem afetar arquivo", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "vera-create-workflow-conflict-"),
    );

    try {
      await writeFile(
        join(directory, "existing.ts"),
        "conteúdo original",
        "utf8",
      );

      const mission = createMission(directory);

      const execution = createExecution(mission);

      const action = createFileExecutionAction(
        execution.id,
        1,
        "existing.ts",
        "novo conteúdo",
      );

      const registered = addExecutionAction(execution, action);

      const result = await executeMissionActions(mission, registered);

      assert.equal(result.mission.status, "failed");

      assert.equal(result.execution.status, "failed");

      assert.deepEqual(result.execution.affectedFiles, []);

      assert.equal(result.execution.results[0]?.status, "failure");

      assert.equal(
        result.execution.results[0]?.message,
        "O arquivo alvo já existe e não pode ser sobrescrito.",
      );

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
});
