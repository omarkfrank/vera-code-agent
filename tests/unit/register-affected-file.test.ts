import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  InvalidAffectedFileRegistrationError,
  registerAffectedFile,
} from "../../src/execution/register-affected-file.js";

import type { MissionExecution } from "../../src/execution/mission-execution.js";

function createExecution(): MissionExecution {
  return {
    id: "affected-execution",

    missionId: "affected-mission",

    status: "executing",

    preparedAt: "2026-08-12T12:00:00.000Z",

    actions: [
      {
        executionId: "affected-execution",

        id: "create-action",

        order: 1,

        type: "create",

        description: "Criar health.ts.",

        target: "src/health.ts",

        content: "export {};\n",
      },
    ],

    affectedFiles: [],

    results: [
      {
        executionId: "affected-execution",

        actionId: "create-action",

        status: "success",

        message: "Arquivo criado com sucesso.",
      },
    ],
  };
}

describe("registerAffectedFile", () => {
  it("deve registrar arquivo criado com sucesso", () => {
    const execution = createExecution();

    const updated = registerAffectedFile(execution, "create-action");

    assert.deepEqual(updated.affectedFiles, ["src/health.ts"]);
  });

  it("não deve modificar a execução original", () => {
    const execution = createExecution();

    const updated = registerAffectedFile(execution, "create-action");

    assert.deepEqual(execution.affectedFiles, []);

    assert.notEqual(updated, execution);

    assert.notEqual(updated.affectedFiles, execution.affectedFiles);
  });

  it("deve rejeitar execução que não esteja executing", () => {
    const execution = createExecution();

    execution.status = "completed";

    assert.throws(
      () => registerAffectedFile(execution, "create-action"),
      InvalidAffectedFileRegistrationError,
    );
  });

  it("deve rejeitar ação inexistente", () => {
    assert.throws(
      () => registerAffectedFile(createExecution(), "unknown-action"),
      InvalidAffectedFileRegistrationError,
    );
  });

  it("deve rejeitar ação que não seja create", () => {
    const execution = createExecution();

    execution.actions = [
      {
        executionId: execution.id,

        id: "read-action",

        order: 1,

        type: "read",

        description: "Ler package.json.",

        target: "package.json",
      },
    ];

    execution.results = [
      {
        executionId: execution.id,

        actionId: "read-action",

        status: "success",

        message: "Arquivo lido.",
      },
    ];

    assert.throws(
      () => registerAffectedFile(execution, "read-action"),
      InvalidAffectedFileRegistrationError,
    );
  });

  it("deve rejeitar Create Action sem resultado success", () => {
    const execution = createExecution();

    execution.results = [
      {
        executionId: execution.id,

        actionId: "create-action",

        status: "failure",

        message: "Falha.",
      },
    ];

    assert.throws(
      () => registerAffectedFile(execution, "create-action"),
      InvalidAffectedFileRegistrationError,
    );
  });

  it("deve rejeitar arquivo afetado duplicado", () => {
    const execution = createExecution();

    const withAffectedFile = registerAffectedFile(execution, "create-action");

    assert.throws(
      () => registerAffectedFile(withAffectedFile, "create-action"),
      InvalidAffectedFileRegistrationError,
    );
  });
});
