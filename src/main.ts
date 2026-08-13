#!/usr/bin/env node

import { runInspectCommand } from "./cli/commands/inspect-command.js";

import { runPlanCommand } from "./cli/commands/plan-command.js";

import { runRunCommand } from "./cli/commands/run-command.js";

import { runStatusCommand } from "./cli/commands/status-command.js";

import { printHelp } from "./cli/help.js";

/**
 * Argumentos fornecidos para a VERA.
 *
 * Exemplos:
 *
 * vera plan "Adicionar endpoint GET /health"
 *
 * vera run read package.json
 *
 * vera run create health.ts --content "export {};"
 */
const [command, ...commandArguments] = process.argv.slice(2);

/**
 * Roteamento principal da interface
 * de linha de comando.
 *
 * O ponto de entrada conhece apenas
 * os comandos disponíveis.
 *
 * As implementações permanecem isoladas
 * em seus respectivos módulos.
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

  case "run":
    await runRunCommand(commandArguments);
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
