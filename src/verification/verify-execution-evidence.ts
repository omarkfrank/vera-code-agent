import type { MissionExecution } from "../execution/mission-execution.js";

import type {
  MissionVerification,
  VerificationCheck,
} from "./mission-verification.js";

/**
 * Avalia deterministicamente as evidências
 * produzidas pela execução.
 */
export function verifyExecutionEvidence(
  execution: MissionExecution,
): MissionVerification {
  const checks: VerificationCheck[] = [];

  checks.push({
    id: "execution-completed",

    status: execution.status === "completed" ? "passed" : "failed",

    message:
      execution.status === "completed"
        ? "A execução foi concluída operacionalmente."
        : `A execução não está concluída. Status atual: ${execution.status}.`,
  });

  checks.push({
    id: "actions-present",

    status: execution.actions.length > 0 ? "passed" : "failed",

    message:
      execution.actions.length > 0
        ? `${execution.actions.length} ação(ões) registrada(s).`
        : "Nenhuma ação foi registrada na execução.",
  });

  /**
   * Cada ação precisa possuir exatamente
   * um resultado correspondente.
   */
  const everyActionHasSingleResult = execution.actions.every(
    (action) =>
      execution.results.filter((result) => result.actionId === action.id)
        .length === 1,
  );

  checks.push({
    id: "action-results-complete",

    status: everyActionHasSingleResult ? "passed" : "failed",

    message: everyActionHasSingleResult
      ? "Todas as ações possuem exatamente um resultado."
      : "Existem ações sem resultado ou com resultados duplicados.",
  });

  /**
   * Resultados órfãos são proibidos.
   */
  const noOrphanResults = execution.results.every((result) =>
    execution.actions.some((action) => action.id === result.actionId),
  );

  checks.push({
    id: "no-orphan-results",

    status: noOrphanResults ? "passed" : "failed",

    message: noOrphanResults
      ? "Todos os resultados pertencem a ações registradas."
      : "Existem resultados associados a ações não registradas.",
  });

  /**
   * Todo resultado precisa pertencer
   * à própria execução.
   */
  const resultsBelongToExecution = execution.results.every(
    (result) => result.executionId === execution.id,
  );

  checks.push({
    id: "result-execution-integrity",

    status: resultsBelongToExecution ? "passed" : "failed",

    message: resultsBelongToExecution
      ? "Todos os resultados pertencem à execução atual."
      : "Existem resultados associados a outra execução.",
  });

  /**
   * Todas as ações precisam ter terminado
   * com sucesso para aprovação.
   */
  const allResultsSuccessful =
    execution.results.length > 0 &&
    execution.results.every((result) => result.status === "success");

  checks.push({
    id: "all-results-successful",

    status: allResultsSuccessful ? "passed" : "failed",

    message: allResultsSuccessful
      ? "Todas as ações foram concluídas com sucesso."
      : "Uma ou mais ações não possuem resultado de sucesso.",
  });

  /**
   * Determinamos quais arquivos legitimamente
   * deveriam aparecer em affectedFiles.
   *
   * Somente Create Actions concluídas com
   * resultado success podem produzir mutação.
   */
  const successfulCreateTargets = execution.actions
    .filter((action) => action.type === "create")
    .filter((action) =>
      execution.results.some(
        (result) =>
          result.actionId === action.id && result.status === "success",
      ),
    )
    .map((action) => action.target);

  const expectedAffectedFiles = new Set(successfulCreateTargets);

  const actualAffectedFiles = new Set(execution.affectedFiles);

  /**
   * Duplicatas também representam
   * inconsistência de evidência.
   */
  const noAffectedFileDuplicates =
    actualAffectedFiles.size === execution.affectedFiles.length;

  const affectedFilesMatch =
    noAffectedFileDuplicates &&
    expectedAffectedFiles.size === actualAffectedFiles.size &&
    [...expectedAffectedFiles].every((target) =>
      actualAffectedFiles.has(target),
    );

  checks.push({
    id: "affected-files-integrity",

    status: affectedFilesMatch ? "passed" : "failed",

    message: affectedFilesMatch
      ? "Os arquivos afetados correspondem às Create Actions concluídas com sucesso."
      : "Os arquivos afetados não correspondem às mutações autorizadas pela execução.",
  });

  const verificationPassed = checks.every((check) => check.status === "passed");

  return {
    missionId: execution.missionId,

    executionId: execution.id,

    status: verificationPassed ? "passed" : "failed",

    verifiedAt: new Date().toISOString(),

    checks,
  };
}
