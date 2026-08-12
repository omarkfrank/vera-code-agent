import { createRepositoryMission } from "../../mission/create-repository-mission.js";
import { planMission } from "../../planning/planning-workflow.js";

/**
 * Executa o comando `vera plan`.
 *
 * Fluxo operacional atual:
 *
 * requisito
 * → inspeção do repositório
 * → criação da Mission
 * → Planning Workflow
 * → Mission planejada
 * → MissionPlan
 *
 * A Planning Workflow é responsável por coordenar
 * as transições:
 *
 * received
 * → analyzing
 * → planned
 *
 * Nesta etapa ainda não existe utilização de
 * Inteligência Artificial.
 *
 * @param args Argumentos recebidos após o comando `plan`.
 */
export async function runPlanCommand(
  args: readonly string[] = [],
): Promise<void> {
  const currentDirectory = process.cwd();

  /**
   * Todos os argumentos fornecidos após `plan`
   * são reunidos para formar o requisito.
   *
   * Exemplo recomendado:
   *
   * vera plan "Adicionar endpoint GET /health com testes"
   */
  const requirement = args.join(" ").trim();

  /**
   * Uma missão sem requisito não possui significado
   * operacional e deve ser rejeitada antes de qualquer
   * inspeção ou planejamento.
   */
  if (requirement.length === 0) {
    console.error("[ERROR] Nenhum requisito foi informado para a missão.");

    console.error(
      'Exemplo: vera plan "Adicionar endpoint GET /health com testes"',
    );

    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("[MISSION] Registrando nova missão...");
  console.log("");

  try {
    /**
     * Cria a missão a partir do requisito e do estado
     * técnico atual do repositório.
     *
     * Toda Mission nasce no estado "received".
     */
    const mission = await createRepositoryMission(
      currentDirectory,
      requirement,
    );

    console.log(`ID:      ${mission.id}`);
    console.log(`Status:  ${mission.status}`);
    console.log(`Criada:  ${mission.createdAt}`);
    console.log("");

    console.log("Requisito:");
    console.log(`  ${mission.requirement}`);
    console.log("");

    /**
     * Contexto técnico associado à missão.
     */
    console.log("Contexto do repositório:");

    console.log(
      `  Projeto: ${
        mission.repositoryInspection.project.name ?? "não informado"
      }`,
    );

    console.log(`  Runtime: ${mission.repositoryInspection.project.runtime}`);

    console.log(
      `  Módulos: ${mission.repositoryInspection.project.moduleSystem}`,
    );

    console.log(
      `  Gerenciador: ${mission.repositoryInspection.project.packageManager}`,
    );

    const technologies = mission.repositoryInspection.technologies;

    console.log(
      `  Tecnologias: ${
        technologies.length > 0
          ? technologies.join(", ")
          : "nenhuma tecnologia conhecida"
      }`,
    );

    /**
     * A partir deste ponto entregamos a Mission para
     * a Planning Workflow.
     *
     * Internamente ela realiza:
     *
     * received
     * → analyzing
     * → criação do plano
     * → planned
     */
    console.log("");
    console.log("[ANALYZE] Iniciando análise da missão...");

    const planningResult = planMission(mission);

    /**
     * A Mission retornada pela workflow representa
     * o novo estado operacional.
     *
     * A Mission original continua intacta devido
     * ao modelo imutável adotado pelo lifecycle.
     */
    const plannedMission = planningResult.mission;

    const plan = planningResult.plan;

    console.log("[ANALYZE] Contexto analisado.");

    console.log("");
    console.log("[PLAN] Plano estabelecido.");
    console.log("");

    /**
     * Agora tanto a Mission quanto o MissionPlan
     * devem apresentar estado "planned".
     */
    console.log(`Status da missão: ${plannedMission.status}`);

    console.log(`Status do plano:  ${plan.status}`);

    console.log("");

    console.log("Objetivo:");
    console.log(`  ${plan.objective}`);
    console.log("");

    /**
     * Etapas ordenadas produzidas pelo Mission Planner.
     */
    console.log("Etapas:");

    for (const step of plan.steps) {
      console.log(`  ${step.order}. ${step.title}`);

      console.log(`     Tipo: ${step.type}`);

      console.log(`     ${step.description}`);
    }

    console.log("");

    /**
     * Riscos conhecidos antes da execução.
     */
    console.log("Riscos:");

    if (plan.risks.length === 0) {
      console.log("  Nenhum risco determinístico identificado.");
    } else {
      for (const risk of plan.risks) {
        console.log(`  - ${risk}`);
      }
    }

    console.log("");

    /**
     * Critérios que futuramente serão utilizados
     * pela Verification Workflow.
     */
    console.log("Critérios de aceitação:");

    for (const criterion of plan.acceptanceCriteria) {
      console.log(`  - ${criterion}`);
    }

    console.log("");
    console.log(`[STATUS] Missão ${plannedMission.status}.`);

    console.log("[READY] Plano pronto para a próxima etapa.");

    console.log("");
  } catch (error: unknown) {
    /**
     * Diretório sem package.json.
     */
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.error("[ERROR] package.json não encontrado.");

      console.error(`Diretório analisado: ${currentDirectory}`);

      process.exitCode = 1;
      return;
    }

    /**
     * package.json encontrado, porém contendo
     * JSON inválido.
     */
    if (error instanceof SyntaxError) {
      console.error("[ERROR] package.json contém JSON inválido.");

      process.exitCode = 1;
      return;
    }

    /**
     * Fallback para qualquer falha inesperada
     * durante criação ou planejamento da missão.
     */
    console.error("[ERROR] Não foi possível planejar a missão.");

    process.exitCode = 1;
  }
}
