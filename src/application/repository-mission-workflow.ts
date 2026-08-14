import { addExecutionAction } from "../execution/add-execution-action.js";

import { executeMissionActions } from "../execution/execution-workflow.js";

import type {
  ExecutionAction,
  MissionExecution,
} from "../execution/mission-execution.js";

import { prepareMissionExecution } from "../execution/prepare-mission-execution.js";

import { createRepositoryMission } from "../mission/create-repository-mission.js";

import type { Mission } from "../mission/mission.js";

import type { MissionPlan } from "../planning/mission-plan.js";

import { planMission } from "../planning/planning-workflow.js";

import type { ActionProposalProvider } from "../proposal/action-proposal-provider.js";

import type { ActionProposal } from "../proposal/action-proposal.js";

import { materializeActionProposal } from "../proposal/proposal-materializer.js";

import type { MissionVerification } from "../verification/mission-verification.js";

import { verifyMissionExecution } from "../verification/verification-workflow.js";

/**
 * Fábrica responsável por produzir ações
 * operacionais depois que a execução possui
 * um identificador real.
 *
 * Este contrato permanece disponível para
 * preservar compatibilidade com o fluxo já
 * existente da aplicação.
 */
export type MissionActionFactory = (
  executionId: string,
) => ExecutionAction[] | Promise<ExecutionAction[]>;

/**
 * Resultado consolidado do ciclo completo
 * de uma missão de repositório.
 */
export interface RepositoryMissionWorkflowResult {
  mission: Mission;

  plan: MissionPlan;

  execution: MissionExecution;

  /**
   * Uma falha operacional durante EXECUTE
   * encerra a missão diretamente em failed.
   *
   * Nesse caso VERIFY não deve ser executado.
   */
  verification: MissionVerification | null;
}

/**
 * Resultado especializado do fluxo orientado
 * a ActionProposal.
 *
 * Além das evidências normais da missão,
 * preservamos também a proposta responsável
 * pela materialização das ações.
 */
export interface ProposalDrivenRepositoryMissionWorkflowResult extends RepositoryMissionWorkflowResult {
  proposal: ActionProposal;
}

/**
 * Contexto interno produzido antes que qualquer
 * ação operacional seja registrada.
 *
 * Neste ponto:
 *
 * - a missão já está planned;
 * - a execução já possui ID real;
 * - nenhuma ação foi registrada;
 * - nada foi executado.
 */
interface PreparedRepositoryMissionContext {
  mission: Mission;

  plan: MissionPlan;

  execution: MissionExecution;
}

/**
 * Executa as etapas comuns de preparação
 * de uma missão de repositório.
 *
 * UNDERSTAND
 *     ↓
 * PLAN
 *     ↓
 * PREPARE
 */
async function prepareRepositoryMissionContext(
  directory: string,
  requirement: string,
): Promise<PreparedRepositoryMissionContext> {
  /**
   * UNDERSTAND
   *
   * Inspeciona o repositório e cria
   * a missão inicialmente em received.
   */
  const receivedMission = await createRepositoryMission(directory, requirement);

  /**
   * PLAN
   *
   * received
   *   ↓
   * analyzing
   *   ↓
   * planned
   */
  const planningResult = planMission(receivedMission);

  /**
   * PREPARE
   *
   * Somente aqui nasce execution.id.
   */
  const preparedExecution = prepareMissionExecution(
    planningResult.mission,
    planningResult.plan,
  );

  return {
    mission: planningResult.mission,

    plan: planningResult.plan,

    execution: preparedExecution,
  };
}

/**
 * Registra, executa e verifica um conjunto
 * de ExecutionActions já materializadas.
 *
 * Esta função é compartilhada pelos dois
 * caminhos atualmente suportados:
 *
 * - MissionActionFactory;
 * - ActionProposalProvider.
 *
 * Importante:
 *
 * receber uma ExecutionAction não significa
 * confiar automaticamente nela.
 *
 * Cada ação continua obrigatoriamente passando
 * por addExecutionAction().
 */
async function completeRepositoryMissionWorkflow(
  context: PreparedRepositoryMissionContext,
  actions: readonly ExecutionAction[],
): Promise<RepositoryMissionWorkflowResult> {
  /**
   * AUTHORIZATION / REGISTRATION
   *
   * O orchestrator não contorna a camada
   * oficial de registro de ações.
   */
  let registeredExecution = context.execution;

  for (const action of actions) {
    registeredExecution = addExecutionAction(registeredExecution, action);
  }

  /**
   * EXECUTE
   *
   * A workflow operacional continua sendo
   * responsável por suas próprias políticas.
   */
  const executionResult = await executeMissionActions(
    context.mission,
    registeredExecution,
  );

  /**
   * Uma falha operacional produz:
   *
   * - Mission(failed);
   * - MissionExecution(failed);
   * - evidência failure.
   *
   * Como failed é terminal, VERIFY
   * não deve ser artificialmente executado.
   */
  if (executionResult.mission.status === "failed") {
    return {
      mission: executionResult.mission,

      plan: context.plan,

      execution: executionResult.execution,

      verification: null,
    };
  }

  /**
   * VERIFY
   *
   * Só chegamos aqui quando EXECUTE
   * terminou nominalmente em verifying.
   */
  const verificationResult = verifyMissionExecution(
    executionResult.mission,
    executionResult.execution,
  );

  return {
    mission: verificationResult.mission,

    plan: context.plan,

    execution: executionResult.execution,

    verification: verificationResult.verification,
  };
}

/**
 * Orquestra o ciclo já existente baseado
 * diretamente em uma MissionActionFactory.
 *
 * Este entry point permanece compatível com
 * consumidores atuais da VERA.
 *
 * Fluxo:
 *
 * requirement
 *     ↓
 * UNDERSTAND
 *     ↓
 * PLAN
 *     ↓
 * PREPARE
 *     ↓
 * MissionActionFactory
 *     ↓
 * addExecutionAction
 *     ↓
 * EXECUTE
 *     ↓
 * VERIFY
 */
export async function runRepositoryMissionWorkflow(
  directory: string,
  requirement: string,
  createActions: MissionActionFactory,
): Promise<RepositoryMissionWorkflowResult> {
  const context = await prepareRepositoryMissionContext(directory, requirement);

  /**
   * As ações são produzidas somente depois
   * da criação da execução real.
   */
  const actions = await createActions(context.execution.id);

  return completeRepositoryMissionWorkflow(context, actions);
}

/**
 * Orquestra o ciclo completo utilizando
 * uma ActionProposal como fonte das ações.
 *
 * Fluxo:
 *
 * requirement
 *     ↓
 * UNDERSTAND
 *     ↓
 * PLAN
 *     ↓
 * PREPARE
 *     ↓
 * ActionProposalProvider
 *     ↓
 * ActionProposal
 *     ↓
 * Proposal Materializer
 *     ↓
 * ExecutionAction[]
 *     ↓
 * addExecutionAction
 *     ↓
 * EXECUTE
 *     ↓
 * VERIFY
 *
 * A existência deste fluxo NÃO concede
 * autoridade adicional ao provider.
 *
 * O provider apenas propõe.
 *
 * O materializer apenas converte.
 *
 * A execução continua protegida pelas
 * mesmas camadas já existentes.
 */
export async function runRepositoryMissionWorkflowFromProposal<TInput>(
  directory: string,
  requirement: string,
  provider: ActionProposalProvider<TInput>,
  input: TInput,
): Promise<ProposalDrivenRepositoryMissionWorkflowResult> {
  const context = await prepareRepositoryMissionContext(directory, requirement);

  /**
   * PROPOSE
   *
   * A proposta é vinculada à missão planejada,
   * mas ainda não possui poder operacional.
   */
  const proposal = await provider.propose(context.mission.id, input);

  /**
   * MATERIALIZE
   *
   * A proposta recebe o executionId real
   * através das factories oficiais.
   *
   * Nenhuma ação é registrada ou executada
   * pelo materializer.
   */
  const actions = materializeActionProposal(proposal, context.execution);

  /**
   * A partir daqui seguimos exatamente
   * pelas mesmas barreiras utilizadas
   * pelo fluxo tradicional.
   */
  const workflowResult = await completeRepositoryMissionWorkflow(
    context,
    actions,
  );

  return {
    ...workflowResult,

    proposal,
  };
}
