import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { detectConfigurationFiles } from "../../inspection/configuration-file-detector.js";
import { detectPackageManager } from "../../inspection/package-manager-detector.js";
import { detectTechnologies } from "../../inspection/technology-detector.js";

/**
 * Estrutura dos principais campos do package.json
 * utilizados durante a inspeção do projeto.
 *
 * Os campos são opcionais porque a VERA deve conseguir
 * analisar manifests parcialmente configurados sem assumir
 * que todas as propriedades estarão presentes.
 */
interface PackageJson {
  name?: string;
  version?: string;
  type?: string;
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Executa a inspeção do diretório atual.
 *
 * Responsabilidades deste comando:
 *
 * - localizar e ler o package.json;
 * - coletar os nomes existentes na raiz do projeto;
 * - delegar a detecção dos arquivos de configuração;
 * - delegar a detecção do gerenciador de pacotes;
 * - delegar a detecção das tecnologias;
 * - verificar a presença do diretório .git;
 * - apresentar o diagnóstico no terminal.
 *
 * O comando atua somente em modo leitura.
 * Nenhum arquivo do repositório analisado é modificado.
 */
export async function runInspectCommand(): Promise<void> {
  const currentDirectory = process.cwd();

  const packageJsonPath = join(currentDirectory, "package.json");

  console.log("");
  console.log("[INSPECT] Analisando repositório...");
  console.log("");

  try {
    /**
     * O package.json é lido inicialmente como texto.
     *
     * Isso permite tratar separadamente:
     * - arquivo inexistente;
     * - JSON inválido;
     * - falhas inesperadas.
     */
    const packageJsonContent = await readFile(packageJsonPath, "utf-8");

    const packageJson = JSON.parse(packageJsonContent) as PackageJson;

    /**
     * Coletamos a raiz do repositório apenas uma vez.
     *
     * Os nomes encontrados poderão alimentar diferentes
     * detectores sem provocar múltiplas consultas ao filesystem.
     */
    const rootEntries = await readdir(currentDirectory, {
      withFileTypes: true,
    });

    const rootEntryNames = rootEntries.map((entry) => entry.name);

    /**
     * A regra que define quais arquivos são relevantes
     * pertence agora a um detector especializado.
     */
    const configurationFiles = detectConfigurationFiles(rootEntryNames);

    /**
     * O detector recebe somente as evidências necessárias.
     *
     * Com exactOptionalPropertyTypes habilitado,
     * declaredPackageManager só é incluído quando existe
     * realmente uma string declarada no package.json.
     */
    const packageManager = detectPackageManager({
      files: configurationFiles,

      ...(packageJson.packageManager !== undefined
        ? {
            declaredPackageManager: packageJson.packageManager,
          }
        : {}),
    });

    /**
     * A identificação das tecnologias continua isolada
     * em seu próprio componente.
     */
    const technologies = detectTechnologies(packageJson);

    /**
     * Como a raiz já foi consultada, não precisamos realizar
     * um segundo acesso apenas para procurar o diretório .git.
     */
    const hasGitRepository = rootEntryNames.includes(".git");

    const scripts = Object.keys(packageJson.scripts ?? {});

    console.log(`Diretório: ${currentDirectory}`);
    console.log("");

    /**
     * Informações gerais do projeto.
     */
    console.log("Projeto:");

    console.log(`  Nome: ${packageJson.name ?? "não informado"}`);

    console.log(`  Versão: ${packageJson.version ?? "não informada"}`);

    console.log("  Runtime: Node.js");

    console.log(
      `  Módulos: ${packageJson.type === "module" ? "ESM" : "CommonJS"}`,
    );

    console.log(`  Gerenciador: ${packageManager}`);

    console.log("");

    /**
     * Scripts disponíveis no package.json.
     */
    console.log("Scripts:");

    if (scripts.length === 0) {
      console.log("  Nenhum script encontrado.");
    } else {
      for (const script of scripts) {
        console.log(`  - ${script}`);
      }
    }

    console.log("");

    /**
     * Tecnologias reconhecidas nas dependências.
     */
    console.log("Tecnologias detectadas:");

    if (technologies.length === 0) {
      console.log("  Nenhuma tecnologia conhecida detectada.");
    } else {
      for (const technology of technologies) {
        console.log(`  - ${technology}`);
      }
    }

    console.log("");

    /**
     * Arquivos conhecidos existentes na raiz.
     */
    console.log("Arquivos de configuração:");

    if (configurationFiles.length === 0) {
      console.log("  Nenhum arquivo conhecido detectado.");
    } else {
      for (const file of configurationFiles) {
        console.log(`  - ${file}`);
      }
    }

    console.log("");

    /**
     * Nesta fase, a presença de .git na raiz é suficiente
     * para indicar que estamos dentro de um repositório Git.
     */
    console.log("Git:");

    console.log(
      `  ${
        hasGitRepository
          ? "Repositório detectado."
          : "Repositório não detectado."
      }`,
    );

    console.log("");
    console.log("[STATUS] Inspeção concluída.");
    console.log("");
  } catch (error: unknown) {
    /**
     * O diretório não possui package.json.
     */
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.error("[ERROR] package.json não encontrado.");

      console.error(`Diretório analisado: ${currentDirectory}`);

      process.exitCode = 1;
      return;
    }

    /**
     * O arquivo existe, porém não contém JSON válido.
     */
    if (error instanceof SyntaxError) {
      console.error("[ERROR] package.json contém JSON inválido.");

      process.exitCode = 1;
      return;
    }

    /**
     * Fallback para qualquer falha inesperada.
     */
    console.error("[ERROR] Não foi possível inspecionar o projeto.");

    process.exitCode = 1;
  }
}
