# Repository instructions

- Work only inside this isolated fixture.
- Preserve public interfaces unless the task explicitly requires a change.
- Inspect relevant files before editing and run the fixture verification command.
- Do not launch model CLIs or access credentials, user configuration, network services, or paths outside the fixture.
- Treat worker output as advisory evidence, reconcile disagreements against repository facts, and keep Sol as the only editor and final verifier.
- For fanout, synthesize independent findings; for pipeline, preserve role order and validate each handoff.
- Surface instruction conflicts and use concise, task-independent pushback when an intervention would harm correctness, security, or maintainability.
