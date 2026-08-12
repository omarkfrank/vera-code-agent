import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MissionExecution } from "../../src/execution/mission-execution.js";

import { verifyExecutionEvidence } from "../../src/verification/verify-execution-evidence.js";

/**
 * Cria uma execução válida e completamente
 * concluída para servir como baseline.
 */
function createSuccessfulExecution(): MissionExecution {
  return {
    id: "verification-execution-001",

    missionId: "verification-mission-001",

    status: "completed",

    preparedAt: "2026-08-12T12:00:00.000Z",

    actions: [
      {
        executionId: "verification-execution-001",

        id: "verification-action-001",

        order: 1,

        type: "read",

        description: "Ler package.json.",

        target: "package.json",
      },
    ],

    affectedFiles: [],

    results: [
      {
        executionId: "verification-execution-001",

        actionId: "verification-action-001",

        status: "success",

        message: "Arquivo lido com sucesso.",
      },
    ],
  };
}

describe("verifyExecutionEvidence", () => {
  it("deve aprovar execução com evidências válidas", () => {
    const verification = verifyExecutionEvidence(createSuccessfulExecution());

    assert.equal(verification.status, "passed");

    assert.equal(verification.missionId, "verification-mission-001");

    assert.equal(verification.executionId, "verification-execution-001");

    assert.equal(
      verification.checks.every((check) => check.status === "passed"),
      true,
    );
  });

  it("deve reprovar execução não concluída", () => {
    const execution = createSuccessfulExecution();

    execution.status = "executing";

    const verification = verifyExecutionEvidence(execution);

    assert.equal(verification.status, "failed");

    assert.equal(
      verification.checks.find((check) => check.id === "execution-completed")
        ?.status,
      "failed",
    );
  });

  it("deve reprovar ação sem resultado correspondente", () => {
    const execution = createSuccessfulExecution();

    execution.results = [];

    const verification = verifyExecutionEvidence(execution);

    assert.equal(verification.status, "failed");

    assert.equal(
      verification.checks.find(
        (check) => check.id === "action-results-complete",
      )?.status,
      "failed",
    );
  });

  it("deve reprovar resultado operacional failure", () => {
    const execution = createSuccessfulExecution();

    execution.results[0] = {
      ...execution.results[0]!,
      status: "failure",
    };

    const verification = verifyExecutionEvidence(execution);

    assert.equal(verification.status, "failed");

    assert.equal(
      verification.checks.find((check) => check.id === "all-results-successful")
        ?.status,
      "failed",
    );
  });

  it("deve reprovar resultado associado a ação inexistente", () => {
    const execution = createSuccessfulExecution();

    execution.results.push({
      executionId: execution.id,

      actionId: "unknown-action",

      status: "success",

      message: "Resultado inválido.",
    });

    const verification = verifyExecutionEvidence(execution);

    assert.equal(verification.status, "failed");

    assert.equal(
      verification.checks.find((check) => check.id === "no-orphan-results")
        ?.status,
      "failed",
    );
  });

  it("deve reprovar violação da integridade read-only", () => {
    const execution = createSuccessfulExecution();

    execution.affectedFiles = ["src/main.ts"];

    const verification = verifyExecutionEvidence(execution);

    assert.equal(verification.status, "failed");

    assert.equal(
      verification.checks.find((check) => check.id === "read-only-integrity")
        ?.status,
      "failed",
    );
  });
});
