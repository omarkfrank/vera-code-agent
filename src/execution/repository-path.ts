import { realpath } from "node:fs/promises";

import {
  basename,
  dirname,
  join,
  posix,
  relative,
  resolve,
  sep,
  win32,
} from "node:path";

/**
 * Erro específico para tentativas de acessar
 * recursos fora da raiz autorizada.
 */
export class RepositoryPathViolationError extends Error {
  public readonly target: string;

  public constructor(target: string, message: string) {
    super(message);

    this.name = "RepositoryPathViolationError";

    this.target = target;
  }
}

/**
 * Detecta caminhos absolutos tanto no padrão
 * Windows quanto POSIX.
 *
 * Essa estratégia também evita que uma entrada
 * produzida em uma plataforma seja interpretada
 * perigosamente quando processada em outra.
 */
function isAnyAbsolutePath(target: string): boolean {
  return win32.isAbsolute(target) || posix.isAbsolute(target);
}

/**
 * Verifica se um caminho resolvido escapou
 * da raiz autorizada.
 */
function isOutsideRepository(
  repositoryRoot: string,
  candidatePath: string,
): boolean {
  const relativePath = relative(repositoryRoot, candidatePath);

  return (
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAnyAbsolutePath(relativePath)
  );
}

/**
 * Executa as validações sintáticas comuns
 * aos caminhos manipulados pela VERA.
 */
function validateRepositoryTarget(target: string): string {
  const normalizedTarget = target.trim();

  if (normalizedTarget.length === 0) {
    throw new RepositoryPathViolationError(
      target,
      "O caminho alvo não pode estar vazio.",
    );
  }

  /**
   * Caminhos absolutos nunca podem ser usados
   * em operações sobre o repositório.
   */
  if (isAnyAbsolutePath(normalizedTarget)) {
    throw new RepositoryPathViolationError(
      target,
      "Caminhos absolutos não são permitidos.",
    );
  }

  /**
   * Dois-pontos são bloqueados pela política
   * inicial da VERA.
   *
   * Além de tornar a política multiplataforma
   * mais previsível, isso impede caminhos NTFS
   * do tipo Alternate Data Stream:
   *
   * arquivo.txt:stream
   */
  if (normalizedTarget.includes(":")) {
    throw new RepositoryPathViolationError(
      target,
      'O caractere ":" não é permitido em caminhos de repositório.',
    );
  }

  return normalizedTarget;
}

/**
 * Resolve um caminho EXISTENTE garantindo
 * que ele permaneça dentro do repositório.
 *
 * Utilizado atualmente pelas Read Actions.
 */
export async function resolveProtectedRepositoryPath(
  repositoryRoot: string,
  target: string,
): Promise<string> {
  const normalizedTarget = validateRepositoryTarget(target);

  const repositoryRealPath = await realpath(repositoryRoot);

  const candidatePath = resolve(repositoryRealPath, normalizedTarget);

  if (isOutsideRepository(repositoryRealPath, candidatePath)) {
    throw new RepositoryPathViolationError(
      target,
      "O caminho solicitado está fora do repositório autorizado.",
    );
  }

  /**
   * O alvo já existe, portanto podemos
   * resolver seu caminho físico real.
   *
   * Isso protege inclusive contra links
   * simbólicos apontando para fora da raiz.
   */
  const targetRealPath = await realpath(candidatePath);

  if (isOutsideRepository(repositoryRealPath, targetRealPath)) {
    throw new RepositoryPathViolationError(
      target,
      "O caminho físico solicitado está fora do repositório autorizado.",
    );
  }

  return targetRealPath;
}

/**
 * Resolve um caminho destinado à CRIAÇÃO
 * de um novo arquivo.
 *
 * Diferentemente de uma leitura, o próprio
 * arquivo alvo ainda não existe. Portanto,
 * não é possível chamar realpath(target).
 *
 * A estratégia é:
 *
 * 1. resolver fisicamente a raiz;
 * 2. calcular o destino;
 * 3. resolver fisicamente o diretório pai;
 * 4. confirmar que o pai continua dentro da raiz;
 * 5. reconstruir o caminho final.
 *
 * Dessa forma um diretório pai que seja symlink
 * para fora do repositório também é bloqueado.
 */
export async function resolveProtectedRepositoryCreationPath(
  repositoryRoot: string,
  target: string,
): Promise<string> {
  const normalizedTarget = validateRepositoryTarget(target);

  const repositoryRealPath = await realpath(repositoryRoot);

  const candidatePath = resolve(repositoryRealPath, normalizedTarget);

  /**
   * CREATE deve apontar para um arquivo,
   * nunca para a própria raiz.
   */
  if (candidatePath === repositoryRealPath) {
    throw new RepositoryPathViolationError(
      target,
      "O caminho de criação precisa apontar para um arquivo dentro do repositório.",
    );
  }

  /**
   * Primeira barreira contra path traversal.
   */
  if (isOutsideRepository(repositoryRealPath, candidatePath)) {
    throw new RepositoryPathViolationError(
      target,
      "O caminho solicitado está fora do repositório autorizado.",
    );
  }

  const candidateParent = dirname(candidatePath);

  /**
   * O diretório pai precisa existir nesta
   * primeira versão do CREATE.
   *
   * Não criaremos diretórios implicitamente.
   */
  const parentRealPath = await realpath(candidateParent);

  /**
   * Esta é a barreira contra um diretório
   * simbólico que redirecione a gravação
   * para fora do repositório.
   */
  if (isOutsideRepository(repositoryRealPath, parentRealPath)) {
    throw new RepositoryPathViolationError(
      target,
      "O diretório físico de destino está fora do repositório autorizado.",
    );
  }

  return join(parentRealPath, basename(candidatePath));
}
