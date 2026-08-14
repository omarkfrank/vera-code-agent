import assert from "node:assert/strict";

import { describe, it } from "node:test";

import { InvalidActionProposalError } from "../../src/proposal/create-action-proposal.js";

import { InvalidProposedActionError } from "../../src/proposal/create-proposed-action.js";

import { DeterministicActionProposalProvider } from "../../src/proposal/deterministic-action-proposal-provider.js";

import type { DeterministicProposalInput } from "../../src/proposal/deterministic-proposal-input.js";

describe("Deterministic Action Proposal Provider", () => {
  it("deve produzir proposta READ determinística", async () => {
    const provider = new DeterministicActionProposalProvider();

    const proposal = await provider.propose("mission-123", {
      operations: [
        {
          type: "read",

          target: "package.json",
        },
      ],
    });

    assert.equal(proposal.missionId, "mission-123");

    assert.equal(proposal.status, "proposed");

    assert.deepEqual(proposal.actions, [
      {
        order: 1,

        type: "read",

        target: "package.json",
      },
    ]);
  });

  it("deve produzir proposta CREATE determinística", async () => {
    const provider = new DeterministicActionProposalProvider();

    const proposal = await provider.propose("mission-123", {
      operations: [
        {
          type: "create",

          target: "health.ts",

          content: 'export const health = "ok";',
        },
      ],
    });

    assert.deepEqual(proposal.actions, [
      {
        order: 1,

        type: "create",

        target: "health.ts",

        content: 'export const health = "ok";',
      },
    ]);
  });

  it("deve converter múltiplas operações preservando sequência lógica", async () => {
    const provider = new DeterministicActionProposalProvider();

    const proposal = await provider.propose("mission-123", {
      operations: [
        {
          type: "read",

          target: "package.json",
        },

        {
          type: "read",

          target: "src/main.ts",
        },

        {
          type: "create",

          target: "health.ts",

          content: "export {};",
        },
      ],
    });

    assert.deepEqual(
      proposal.actions.map((action) => ({
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

  it("deve permitir conteúdo vazio em operação CREATE", async () => {
    const provider = new DeterministicActionProposalProvider();

    const proposal = await provider.propose("mission-123", {
      operations: [
        {
          type: "create",

          target: "empty.txt",

          content: "",
        },
      ],
    });

    const firstAction = proposal.actions[0];

    assert.equal(firstAction?.type, "create");

    if (firstAction?.type !== "create") {
      assert.fail("Era esperada uma ProposedCreateAction.");
    }

    assert.equal(firstAction.content, "");
  });

  it("deve normalizar targets através das factories oficiais", async () => {
    const provider = new DeterministicActionProposalProvider();

    const proposal = await provider.propose("mission-123", {
      operations: [
        {
          type: "read",

          target: " package.json ",
        },
      ],
    });

    assert.equal(proposal.actions[0]?.target, "package.json");
  });

  it("não deve modificar a entrada original", async () => {
    const provider = new DeterministicActionProposalProvider();

    const input: DeterministicProposalInput = {
      operations: [
        {
          type: "read",

          target: " package.json ",
        },

        {
          type: "create",

          target: "health.ts",

          content: "export {};",
        },
      ],
    };

    await provider.propose("mission-123", input);

    assert.equal(input.operations[0]?.target, " package.json ");

    assert.equal(input.operations[1]?.target, "health.ts");
  });

  it("deve rejeitar entrada sem operações", async () => {
    const provider = new DeterministicActionProposalProvider();

    await assert.rejects(
      provider.propose("mission-123", {
        operations: [],
      }),
      InvalidActionProposalError,
    );
  });

  it("deve propagar rejeição de operação estruturalmente inválida", async () => {
    const provider = new DeterministicActionProposalProvider();

    await assert.rejects(
      provider.propose("mission-123", {
        operations: [
          {
            type: "read",

            target: "   ",
          },
        ],
      }),
      InvalidProposedActionError,
    );
  });
});
