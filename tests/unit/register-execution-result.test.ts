import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  ExecutionAction,
  ExecutionActionResult,
  MissionExecution,
} from "../../src/execution/mission-execution.js";

import {
  InvalidExecutionResultRegistrationError,
  registerExecutionResult,
} from "../../src/execution/register-execution-result.js";

/**
 * Cria uma ação previsível para os testes.
 */
function createTestAction(): ExecutionAction {
  return {
    executionId: "execution-result-001",

    id: "action-result-001",

    order: 1,

    type: "read",

    description: "Ler package.json.",

    target: "package.json",
  };
}

/**
 * Cria uma execução em estado ativo.
 */
function createTestExecution(): MissionExecution {
  return {
    id: "execution-result-001",

    missionId: "mission-result-001",

    status: "executing",

    preparedAt: "2026-08-12T12:00:00.000Z",

    actions: [createTestAction()],

    affectedFiles: [],

    results: [],
  };
}

/**
 * Cria uma evidência previsível.
 */
function createTestResult(): ExecutionActionResult {
  return {
    executionId: "execution-result-001",

    actionId: "action-result-001",

    status: "success",

    message: "Arquivo lido com sucesso.",
  };
}

describe("registerExecutionResult", () => {
  it("deve registrar resultado válido", () => {
    const execution = createTestExecution();

    const result = createTestResult();

    const updatedExecution = registerExecutionResult(execution, result);

    assert.equal(updatedExecution.results.length, 1);

    assert.deepEqual(updatedExecution.results[0], result);
  });

  it("não deve modificar a execução original", () => {
    const execution = createTestExecution();

    const updatedExecution = registerExecutionResult(
      execution,
      createTestResult(),
    );

    assert.deepEqual(execution.results, []);

    assert.notEqual(updatedExecution, execution);

    assert.notEqual(updatedExecution.results, execution.results);
  });

  it("deve rejeitar execução que ainda não esteja executing", () => {
    const execution = createTestExecution();

    execution.status = "prepared";

    assert.throws(
      () => registerExecutionResult(execution, createTestResult()),
      InvalidExecutionResultRegistrationError,
    );
  });

  it("deve rejeitar resultado pertencente a outra execução", () => {
    const result = createTestResult();

    result.executionId = "another-execution";

    assert.throws(
      () => registerExecutionResult(createTestExecution(), result),
      {
        name: "InvalidExecutionResultRegistrationError",

        message: "O resultado informado não pertence a esta execução.",
      },
    );
  });

  it("deve rejeitar resultado de ação não registrada", () => {
    const result = createTestResult();

    result.actionId = "unknown-action";

    assert.throws(
      () => registerExecutionResult(createTestExecution(), result),
      InvalidExecutionResultRegistrationError,
    );
  });

  it("deve rejeitar resultado duplicado para a mesma ação", () => {
    const execution = createTestExecution();

    const result = createTestResult();

    const withResult = registerExecutionResult(execution, result);

    assert.throws(
      () => registerExecutionResult(withResult, result),
      InvalidExecutionResultRegistrationError,
    );
  });
});
