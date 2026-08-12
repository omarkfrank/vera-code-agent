import type { Mission } from "../mission/mission.js";
import type { MissionPlan, MissionPlanStep } from "./mission-plan.js";

/**
 * Cria um plano determinístico inicial
 * para uma missão da VERA.
 *
 * Nesta fase, nenhuma Inteligência Artificial
 * é utilizada.
 *
 * O planejamento é derivado exclusivamente
 * de informações conhecidas e verificáveis:
 *
 * - requisito original;
 * - tecnologias detectadas;
 * - scripts disponíveis;
 * - presença de Git.
 *
 * Essa abordagem estabelece o contrato estrutural
 * que a futura camada de IA deverá respeitar.
 *
 * @param mission Missão previamente criada.
 * @returns Plano estruturado da missão.
 */
export function createMissionPlan(mission: Mission): MissionPlan {
  const inspection = mission.repositoryInspection;

  const steps: MissionPlanStep[] = [];

  /**
   * Mantemos a ordem explicitamente controlada.
   *
   * Isso evita depender da posição dos elementos
   * adicionados em diferentes partes da função.
   */
  let nextOrder = 1;

  /**
   * Toda missão começa entendendo o contexto
   * técnico do repositório.
   */
  steps.push({
    order: nextOrder++,
    type: "analysis",
    title: "Analisar contexto do repositório",
    description:
      "Revisar a estrutura, tecnologias, scripts e configurações detectadas antes de propor alterações.",
  });

  /**
   * Antes de modificar arquivos, precisamos determinar
   * quais componentes poderão ser afetados pelo requisito.
   */
  steps.push({
    order: nextOrder++,
    type: "analysis",
    title: "Identificar componentes afetados",
    description: `Determinar quais partes do projeto precisam ser alteradas para atender ao requisito: ${mission.requirement}`,
  });

  /**
   * Etapa central de implementação.
   *
   * Neste momento ela representa apenas planejamento.
   * Nenhum arquivo será modificado.
   */
  steps.push({
    order: nextOrder++,
    type: "implementation",
    title: "Implementar requisito",
    description:
      "Aplicar as alterações necessárias respeitando a arquitetura e os padrões existentes do repositório.",
  });

  /**
   * Se o projeto possui infraestrutura de testes,
   * incluímos explicitamente uma etapa dedicada
   * à criação ou atualização dos testes.
   */
  if (inspection.scripts.includes("test")) {
    steps.push({
      order: nextOrder++,
      type: "test",
      title: "Adicionar ou atualizar testes",
      description:
        "Criar ou ajustar testes automatizados para cobrir o comportamento introduzido pela implementação.",
    });
  }

  /**
   * As verificações abaixo são adicionadas somente
   * quando o projeto declara os respectivos scripts.
   *
   * Assim, a VERA não presume que um comando existe.
   */
  if (inspection.scripts.includes("typecheck")) {
    steps.push({
      order: nextOrder++,
      type: "verification",
      title: "Executar verificação de tipos",
      description:
        'Executar o script "typecheck" e confirmar que não existem erros de tipagem.',
    });
  }

  if (inspection.scripts.includes("test")) {
    steps.push({
      order: nextOrder++,
      type: "verification",
      title: "Executar testes automatizados",
      description:
        'Executar o script "test" e confirmar que todos os testes são aprovados.',
    });
  }

  if (inspection.scripts.includes("build")) {
    steps.push({
      order: nextOrder++,
      type: "verification",
      title: "Executar build",
      description:
        'Executar o script "build" e confirmar que o projeto é compilado com sucesso.',
    });
  }

  /**
   * Os riscos também são derivados apenas
   * de evidências disponíveis.
   */
  const risks: string[] = [];

  if (!inspection.git.detected) {
    risks.push(
      "Repositório Git não detectado; alterações terão menor rastreabilidade.",
    );
  }

  if (inspection.technologies.length === 0) {
    risks.push(
      "Nenhuma tecnologia conhecida foi detectada; o planejamento poderá exigir análise adicional.",
    );
  }

  /**
   * Critérios de aceitação começam pelo próprio
   * requisito e são enriquecidos conforme as
   * capacidades verificáveis do projeto.
   */
  const acceptanceCriteria: string[] = [
    "O comportamento solicitado deve estar implementado conforme o requisito original.",
  ];

  if (inspection.scripts.includes("typecheck")) {
    acceptanceCriteria.push(
      'O script "typecheck" deve ser concluído sem erros.',
    );
  }

  if (inspection.scripts.includes("test")) {
    acceptanceCriteria.push('O script "test" deve ser concluído sem falhas.');
  }

  if (inspection.scripts.includes("build")) {
    acceptanceCriteria.push('O script "build" deve ser concluído com sucesso.');
  }

  return {
    missionId: mission.id,
    objective: mission.requirement,
    status: "planned",
    steps,
    risks,
    acceptanceCriteria,
  };
}
