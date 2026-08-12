import { createRepositoryMission } from "../../mission/create-repository-mission.js";
import { createMissionPlan } from "../../planning/mission-planner.js";

/**
 * Executa o comando `vera plan`.
 *
 * O fluxo atual é:
 *
 * requisito
 * → inspeção do repositório
 * → criação da missão
 * → criação do plano determinístico
 * → apresentação do plano
 *
 * Nesta fase ainda não existe utilização de
 * Inteligência Artificial.
 *
 * @param args Argumentos recebidos após o comando `plan`.
 */
export async function runPlanCommand(
  args: readonly string[] = [],
): Promise<void> {
  const currentDirectory = process.cwd();

  /**
   * Combina todos os argumentos recebidos após `plan`
   * em um único requisito.
   *
   * Isso permite chamadas como:
   *
   * vera plan "Adicionar endpoint GET /health"
   *
   * ou:
   *
   * vera plan Adicionar endpoint GET /health
   */
  const requirement = args.join(" ").trim();

  /**
   * Uma missão precisa obrigatoriamente possuir
   * um requisito válido.
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
     * Cria uma missão utilizando o contexto técnico
     * real do repositório atual.
     */
    const mission = await createRepositoryMission(
      currentDirectory,
      requirement,
    );

    /**
     * O Mission Planner recebe a missão já contextualizada
     * e produz um plano determinístico.
     *
     * Nenhum arquivo é alterado nesta operação.
     */
    const plan = createMissionPlan(mission);

    /**
     * Informações da missão.
     */
    console.log(`ID:      ${mission.id}`);
    console.log(`Status:  ${mission.status}`);
    console.log(`Criada:  ${mission.createdAt}`);
    console.log("");

    console.log("Requisito:");
    console.log(`  ${mission.requirement}`);
    console.log("");

    /**
     * Contexto técnico utilizado durante
     * a criação do plano.
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
     * Apresentação do plano.
     */
    console.log("");
    console.log("[PLAN] Plano estabelecido.");
    console.log("");

    console.log(`Status: ${plan.status}`);
    console.log("");

    console.log("Objetivo:");
    console.log(`  ${plan.objective}`);
    console.log("");

    /**
     * Etapas ordenadas do plano.
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
     *
     * Nesta fase são apresentados apenas riscos
     * derivados de evidências determinísticas.
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
     * Critérios objetivos utilizados futuramente
     * pela etapa de verificação da missão.
     */
    console.log("Critérios de aceitação:");

    for (const criterion of plan.acceptanceCriteria) {
      console.log(`  - ${criterion}`);
    }

    console.log("");
    console.log("[STATUS] Missão planejada.");

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
     * package.json encontrado, porém inválido.
     */
    if (error instanceof SyntaxError) {
      console.error("[ERROR] package.json contém JSON inválido.");

      process.exitCode = 1;
      return;
    }

    /**
     * Fallback para condições ainda não previstas.
     */
    console.error("[ERROR] Não foi possível planejar a missão.");

    process.exitCode = 1;
  }
}
