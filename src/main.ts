#!/usr/bin/env node

import { runInspectCommand } from "./cli/commands/inspect-command.js";
import { runStatusCommand } from "./cli/commands/status-command.js";
import { printHelp } from "./cli/help.js";

/**
 * Argumentos recebidos pela CLI.
 *
 * Exemplo:
 *
 * vera inspect --json
 *
 * Após remover os dois primeiros argumentos internos do Node:
 *
 * command = "inspect"
 * commandArguments = ["--json"]
 */
const [command, ...commandArguments] = process.argv.slice(2);

/**
 * Direciona a execução para o comando solicitado.
 *
 * O arquivo principal conhece apenas os comandos disponíveis.
 * As regras específicas de cada comando permanecem isoladas
 * em seus próprios módulos.
 */
switch (command) {
  case "status":
    runStatusCommand();
    break;

  case "inspect":
    await runInspectCommand(commandArguments);
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
