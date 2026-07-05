#!/usr/bin/env node
import { runDashboardCommand } from "./harness/cli/dashboard-command.js";

const code = await runDashboardCommand(process.argv.slice(2), process.env);
process.exit(code);
