export interface InterviewAnswer {
  question: string;
  answer: string;
}

export function buildSkillPrompt(opts: {
  pack: string;
  skill: string;
  args: string;
  answers: InterviewAnswer[];
  approveAll?: boolean;
}): string {
  const { pack, skill, args, answers, approveAll = true } = opts;

  const answerBlock = answers
    .map(
      (a, i) =>
        `Q${i + 1}: "${a.question}"\nA${i + 1}: ${a.answer}`,
    )
    .join("\n\n");

  const approvalNote = approveAll
    ? "When you would normally present output for approval before writing, skip that step and write directly. Do not ask for confirmation — treat all drafts as approved."
    : "";

  return [
    `You have the ${pack} skill pack installed.`,
    `Run the ${skill} skill with arguments: ${args}`,
    "",
    "IMPORTANT: This is a non-interactive, headless test run.",
    "You MUST NOT use AskUserQuestion or any interactive prompting.",
    "Use the pre-answered responses below instead of asking the user.",
    approvalNote,
    "",
    "## Pre-Answered Interview Responses",
    "",
    answerBlock,
    "",
    "Use these answers as if the user provided them during the interview.",
    "Proceed through the entire skill workflow and write all output files.",
  ].join("\n");
}
