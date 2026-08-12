#!/usr/bin/env node

import { runInspectCommand } from "./cli/commands/inspect-command.js";
import { runPlanCommand } from "./cli/commands/plan-command.js";
import { runStatusCommand } from "./cli/commands/status-command.js";
import { printHelp } from "./cli/help.js";

/**
 * Argumentos fornecidos para a VERA.
 *
 * Exemplo:
 *
 * vera plan "Adicionar endpoint GET /health"
 *
 * Resultado:
 *
 * command = "plan"
 * commandArguments = [
 *   "Adicionar endpoint GET /health"
 * ]
 */
const [command, ...commandArguments] = process.argv.slice(2);

/**
 * Roteamento principal da interface de linha de comando.
 *
 * O ponto de entrada conhece apenas quais comandos existem.
 * A implementação de cada comportamento permanece isolada
 * em seu respectivo módulo.
 */
switch (command) {
  case "status":
    runStatusCommand();
    break;

  case "inspect":
    await runInspectCommand(commandArguments);
    break;

  case "plan":
    await runPlanCommand(commandArguments);
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
