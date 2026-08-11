import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import { detectTechnologies } from "../../inspection/technology-detector.js";

/**
 * Estrutura dos principais campos do package.json
 * utilizados durante a inspeção inicial do projeto.
 *
 * Os campos são opcionais porque a VERA deve conseguir
 * lidar com projetos incompletos ou manifests parcialmente
 * configurados sem interromper a inspeção imediatamente.
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
 * Verifica se um determinado arquivo ou diretório existe.
 *
 * A operação é somente leitura e não altera nenhuma
 * informação dentro do repositório analisado.
 *
 * @param path Caminho absoluto ou relativo a ser verificado.
 * @returns true quando o caminho existe; false caso contrário.
 */
async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Identifica o gerenciador de pacotes utilizado pelo projeto.
 *
 * A prioridade de detecção é:
 *
 * 1. Campo "packageManager" do package.json;
 * 2. Arquivo de lock presente na raiz do projeto.
 *
 * Dessa forma, a VERA utiliza primeiro uma declaração
 * explícita e recorre ao sistema de arquivos como fallback.
 */
async function detectPackageManager(
  directory: string,
  packageManager?: string,
): Promise<string> {
  if (packageManager) {
    return packageManager.split("@")[0] ?? packageManager;
  }

  if (await pathExists(join(directory, "package-lock.json"))) {
    return "npm";
  }

  if (await pathExists(join(directory, "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  if (await pathExists(join(directory, "yarn.lock"))) {
    return "yarn";
  }

  if (
    (await pathExists(join(directory, "bun.lock"))) ||
    (await pathExists(join(directory, "bun.lockb")))
  ) {
    return "bun";
  }

  return "não identificado";
}

/**
 * Identifica arquivos de configuração relevantes existentes
 * na raiz do repositório.
 *
 * Esta lista representa apenas os arquivos reconhecidos
 * atualmente pela VERA e poderá ser ampliada conforme
 * novos ecossistemas forem suportados.
 */
async function detectConfigurationFiles(directory: string): Promise<string[]> {
  const candidates = [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lock",
    "bun.lockb",
    "tsconfig.json",
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.ts",
    "prettier.config.js",
    "prettier.config.mjs",
    ".prettierrc",
    ".gitignore",
    ".env.example",
  ];

  const detectedFiles: string[] = [];

  for (const candidate of candidates) {
    if (await pathExists(join(directory, candidate))) {
      detectedFiles.push(candidate);
    }
  }

  return detectedFiles;
}

/**
 * Executa a inspeção inicial do diretório atual.
 *
 * Responsabilidades deste comando:
 *
 * - localizar e ler o package.json;
 * - identificar informações gerais do projeto;
 * - descobrir o gerenciador de pacotes;
 * - solicitar a detecção de tecnologias;
 * - identificar arquivos de configuração;
 * - verificar a existência de um repositório Git;
 * - apresentar o diagnóstico no terminal.
 *
 * A operação é estritamente somente leitura.
 * Nenhum arquivo ou configuração do projeto analisado é alterado.
 */
export async function runInspectCommand(): Promise<void> {
  const currentDirectory = process.cwd();
  const packageJsonPath = join(currentDirectory, "package.json");

  console.log("");
  console.log("[INSPECT] Analisando repositório...");
  console.log("");

  try {
    /**
     * Lemos o package.json como texto antes de convertê-lo.
     *
     * Essa abordagem nos permite tratar separadamente:
     * - arquivo inexistente;
     * - JSON inválido;
     * - outros erros inesperados.
     */
    const packageJsonContent = await readFile(packageJsonPath, "utf-8");

    const packageJson = JSON.parse(packageJsonContent) as PackageJson;

    /**
     * As diferentes informações do projeto são obtidas
     * por componentes especializados.
     *
     * A detecção de tecnologias, por exemplo, já foi
     * extraída para um módulo próprio.
     */
    const packageManager = await detectPackageManager(
      currentDirectory,
      packageJson.packageManager,
    );

    const technologies = detectTechnologies(packageJson);

    const configurationFiles = await detectConfigurationFiles(currentDirectory);

    const hasGitRepository = await pathExists(join(currentDirectory, ".git"));

    const scripts = Object.keys(packageJson.scripts ?? {});

    /**
     * Apresentação das informações gerais do projeto.
     */
    console.log(`Diretório: ${currentDirectory}`);
    console.log("");

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
     * Tecnologias reconhecidas a partir das dependências
     * declaradas no package.json.
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
     * Arquivos de configuração conhecidos encontrados
     * na raiz do projeto.
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
     * Verificação básica da presença do diretório .git.
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
     * Tratamento específico para ausência do package.json.
     */
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.error("[ERROR] package.json não encontrado.");
      console.error(`Diretório analisado: ${currentDirectory}`);

      process.exitCode = 1;
      return;
    }

    /**
     * JSON.parse lança SyntaxError quando o conteúdo
     * do package.json não representa um JSON válido.
     */
    if (error instanceof SyntaxError) {
      console.error("[ERROR] package.json contém JSON inválido.");

      process.exitCode = 1;
      return;
    }

    /**
     * Fallback para qualquer condição inesperada.
     *
     * Evitamos expor detalhes internos desnecessários
     * nesta fase inicial da CLI.
     */
    console.error("[ERROR] Não foi possível inspecionar o projeto.");

    process.exitCode = 1;
  }
}
