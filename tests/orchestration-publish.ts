#!/usr/bin/env node
import { runPublisherCommand } from "./orchestration/publisher-cli.js";

const code = await runPublisherCommand(process.argv.slice(2));
process.exit(code);
