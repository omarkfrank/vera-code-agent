import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addExecutionAction,
  InvalidExecutionActionRegistrationError,
} from "../../src/execution/add-execution-action.js";

import { createReadExecutionAction } from "../../src/execution/create-read-execution-action.js";

import type {
  ExecutionAction,
  MissionExecution,
} from "../../src/execution/mission-execution.js";

/**
 * Cria uma execução previsível para validar
 * exclusivamente o registro de ações.
 */
function createTestExecution(): MissionExecution {
  return {
    id: "execution-registration-001",

    missionId: "mission-registration-001",

    status: "prepared",

    preparedAt: "2026-08-12T12:00:00.000Z",

    actions: [],

    affectedFiles: [],

    results: [],
  };
}

describe("addExecutionAction", () => {
  /**
   * Uma Read Action válida deve poder
   * ser registrada na execução proprietária.
   */
  it("deve registrar ação read na execução", () => {
    const execution = createTestExecution();

    const action = createReadExecutionAction(execution.id, 1, "src/main.ts");

    const updatedExecution = addExecutionAction(execution, action);

    assert.equal(updatedExecution.actions.length, 1);

    assert.deepEqual(updatedExecution.actions[0], action);
  });

  /**
   * O registro segue o mesmo princípio
   * de imutabilidade adotado no restante
   * da arquitetura da VERA.
   */
  it("não deve modificar a execução original", () => {
    const execution = createTestExecution();

    const originalActions = execution.actions;

    const action = createReadExecutionAction(execution.id, 1, "src/main.ts");

    const updatedExecution = addExecutionAction(execution, action);

    assert.deepEqual(execution.actions, []);

    assert.equal(execution.actions, originalActions);

    assert.notEqual(updatedExecution, execution);

    assert.notEqual(updatedExecution.actions, execution.actions);

    assert.deepEqual(updatedExecution.affectedFiles, []);

    assert.deepEqual(updatedExecution.results, []);
  });

  /**
   * Uma ação criada para outra execução
   * nunca pode ser registrada.
   */
  it("deve rejeitar ação pertencente a outra execução", () => {
    const execution = createTestExecution();

    const action = createReadExecutionAction(
      "another-execution",
      1,
      "src/main.ts",
    );

    assert.throws(() => addExecutionAction(execution, action), {
      name: "InvalidExecutionActionRegistrationError",

      message: "A ação informada não pertence a esta execução.",
    });
  });

  /**
   * O contrato conhece operações futuras,
   * mas apenas read está autorizada agora.
   */
  it("deve rejeitar tipo de ação ainda não autorizado", () => {
    const execution = createTestExecution();

    const action: ExecutionAction = {
      executionId: execution.id,

      id: "future-update-action",

      order: 1,

      type: "update",

      description: "Atualizar src/main.ts.",

      target: "src/main.ts",
    };

    assert.throws(
      () => addExecutionAction(execution, action),
      (error: unknown) => {
        assert.ok(error instanceof InvalidExecutionActionRegistrationError);

        assert.equal(
          error.message,
          'A ação do tipo "update" ainda não está autorizada para execução.',
        );

        return true;
      },
    );
  });

  /**
   * Dois registros diferentes não podem
   * compartilhar o mesmo ID.
   */
  it("deve rejeitar identificador de ação duplicado", () => {
    const execution = createTestExecution();

    const firstAction = createReadExecutionAction(
      execution.id,
      1,
      "src/main.ts",
    );

    const registeredExecution = addExecutionAction(execution, firstAction);

    const duplicatedAction: ExecutionAction = {
      ...firstAction,
      order: 2,
      target: "package.json",
    };

    assert.throws(
      () => addExecutionAction(registeredExecution, duplicatedAction),
      InvalidExecutionActionRegistrationError,
    );
  });

  /**
   * Uma posição operacional não pode possuir
   * duas ações diferentes.
   */
  it("deve rejeitar ordem de ação duplicada", () => {
    const execution = createTestExecution();

    const firstAction = createReadExecutionAction(
      execution.id,
      1,
      "src/main.ts",
    );

    const registeredExecution = addExecutionAction(execution, firstAction);

    const secondAction = createReadExecutionAction(
      execution.id,
      1,
      "package.json",
    );

    assert.throws(() => addExecutionAction(registeredExecution, secondAction), {
      name: "InvalidExecutionActionRegistrationError",

      message: "Já existe uma ação registrada na ordem 1.",
    });
  });

  /**
   * A execução pode possuir várias Read Actions,
   * desde que identidade e ordem permaneçam únicas.
   */
  it("deve registrar múltiplas ações válidas", () => {
    const execution = createTestExecution();

    const firstAction = createReadExecutionAction(
      execution.id,
      1,
      "package.json",
    );

    const secondAction = createReadExecutionAction(
      execution.id,
      2,
      "src/main.ts",
    );

    const withFirstAction = addExecutionAction(execution, firstAction);

    const withSecondAction = addExecutionAction(withFirstAction, secondAction);

    assert.equal(withSecondAction.actions.length, 2);

    assert.deepEqual(
      withSecondAction.actions.map((action) => action.order),
      [1, 2],
    );

    assert.deepEqual(
      withSecondAction.actions.map((action) => action.target),
      ["package.json", "src/main.ts"],
    );
  });
});
