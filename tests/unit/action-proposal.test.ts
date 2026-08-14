import assert from "node:assert/strict";

import { describe, it } from "node:test";

import {
  createActionProposal,
  InvalidActionProposalError,
} from "../../src/proposal/create-action-proposal.js";

import {
  createCreateProposedAction,
  createReadProposedAction,
  InvalidProposedActionError,
} from "../../src/proposal/create-proposed-action.js";

describe("Action Proposal", () => {
  it("deve criar uma Proposed Read Action válida", () => {
    const action = createReadProposedAction(1, " package.json ");

    assert.deepEqual(action, {
      order: 1,

      type: "read",

      target: "package.json",
    });
  });

  it("deve criar uma Proposed Create Action válida", () => {
    const action = createCreateProposedAction(
      1,
      "health.ts",
      'export const health = "ok";',
    );

    assert.deepEqual(action, {
      order: 1,

      type: "create",

      target: "health.ts",

      content: 'export const health = "ok";',
    });
  });

  it("deve permitir conteúdo vazio em Proposed Create Action", () => {
    const action = createCreateProposedAction(1, "empty.txt", "");

    assert.equal(action.content, "");
  });

  it("deve rejeitar ordem inválida em ação proposta", () => {
    assert.throws(
      () => createReadProposedAction(0, "package.json"),
      InvalidProposedActionError,
    );
  });

  it("deve rejeitar target vazio em ação proposta", () => {
    assert.throws(
      () => createCreateProposedAction(1, "   ", "conteúdo"),
      InvalidProposedActionError,
    );
  });

  it("deve criar ActionProposal vinculada à missão", () => {
    const action = createReadProposedAction(1, "package.json");

    const proposal = createActionProposal("mission-123", [action]);

    assert.equal(proposal.missionId, "mission-123");

    assert.equal(proposal.status, "proposed");

    assert.equal(proposal.actions.length, 1);
  });

  it("deve gerar identificadores únicos para propostas distintas", () => {
    const action = createReadProposedAction(1, "package.json");

    const firstProposal = createActionProposal("mission-123", [action]);

    const secondProposal = createActionProposal("mission-123", [action]);

    assert.notEqual(firstProposal.id, secondProposal.id);
  });

  it("deve registrar instante válido de criação", () => {
    const proposal = createActionProposal("mission-123", [
      createReadProposedAction(1, "package.json"),
    ]);

    assert.equal(Number.isNaN(Date.parse(proposal.createdAt)), false);
  });

  it("deve rejeitar proposal sem missionId", () => {
    assert.throws(
      () =>
        createActionProposal("   ", [
          createReadProposedAction(1, "package.json"),
        ]),
      InvalidActionProposalError,
    );
  });

  it("deve rejeitar proposal sem ações", () => {
    assert.throws(
      () => createActionProposal("mission-123", []),
      InvalidActionProposalError,
    );
  });

  it("deve rejeitar ordens duplicadas", () => {
    assert.throws(
      () =>
        createActionProposal("mission-123", [
          createReadProposedAction(1, "package.json"),

          createCreateProposedAction(1, "health.ts", "export {};"),
        ]),
      InvalidActionProposalError,
    );
  });

  it("deve ordenar ações sem modificar o array original", () => {
    const secondAction = createCreateProposedAction(
      2,
      "health.ts",
      "export {};",
    );

    const firstAction = createReadProposedAction(1, "package.json");

    const sourceActions = [secondAction, firstAction];

    const proposal = createActionProposal("mission-123", sourceActions);

    /**
     * A proposta é ordenada.
     */
    assert.deepEqual(
      proposal.actions.map((action) => action.order),
      [1, 2],
    );

    /**
     * A entrada original continua
     * exatamente na mesma ordem.
     */
    assert.deepEqual(
      sourceActions.map((action) => action.order),
      [2, 1],
    );
  });
});
