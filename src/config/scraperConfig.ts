const envHeadless = process.env.JOB_AGENT_HEADLESS;
const envMaxCards = Number.parseInt(process.env.JOB_AGENT_MAX_CARDS ?? '', 10);

export const scraperConfig = {
  headless: envHeadless ? envHeadless.toLowerCase() !== 'false' : true,
  maxCardsPerSearchTarget: Number.isFinite(envMaxCards) ? envMaxCards : 25,
  delayBetweenTargetsMs: 1500,
  continueOnTargetFailure: true,
};
