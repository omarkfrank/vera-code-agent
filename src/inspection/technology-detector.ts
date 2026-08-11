/**
 * Representa somente as informações de dependências necessárias
 * para que a VERA consiga detectar tecnologias de um projeto Node.js.
 */
export interface DependencyManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Define a relação entre o nome de um pacote npm
 * e o nome apresentado pela VERA ao usuário.
 */
interface TechnologyDefinition {
  packageName: string;
  displayName: string;
}

/**
 * Catálogo inicial de tecnologias reconhecidas pela VERA.
 *
 * A ordem desta lista também determina a ordem em que
 * as tecnologias são apresentadas no diagnóstico.
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
 * Detecta tecnologias conhecidas a partir das dependências
 * declaradas no package.json.
 *
 * Esta função é pura:
 * - não acessa arquivos;
 * - não altera estado externo;
 * - sempre produz a mesma saída para a mesma entrada.
 *
 * Isso torna seu comportamento simples de testar isoladamente.
 */
export function detectTechnologies(manifest: DependencyManifest): string[] {
  const installedPackages = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
  };

  return KNOWN_TECHNOLOGIES.filter(
    ({ packageName }) => packageName in installedPackages,
  ).map(({ displayName }) => displayName);
}
