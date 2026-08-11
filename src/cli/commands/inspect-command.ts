import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import { detectPackageManager } from "../../inspection/package-manager-detector.js";
import { detectTechnologies } from "../../inspection/technology-detector.js";

/**
 * Estrutura dos principais campos do package.json
 * utilizados durante a inspeção do projeto.
 *
 * Os campos são opcionais porque nem todo package.json
 * precisa obrigatoriamente declarar todas essas informações.
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
 * Verifica se determinado arquivo ou diretório existe.
 *
 * A função executa somente leitura e não modifica
 * nenhuma informação do repositório analisado.
 *
 * @param path Caminho que deverá ser verificado.
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
 * Identifica arquivos conhecidos existentes na raiz
 * do repositório.
 *
 * Esses arquivos possuem duas responsabilidades:
 *
 * 1. compor o diagnóstico apresentado ao usuário;
 * 2. fornecer evidências para outros detectores da VERA.
 *
 * Por exemplo, package-lock.json pode indicar que
 * o projeto utiliza npm.
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
 * Executa a inspeção do diretório atual.
 *
 * Responsabilidades:
 *
 * - localizar e ler o package.json;
 * - coletar informações básicas do projeto;
 * - identificar arquivos conhecidos;
 * - delegar a detecção do gerenciador de pacotes;
 * - delegar a detecção das tecnologias;
 * - verificar a presença de um repositório Git;
 * - apresentar o diagnóstico no terminal.
 *
 * A operação é estritamente somente leitura.
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
     * Dessa forma conseguimos diferenciar:
     *
     * - arquivo inexistente;
     * - JSON inválido;
     * - outros erros inesperados.
     */
    const packageJsonContent = await readFile(packageJsonPath, "utf-8");

    const packageJson = JSON.parse(packageJsonContent) as PackageJson;

    /**
     * Primeiro coletamos os arquivos conhecidos.
     *
     * Essa informação será reutilizada pelos detectores,
     * evitando acessos desnecessários ao filesystem.
     */
    const configurationFiles = await detectConfigurationFiles(currentDirectory);

    /**
     * Com exactOptionalPropertyTypes habilitado,
     * uma propriedade opcional não deve ser enviada
     * explicitamente com valor undefined.
     *
     * Portanto, declaredPackageManager somente será
     * incluído no objeto quando realmente existir
     * no package.json.
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
     * A lógica responsável por reconhecer tecnologias
     * permanece isolada no detector especializado.
     */
    const technologies = detectTechnologies(packageJson);

    /**
     * Nesta etapa, a existência da pasta .git
     * é suficiente para identificar um repositório Git.
     */
    const hasGitRepository = await pathExists(join(currentDirectory, ".git"));

    const scripts = Object.keys(packageJson.scripts ?? {});

    /**
     * Informações gerais do projeto.
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
     * Scripts encontrados no package.json.
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
     * Tecnologias reconhecidas pela VERA.
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
     * Arquivos de configuração conhecidos.
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
     * Informações básicas do Git.
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
     * Fallback para falhas inesperadas.
     */
    console.error("[ERROR] Não foi possível inspecionar o projeto.");

    process.exitCode = 1;
  }
}
