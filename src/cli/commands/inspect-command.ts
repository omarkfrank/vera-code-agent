import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Estrutura mínima esperada de um package.json.
 *
 * Os campos são opcionais porque a VERA deve conseguir
 * inspecionar projetos incompletos sem falhar imediatamente.
 */
interface PackageJson {
  name?: string;
  version?: string;
  type?: string;
}

/**
 * Executa uma inspeção inicial do diretório atual.
 *
 * Nesta primeira versão, a VERA apenas consulta o package.json
 * e apresenta informações básicas do projeto.
 *
 * Nenhum arquivo é modificado durante a inspeção.
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

    console.log(`Diretório: ${currentDirectory}`);
    console.log("");
    console.log("Projeto:");
    console.log(`  Nome: ${packageJson.name ?? "não informado"}`);
    console.log(`  Versão: ${packageJson.version ?? "não informada"}`);
    console.log(`  Runtime: Node.js`);
    console.log(
      `  Módulos: ${packageJson.type === "module" ? "ESM" : "CommonJS"}`,
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
