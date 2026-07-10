#!/usr/bin/env node
import { runOrchestrationCommand } from "./orchestration/cli.js";

const code = await runOrchestrationCommand(process.argv.slice(2));
process.exit(code);
