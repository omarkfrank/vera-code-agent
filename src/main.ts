import { runStatusCommand } from "./cli/commands/status-command.js";
import { printHelp } from "./cli/help.js";

/**
 * Argumentos enviados depois do nome do executável.
 *
 * Exemplo:
 *
 * npm run dev -- status
 *
 * process.argv:
 * [
 *   "caminho/node",
 *   "caminho/main.ts",
 *   "status"
 * ]
 *
 * Após slice(2):
 * ["status"]
 */
const [command] = process.argv.slice(2);

switch (command) {
  case "status":
    runStatusCommand();
    break;

  case "help":
    printHelp();
    break;

  case undefined:
    printHelp();
    break;

  default:
    console.error(`[ERROR] Comando desconhecido: "${command}".`);
    console.error('Use "vera help" para consultar os comandos disponíveis.');

    process.exitCode = 1;
}
