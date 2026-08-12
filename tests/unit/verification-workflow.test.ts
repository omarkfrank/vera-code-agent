import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MissionExecution } from "../../src/execution/mission-execution.js";

import type { Mission } from "../../src/mission/mission.js";

import {
  InvalidVerificationWorkflowError,
  verifyMissionExecution,
} from "../../src/verification/verification-workflow.js";

function createVerifyingMission(): Mission {
  return {
    id: "verification-workflow-mission",

    requirement: "Analisar package.json.",

    status: "verifying",

    createdAt: "2026-08-12T12:00:00.000Z",

    repositoryInspection: {
      directory: process.cwd(),

      project: {
        name: "vera-code-agent",

        version: "0.1.0",

        runtime: "Node.js",

        moduleSystem: "ESM",

        packageManager: "npm",
      },

      scripts: [],

      technologies: ["TypeScript"],

      configurationFiles: ["package.json"],

      git: {
        detected: true,
      },
    },
  };
}

function createCompletedExecution(mission: Mission): MissionExecution {
  return {
    id: "verification-workflow-execution",

    missionId: mission.id,

    status: "completed",

    preparedAt: "2026-08-12T12:01:00.000Z",

    actions: [
      {
        executionId: "verification-workflow-execution",

        id: "verification-workflow-action",

        order: 1,

        type: "read",

        description: "Ler package.json.",

        target: "package.json",
      },
    ],

    affectedFiles: [],

    results: [
      {
        executionId: "verification-workflow-execution",

        actionId: "verification-workflow-action",

        status: "success",

        message: "Arquivo lido com sucesso.",
      },
    ],
  };
}

describe("Verification Workflow", () => {
  it("deve concluir missão quando as evidências forem aprovadas", () => {
    const mission = createVerifyingMission();

    const execution = createCompletedExecution(mission);

    const result = verifyMissionExecution(mission, execution);

    assert.equal(result.verification.status, "passed");

    assert.equal(result.mission.status, "completed");
  });

  it("deve falhar missão quando a verificação for reprovada", () => {
    const mission = createVerifyingMission();

    const execution = createCompletedExecution(mission);

    execution.results = [];

    const result = verifyMissionExecution(mission, execution);

    assert.equal(result.verification.status, "failed");

    assert.equal(result.mission.status, "failed");
  });

  it("não deve modificar missão ou execução originais", () => {
    const mission = createVerifyingMission();

    const execution = createCompletedExecution(mission);

    const result = verifyMissionExecution(mission, execution);

    assert.equal(mission.status, "verifying");

    assert.equal(execution.status, "completed");

    assert.notEqual(result.mission, mission);
  });

  it("deve rejeitar missão que não esteja verifying", () => {
    const mission = createVerifyingMission();

    mission.status = "executing";

    assert.throws(
      () => verifyMissionExecution(mission, createCompletedExecution(mission)),
      InvalidVerificationWorkflowError,
    );
  });

  it("deve rejeitar execução pertencente a outra missão", () => {
    const mission = createVerifyingMission();

    const execution = createCompletedExecution(mission);

    execution.missionId = "another-mission";

    assert.throws(() => verifyMissionExecution(mission, execution), {
      name: "InvalidVerificationWorkflowError",

      message: "A execução informada não pertence à missão.",
    });
  });
});
