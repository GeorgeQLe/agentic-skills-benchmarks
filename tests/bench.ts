#!/usr/bin/env node
import { runBenchCommand } from "./harness/cli/bench-command.js";

process.exit(runBenchCommand(process.argv.slice(2), process.env));
