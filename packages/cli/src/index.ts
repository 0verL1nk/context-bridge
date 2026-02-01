#!/usr/bin/env node
// import { Command } from "commander";
// import chalk from "chalk";
import { captureCommand } from "./commands/capture";
import { dumpCommand } from "./commands/dump";

const args = process.argv.slice(2);
const command = args[0];

console.log("Context Bridge CLI (v1.0.0)");

async function main() {
  switch (command) {
    case "capture":
      // Simple arg parsing for -o
      let output = "context.json";
      const oIndex = args.indexOf("-o");
      if (oIndex !== -1 && args[oIndex + 1]) output = args[oIndex + 1];
      await captureCommand({ output });
      break;
      
    case "dump":
      const file = args[1];
      if (!file) {
        console.error("Usage: cb dump <file>");
        process.exit(1);
      }
      await dumpCommand(file);
      break;

    default:
      console.log("Usage: cb <command> [options]");
      console.log("Commands: capture, dump");
      break;
  }
}

main().catch(err => console.error(err));
