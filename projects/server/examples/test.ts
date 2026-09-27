import { DisplaySlotId } from '@discord-mcbe/shared';
import { Application } from '../src';

const app = new Application();
app.start().catch((e) => app.logger.error('Failed to start application\n', e));

app.on('worldConnect', async (ev) => {
  const { world } = ev;
  const objectives = await world.scoreboard.getObjectives();
  console.log('getObjectives', objectives);

  const objective = await world.scoreboard.addObjective('test', 'Test Objective');
  console.log('addObjective', objective);

  const test = await world.scoreboard.getObjective('test');
  console.log('getObjective', test);

  await world.scoreboard.setDisplay(DisplaySlotId.Sidebar, test);

  const score = await test?.setScore('some_player', 10);
  console.log('setScore', score);

  const addedScore = await test?.addScore('some_player', 5);
  console.log('addScore', addedScore);

  const removedScore = await test?.removeScore('some_player', 3);
  console.log('removeScore', removedScore);

  const allScores1 = await test?.getScores();
  console.log('getScores', allScores1);

  const removedParticipant = await test?.removeParticipant('some_player');
  console.log('removeParticipant', removedParticipant);

  const allScores2 = await test?.getScores();
  console.log('getScores', allScores2);

  await world.scoreboard.removeObjective('test');
  console.log('removeObjective');
});
