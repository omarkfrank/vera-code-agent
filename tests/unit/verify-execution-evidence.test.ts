import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MissionExecution } from "../../src/execution/mission-execution.js";

import { verifyExecutionEvidence } from "../../src/verification/verify-execution-evidence.js";

/**
 * Identificadores previsíveis utilizados
 * pelas fixtures desta suíte.
 *
 * Centralizamos esses valores para:
 *
 * - evitar duplicação de literais;
 * - facilitar manutenção;
 * - tornar os cenários mais legíveis;
 * - reduzir avisos de análise estática.
 */
const MISSION_ID = "verification-mission-001";

const EXECUTION_ID = "verification-execution-001";

const READ_ACTION_ID = "verification-action-001";

const CREATE_ACTION_ID = "verification-create-action-001";

const CREATE_TARGET = "health.ts";

const AFFECTED_FILES_CHECK_ID = "affected-files-integrity";

/**
 * Cria uma execução READ válida e completamente
 * concluída.
 *
 * Essa fixture representa o cenário baseline
 * utilizado pela maioria dos testes.
 */
function createSuccessfulExecution(): MissionExecution {
  return {
    id: EXECUTION_ID,

    missionId: MISSION_ID,

    status: "completed",

    preparedAt: "2026-08-12T12:00:00.000Z",

    actions: [
      {
        executionId: EXECUTION_ID,

        id: READ_ACTION_ID,

        order: 1,

        type: "read",

        description: "Ler package.json.",

        target: "package.json",
      },
    ],

    affectedFiles: [],

    results: [
      {
        executionId: EXECUTION_ID,

        actionId: READ_ACTION_ID,

        status: "success",

        message: "Arquivo lido com sucesso.",
      },
    ],
  };
}

/**
 * Cria uma execução CREATE válida.
 *
 * O argumento permite controlar quais arquivos
 * foram registrados em affectedFiles para que
 * possamos testar tanto cenários aprovados
 * quanto inconsistências de evidência.
 */
function createSuccessfulCreateExecution(
  affectedFiles: string[],
): MissionExecution {
  return {
    id: EXECUTION_ID,

    missionId: MISSION_ID,

    status: "completed",

    preparedAt: "2026-08-12T12:00:00.000Z",

    actions: [
      {
        executionId: EXECUTION_ID,

        id: CREATE_ACTION_ID,

        order: 1,

        type: "create",

        description: `Criar ${CREATE_TARGET}.`,

        target: CREATE_TARGET,

        content: "export {};\n",
      },
    ],

    affectedFiles,

    results: [
      {
        executionId: EXECUTION_ID,

        actionId: CREATE_ACTION_ID,

        status: "success",

        message: "Arquivo criado com sucesso.",
      },
    ],
  };
}

describe("verifyExecutionEvidence", () => {
  /**
   * Baseline:
   * uma execução totalmente consistente
   * deve ser aprovada.
   */
  it("deve aprovar execução com evidências válidas", () => {
    const verification = verifyExecutionEvidence(createSuccessfulExecution());

    assert.equal(verification.status, "passed");

    assert.equal(verification.missionId, MISSION_ID);

    assert.equal(verification.executionId, EXECUTION_ID);

    assert.equal(
      verification.checks.every((check) => check.status === "passed"),
      true,
    );
  });

  /**
   * VERIFY nunca deve aprovar uma execução
   * que ainda esteja operacionalmente ativa.
   */
  it("deve reprovar execução não concluída", () => {
    const execution: MissionExecution = {
      ...createSuccessfulExecution(),

      status: "executing",
    };

    const verification = verifyExecutionEvidence(execution);

    assert.equal(verification.status, "failed");

    assert.equal(
      verification.checks.find((check) => check.id === "execution-completed")
        ?.status,
      "failed",
    );
  });

  /**
   * Cada ação precisa possuir exatamente
   * uma evidência operacional correspondente.
   */
  it("deve reprovar ação sem resultado correspondente", () => {
    const execution: MissionExecution = {
      ...createSuccessfulExecution(),

      results: [],
    };

    const verification = verifyExecutionEvidence(execution);

    assert.equal(verification.status, "failed");

    assert.equal(
      verification.checks.find(
        (check) => check.id === "action-results-complete",
      )?.status,
      "failed",
    );
  });

  /**
   * Uma evidência operacional failure impede
   * a aprovação da missão.
   */
  it("deve reprovar resultado operacional failure", () => {
    const baseline = createSuccessfulExecution();

    const successfulResult = baseline.results[0];

    assert.ok(successfulResult);

    const execution: MissionExecution = {
      ...baseline,

      results: [
        {
          ...successfulResult,

          status: "failure",
        },
      ],
    };

    const verification = verifyExecutionEvidence(execution);

    assert.equal(verification.status, "failed");

    assert.equal(
      verification.checks.find((check) => check.id === "all-results-successful")
        ?.status,
      "failed",
    );
  });

  /**
   * Nenhuma evidência pode existir
   * sem uma ação correspondente.
   */
  it("deve reprovar resultado associado a ação inexistente", () => {
    const baseline = createSuccessfulExecution();

    const execution: MissionExecution = {
      ...baseline,

      results: [
        ...baseline.results,

        {
          executionId: EXECUTION_ID,

          actionId: "unknown-action",

          status: "success",

          message: "Resultado inválido.",
        },
      ],
    };

    const verification = verifyExecutionEvidence(execution);

    assert.equal(verification.status, "failed");

    assert.equal(
      verification.checks.find((check) => check.id === "no-orphan-results")
        ?.status,
      "failed",
    );
  });

  /**
   * Uma execução composta somente por READ
   * não pode registrar arquivos modificados.
   *
   * A regra agora é representada pelo check
   * mais geral affected-files-integrity.
   */
  it("deve reprovar arquivo afetado sem mutação autorizada", () => {
    const execution: MissionExecution = {
      ...createSuccessfulExecution(),

      affectedFiles: ["src/main.ts"],
    };

    const verification = verifyExecutionEvidence(execution);

    assert.equal(verification.status, "failed");

    assert.equal(
      verification.checks.find((check) => check.id === AFFECTED_FILES_CHECK_ID)
        ?.status,
      "failed",
    );
  });

  /**
   * CREATE com resultado success precisa possuir
   * exatamente seu target em affectedFiles.
   */
  it("deve aprovar Create Action com arquivo afetado correspondente", () => {
    const execution = createSuccessfulCreateExecution([CREATE_TARGET]);

    const verification = verifyExecutionEvidence(execution);

    assert.equal(verification.status, "passed");

    assert.equal(
      verification.checks.find((check) => check.id === AFFECTED_FILES_CHECK_ID)
        ?.status,
      "passed",
    );
  });

  /**
   * Uma Create Action concluída com sucesso
   * sem registro de mutação representa
   * inconsistência de evidência.
   */
  it("deve reprovar Create Action sem registro do arquivo afetado", () => {
    const execution = createSuccessfulCreateExecution([]);

    const verification = verifyExecutionEvidence(execution);

    assert.equal(verification.status, "failed");

    assert.equal(
      verification.checks.find((check) => check.id === AFFECTED_FILES_CHECK_ID)
        ?.status,
      "failed",
    );
  });

  /**
   * affectedFiles nunca pode conter um recurso
   * que não corresponda a uma mutação autorizada
   * e concluída com sucesso.
   */
  it("deve reprovar arquivo afetado sem Create Action correspondente", () => {
    const execution: MissionExecution = {
      ...createSuccessfulExecution(),

      affectedFiles: ["arquivo-nao-autorizado.ts"],
    };

    const verification = verifyExecutionEvidence(execution);

    assert.equal(verification.status, "failed");

    assert.equal(
      verification.checks.find((check) => check.id === AFFECTED_FILES_CHECK_ID)
        ?.status,
      "failed",
    );
  });
});
