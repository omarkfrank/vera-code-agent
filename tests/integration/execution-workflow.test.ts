import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { addExecutionAction } from "../../src/execution/add-execution-action.js";

import { createReadExecutionAction } from "../../src/execution/create-read-execution-action.js";

import {
  executeMissionActions,
  InvalidExecutionWorkflowError,
} from "../../src/execution/execution-workflow.js";

import type { MissionExecution } from "../../src/execution/mission-execution.js";

import type { Mission } from "../../src/mission/mission.js";

/**
 * Cria uma missão planejada apontando
 * para um repositório temporário.
 */
function createTestMission(directory: string): Mission {
  return {
    id: "execution-workflow-mission",

    requirement: "Analisar arquivos do projeto.",

    status: "planned",

    createdAt: "2026-08-12T12:00:00.000Z",

    repositoryInspection: {
      directory,

      project: {
        name: "execution-workflow-project",

        version: "1.0.0",

        runtime: "Node.js",

        moduleSystem: "ESM",

        packageManager: "npm",
      },

      scripts: [],

      technologies: ["TypeScript"],

      configurationFiles: ["package.json"],

      git: {
        detected: false,
      },
    },
  };
}

/**
 * Cria uma execução preparada.
 */
function createTestExecution(mission: Mission): MissionExecution {
  return {
    id: "execution-workflow-execution",

    missionId: mission.id,

    status: "prepared",

    preparedAt: "2026-08-12T12:01:00.000Z",

    actions: [],

    affectedFiles: [],

    results: [],
  };
}

describe("Execution Workflow", () => {
  it("deve executar Read Action e avançar para verifying", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-execution-workflow-"));

    try {
      await writeFile(
        join(directory, "package.json"),
        '{"name":"example"}\n',
        "utf-8",
      );

      const mission = createTestMission(directory);

      const execution = createTestExecution(mission);

      const action = createReadExecutionAction(execution.id, 1, "package.json");

      const registeredExecution = addExecutionAction(execution, action);

      const result = await executeMissionActions(mission, registeredExecution);

      assert.equal(result.mission.status, "verifying");

      assert.equal(result.execution.status, "completed");

      assert.equal(result.execution.results.length, 1);

      assert.equal(result.execution.results[0]?.actionId, action.id);

      assert.equal(result.execution.results[0]?.status, "success");
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("deve executar múltiplas ações respeitando a ordem declarada", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-execution-order-"));

    try {
      await writeFile(join(directory, "first.txt"), "primeiro", "utf-8");

      await writeFile(join(directory, "second.txt"), "segundo", "utf-8");

      const mission = createTestMission(directory);

      const execution = createTestExecution(mission);

      const secondAction = createReadExecutionAction(
        execution.id,
        2,
        "second.txt",
      );

      const firstAction = createReadExecutionAction(
        execution.id,
        1,
        "first.txt",
      );

      const withSecond = addExecutionAction(execution, secondAction);

      const withBoth = addExecutionAction(withSecond, firstAction);

      const result = await executeMissionActions(mission, withBoth);

      assert.deepEqual(
        result.execution.results.map(
          (executionResult) => executionResult.actionId,
        ),
        [firstAction.id, secondAction.id],
      );

      assert.equal(result.mission.status, "verifying");

      assert.equal(result.execution.status, "completed");
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("não deve modificar missão ou execução originais", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "vera-execution-immutable-"),
    );

    try {
      await writeFile(join(directory, "package.json"), "{}", "utf-8");

      const mission = createTestMission(directory);

      const execution = createTestExecution(mission);

      const action = createReadExecutionAction(execution.id, 1, "package.json");

      const registeredExecution = addExecutionAction(execution, action);

      const workflowResult = await executeMissionActions(
        mission,
        registeredExecution,
      );

      assert.equal(mission.status, "planned");

      assert.equal(registeredExecution.status, "prepared");

      assert.deepEqual(registeredExecution.results, []);

      assert.notEqual(workflowResult.mission, mission);

      assert.notEqual(workflowResult.execution, registeredExecution);
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("deve transformar falha operacional em evidência estruturada", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-execution-failure-"));

    try {
      const mission = createTestMission(directory);

      const execution = createTestExecution(mission);

      const action = createReadExecutionAction(
        execution.id,
        1,
        "arquivo-inexistente.txt",
      );

      const registeredExecution = addExecutionAction(execution, action);

      const result = await executeMissionActions(mission, registeredExecution);

      assert.equal(result.mission.status, "failed");

      assert.equal(result.execution.status, "failed");

      assert.equal(result.execution.results.length, 1);

      assert.equal(result.execution.results[0]?.status, "failure");

      assert.equal(
        result.execution.results[0]?.message,
        "Arquivo alvo não encontrado.",
      );

      assert.deepEqual(result.execution.affectedFiles, []);
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("deve interromper ações posteriores após a primeira falha", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "vera-execution-fail-fast-"),
    );

    try {
      await writeFile(
        join(directory, "valid.txt"),
        "não deve ser lido",
        "utf-8",
      );

      const mission = createTestMission(directory);

      const execution = createTestExecution(mission);

      const failingAction = createReadExecutionAction(
        execution.id,
        1,
        "missing.txt",
      );

      const laterAction = createReadExecutionAction(
        execution.id,
        2,
        "valid.txt",
      );

      const withFailure = addExecutionAction(execution, failingAction);

      const withBoth = addExecutionAction(withFailure, laterAction);

      const result = await executeMissionActions(mission, withBoth);

      /**
       * Apenas a primeira ação deve produzir
       * resultado devido à política fail-fast.
       */
      assert.equal(result.execution.results.length, 1);

      assert.equal(result.execution.results[0]?.actionId, failingAction.id);

      assert.equal(result.execution.results[0]?.status, "failure");

      assert.equal(result.mission.status, "failed");

      assert.equal(result.execution.status, "failed");
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("deve rejeitar execução pertencente a outra missão", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-execution-owner-"));

    try {
      const mission = createTestMission(directory);

      const execution = createTestExecution(mission);

      execution.missionId = "another-mission";

      await assert.rejects(executeMissionActions(mission, execution), {
        name: "InvalidExecutionWorkflowError",

        message: "A execução informada não pertence à missão.",
      });
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("deve rejeitar execução sem ações registradas", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-execution-empty-"));

    try {
      const mission = createTestMission(directory);

      const execution = createTestExecution(mission);

      await assert.rejects(
        executeMissionActions(mission, execution),
        InvalidExecutionWorkflowError,
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("deve rejeitar execução que não esteja prepared", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-execution-status-"));

    try {
      const mission = createTestMission(directory);

      const execution = createTestExecution(mission);

      execution.status = "executing";

      await assert.rejects(
        executeMissionActions(mission, execution),
        InvalidExecutionWorkflowError,
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });
});
