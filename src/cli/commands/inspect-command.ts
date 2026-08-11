import { inspectRepository } from "../../inspection/repository-inspector.js";

/**
 * Opções atualmente suportadas pelo comando `inspect`.
 *
 * A lista permanece explícita para impedir que argumentos
 * desconhecidos sejam aceitos silenciosamente pela CLI.
 */
const SUPPORTED_OPTIONS = new Set(["--json"]);

/**
 * Executa o comando `vera inspect`.
 *
 * Responsabilidades desta camada:
 *
 * - interpretar os argumentos específicos do comando;
 * - validar opções desconhecidas;
 * - solicitar a inspeção estruturada do repositório;
 * - apresentar o resultado para humanos ou em JSON;
 * - transformar falhas técnicas em mensagens adequadas
 *   para quem utiliza a CLI.
 *
 * Toda a lógica responsável por compreender o repositório
 * permanece isolada no RepositoryInspector.
 *
 * @param args Argumentos adicionais recebidos pelo comando.
 */
export async function runInspectCommand(
  args: readonly string[] = [],
): Promise<void> {
  const currentDirectory = process.cwd();

  /**
   * Procura a primeira opção que ainda não seja
   * reconhecida pelo comando.
   *
   * Exemplo inválido:
   * vera inspect --jsno
   */
  const unknownOption = args.find(
    (argument) => !SUPPORTED_OPTIONS.has(argument),
  );

  if (unknownOption !== undefined) {
    console.error(
      `[ERROR] Opção desconhecida para inspect: "${unknownOption}".`,
    );

    console.error('Use "vera help" para consultar as opções disponíveis.');

    process.exitCode = 1;
    return;
  }

  /**
   * Define se a saída deverá ser produzida
   * como JSON estruturado.
   */
  const jsonOutput = args.includes("--json");

  /**
   * No modo JSON, nenhuma mensagem adicional deve
   * ser enviada para stdout.
   *
   * Isso garante que o resultado possa ser consumido
   * diretamente por scripts e outras ferramentas.
   */
  if (!jsonOutput) {
    console.log("");
    console.log("[INSPECT] Analisando repositório...");
    console.log("");
  }

  try {
    /**
     * O RepositoryInspector retorna dados estruturados
     * independentes do formato de apresentação.
     */
    const inspection = await inspectRepository(currentDirectory);

    /**
     * Saída estruturada destinada a automações,
     * integrações e futuras operações internas da VERA.
     */
    if (jsonOutput) {
      console.log(JSON.stringify(inspection, null, 2));

      return;
    }

    /**
     * A partir deste ponto temos somente
     * a apresentação destinada ao usuário humano.
     */
    console.log(`Diretório: ${inspection.directory}`);

    console.log("");

    console.log("Projeto:");

    console.log(`  Nome: ${inspection.project.name ?? "não informado"}`);

    console.log(`  Versão: ${inspection.project.version ?? "não informada"}`);

    console.log(`  Runtime: ${inspection.project.runtime}`);

    console.log(`  Módulos: ${inspection.project.moduleSystem}`);

    console.log(`  Gerenciador: ${inspection.project.packageManager}`);

    console.log("");

    /**
     * Scripts encontrados no package.json.
     */
    console.log("Scripts:");

    if (inspection.scripts.length === 0) {
      console.log("  Nenhum script encontrado.");
    } else {
      for (const script of inspection.scripts) {
        console.log(`  - ${script}`);
      }
    }

    console.log("");

    /**
     * Tecnologias reconhecidas pela VERA.
     */
    console.log("Tecnologias detectadas:");

    if (inspection.technologies.length === 0) {
      console.log("  Nenhuma tecnologia conhecida detectada.");
    } else {
      for (const technology of inspection.technologies) {
        console.log(`  - ${technology}`);
      }
    }

    console.log("");

    /**
     * Arquivos de configuração reconhecidos
     * durante a inspeção do repositório.
     */
    console.log("Arquivos de configuração:");

    if (inspection.configurationFiles.length === 0) {
      console.log("  Nenhum arquivo conhecido detectado.");
    } else {
      for (const file of inspection.configurationFiles) {
        console.log(`  - ${file}`);
      }
    }

    console.log("");

    /**
     * Informações iniciais sobre Git.
     */
    console.log("Git:");

    console.log(
      `  ${
        inspection.git.detected
          ? "Repositório detectado."
          : "Repositório não detectado."
      }`,
    );

    console.log("");
    console.log("[STATUS] Inspeção concluída.");
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
     * package.json encontrado, mas contendo
     * sintaxe JSON inválida.
     */
    if (error instanceof SyntaxError) {
      console.error("[ERROR] package.json contém JSON inválido.");

      process.exitCode = 1;
      return;
    }

    /**
     * Fallback para qualquer falha não prevista.
     */
    console.error("[ERROR] Não foi possível inspecionar o projeto.");

    process.exitCode = 1;
  }
}
