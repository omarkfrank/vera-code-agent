import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Estrutura dos principais campos do package.json
 * utilizados durante a inspeção inicial do projeto.
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
 * Representa uma tecnologia que pode ser identificada
 * a partir das dependências declaradas no package.json.
 */
interface TechnologyDefinition {
  packageName: string;
  displayName: string;
}

/**
 * Tecnologias reconhecidas inicialmente pela VERA.
 *
 * Esta lista será ampliada gradualmente conforme novos
 * tipos de projetos forem suportados.
 */
const KNOWN_TECHNOLOGIES: TechnologyDefinition[] = [
  { packageName: "typescript", displayName: "TypeScript" },
  { packageName: "tsx", displayName: "TSX" },
  { packageName: "express", displayName: "Express" },
  { packageName: "fastify", displayName: "Fastify" },
  { packageName: "react", displayName: "React" },
  { packageName: "vite", displayName: "Vite" },
  { packageName: "vitest", displayName: "Vitest" },
  { packageName: "eslint", displayName: "ESLint" },
  { packageName: "prettier", displayName: "Prettier" },
];

/**
 * Verifica se um determinado arquivo ou diretório existe.
 *
 * A função apenas consulta o sistema de arquivos e não
 * realiza nenhuma alteração.
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
 * Detecta tecnologias conhecidas por meio das dependências
 * e dependências de desenvolvimento do projeto.
 */
function detectTechnologies(packageJson: PackageJson): string[] {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  return KNOWN_TECHNOLOGIES.filter(
    ({ packageName }) => packageName in dependencies,
  ).map(({ displayName }) => displayName);
}

/**
 * Identifica arquivos de configuração relevantes existentes
 * na raiz do repositório.
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
 * A operação é estritamente somente leitura.
 */
export async function runInspectCommand(): Promise<void> {
  const currentDirectory = process.cwd();
  const packageJsonPath = join(currentDirectory, "package.json");

  console.log("");
  console.log("[INSPECT] Analisando repositório...");
  console.log("");

  try {
    const packageJsonContent = await readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent) as PackageJson;

    const packageManager = await detectPackageManager(
      currentDirectory,
      packageJson.packageManager,
    );

    const technologies = detectTechnologies(packageJson);

    const configurationFiles = await detectConfigurationFiles(currentDirectory);

    const hasGitRepository = await pathExists(join(currentDirectory, ".git"));

    const scripts = Object.keys(packageJson.scripts ?? {});

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

    console.log("Scripts:");

    if (scripts.length === 0) {
      console.log("  Nenhum script encontrado.");
    } else {
      for (const script of scripts) {
        console.log(`  - ${script}`);
      }
    }

    console.log("");
    console.log("Tecnologias detectadas:");

    if (technologies.length === 0) {
      console.log("  Nenhuma tecnologia conhecida detectada.");
    } else {
      for (const technology of technologies) {
        console.log(`  - ${technology}`);
      }
    }

    console.log("");
    console.log("Arquivos de configuração:");

    if (configurationFiles.length === 0) {
      console.log("  Nenhum arquivo conhecido detectado.");
    } else {
      for (const file of configurationFiles) {
        console.log(`  - ${file}`);
      }
    }

    console.log("");
    console.log("Git:");
    console.log(
      `  ${hasGitRepository ? "Repositório detectado." : "Repositório não detectado."}`,
    );

    console.log("");
    console.log("[STATUS] Inspeção concluída.");
    console.log("");
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.error("[ERROR] package.json não encontrado.");
      console.error(`Diretório analisado: ${currentDirectory}`);

      process.exitCode = 1;
      return;
    }

    if (error instanceof SyntaxError) {
      console.error("[ERROR] package.json contém JSON inválido.");

      process.exitCode = 1;
      return;
    }

    console.error("[ERROR] Não foi possível inspecionar o projeto.");

    process.exitCode = 1;
  }
}
