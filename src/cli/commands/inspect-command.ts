import { inspectRepository } from "../../inspection/repository-inspector.js";

/**
 * Executa o comando `vera inspect`.
 *
 * A responsabilidade desta camada é limitada a:
 *
 * - solicitar a inspeção do diretório atual;
 * - apresentar o resultado no terminal;
 * - transformar falhas técnicas em mensagens adequadas
 *   para quem está utilizando a CLI.
 *
 * Toda a lógica responsável por compreender o repositório
 * pertence ao módulo de inspeção.
 */
export async function runInspectCommand(): Promise<void> {
  const currentDirectory = process.cwd();

  console.log("");
  console.log("[INSPECT] Analisando repositório...");
  console.log("");

  try {
    /**
     * O comando não precisa conhecer detalhes sobre
     * package.json, filesystem ou detectores individuais.
     *
     * Ele apenas solicita a inspeção.
     */
    const inspection = await inspectRepository(currentDirectory);

    console.log(`Diretório: ${inspection.directory}`);

    console.log("");

    /**
     * Informações gerais do projeto.
     */
    console.log("Projeto:");

    console.log(`  Nome: ${inspection.project.name ?? "não informado"}`);

    console.log(`  Versão: ${inspection.project.version ?? "não informada"}`);

    console.log(`  Runtime: ${inspection.project.runtime}`);

    console.log(`  Módulos: ${inspection.project.moduleSystem}`);

    console.log(`  Gerenciador: ${inspection.project.packageManager}`);

    console.log("");

    /**
     * Scripts identificados no package.json.
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
     * Arquivos de configuração identificados.
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
     * Informações iniciais do Git.
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
     * package.json encontrado, porém contendo
     * sintaxe JSON inválida.
     */
    if (error instanceof SyntaxError) {
      console.error("[ERROR] package.json contém JSON inválido.");

      process.exitCode = 1;
      return;
    }

    /**
     * Qualquer falha não prevista permanece explícita
     * sem expor detalhes internos desnecessários.
     */
    console.error("[ERROR] Não foi possível inspecionar o projeto.");

    process.exitCode = 1;
  }
}
