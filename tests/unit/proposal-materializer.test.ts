import assert from "node:assert/strict";

import { describe, it } from "node:test";

import type { MissionExecution } from "../../src/execution/mission-execution.js";

import { createActionProposal } from "../../src/proposal/create-action-proposal.js";

import {
  createCreateProposedAction,
  createReadProposedAction,
} from "../../src/proposal/create-proposed-action.js";

import {
  InvalidProposalMaterializationError,
  materializeActionProposal,
} from "../../src/proposal/proposal-materializer.js";

/**
 * Cria uma execução mínima preparada
 * para os testes unitários do materializer.
 *
 * Não precisamos iniciar o workflow real,
 * pois este teste trata exclusivamente da
 * transformação Proposal → ExecutionAction.
 */
function createPreparedExecution(missionId = "mission-123"): MissionExecution {
  return {
    id: "execution-123",

    missionId,

    status: "prepared",

    preparedAt: new Date().toISOString(),

    actions: [],

    affectedFiles: [],

    results: [],
  };
}

describe("Proposal Materializer", () => {
  it("deve materializar Proposed READ como ReadExecutionAction", () => {
    const proposal = createActionProposal("mission-123", [
      createReadProposedAction(1, "package.json"),
    ]);

    const execution = createPreparedExecution();

    const actions = materializeActionProposal(proposal, execution);

    assert.equal(actions.length, 1);

    const action = actions[0];

    assert.equal(action?.executionId, execution.id);

    assert.equal(action?.order, 1);

    assert.equal(action?.type, "read");

    assert.equal(action?.target, "package.json");

    assert.equal(typeof action?.id, "string");
  });

  it("deve materializar Proposed CREATE como CreateExecutionAction", () => {
    const proposal = createActionProposal("mission-123", [
      createCreateProposedAction(1, "health.ts", 'export const health = "ok";'),
    ]);

    const execution = createPreparedExecution();

    const actions = materializeActionProposal(proposal, execution);

    const action = actions[0];

    assert.equal(action?.type, "create");

    if (action?.type !== "create") {
      assert.fail("Era esperada uma CreateExecutionAction.");
    }

    assert.equal(action.executionId, execution.id);

    assert.equal(action.target, "health.ts");

    assert.equal(action.content, 'export const health = "ok";');
  });

  it("deve preservar a ordem lógica das ações propostas", () => {
    const proposal = createActionProposal("mission-123", [
      createReadProposedAction(1, "package.json"),

      createReadProposedAction(2, "src/main.ts"),

      createCreateProposedAction(3, "health.ts", "export {};"),
    ]);

    const actions = materializeActionProposal(
      proposal,
      createPreparedExecution(),
    );

    assert.deepEqual(
      actions.map((action) => ({
        order: action.order,

        type: action.type,

        target: action.target,
      })),
      [
        {
          order: 1,

          type: "read",

          target: "package.json",
        },

        {
          order: 2,

          type: "read",

          target: "src/main.ts",
        },

        {
          order: 3,

          type: "create",

          target: "health.ts",
        },
      ],
    );
  });

  it("deve associar todas as ações ao mesmo executionId", () => {
    const proposal = createActionProposal("mission-123", [
      createReadProposedAction(1, "package.json"),

      createCreateProposedAction(2, "health.ts", "export {};"),
    ]);

    const execution = createPreparedExecution();

    const actions = materializeActionProposal(proposal, execution);

    assert.equal(
      actions.every((action) => action.executionId === execution.id),
      true,
    );
  });

  it("deve gerar identificadores próprios para cada ExecutionAction", () => {
    const proposal = createActionProposal("mission-123", [
      createReadProposedAction(1, "package.json"),

      createReadProposedAction(2, "src/main.ts"),
    ]);

    const actions = materializeActionProposal(
      proposal,
      createPreparedExecution(),
    );

    assert.equal(actions.length, 2);

    assert.notEqual(actions[0]?.id, actions[1]?.id);
  });

  it("deve rejeitar proposta pertencente a outra missão", () => {
    const proposal = createActionProposal("mission-other", [
      createReadProposedAction(1, "package.json"),
    ]);

    const execution = createPreparedExecution("mission-123");

    assert.throws(
      () => materializeActionProposal(proposal, execution),
      InvalidProposalMaterializationError,
    );
  });

  it("deve rejeitar execução que não esteja prepared", () => {
    const proposal = createActionProposal("mission-123", [
      createReadProposedAction(1, "package.json"),
    ]);

    const execution: MissionExecution = {
      ...createPreparedExecution(),

      status: "executing",
    };

    assert.throws(
      () => materializeActionProposal(proposal, execution),
      InvalidProposalMaterializationError,
    );
  });

  it("não deve modificar a ActionProposal original", () => {
    const proposal = createActionProposal("mission-123", [
      createReadProposedAction(1, "package.json"),
    ]);

    const originalActions = proposal.actions.map((action) => ({
      ...action,
    }));

    materializeActionProposal(proposal, createPreparedExecution());

    assert.deepEqual(proposal.actions, originalActions);
  });

  it("não deve modificar a MissionExecution original", () => {
    const proposal = createActionProposal("mission-123", [
      createReadProposedAction(1, "package.json"),
    ]);

    const execution = createPreparedExecution();

    materializeActionProposal(proposal, execution);

    assert.deepEqual(execution.actions, []);

    assert.deepEqual(execution.results, []);

    assert.deepEqual(execution.affectedFiles, []);

    assert.equal(execution.status, "prepared");
  });
});
