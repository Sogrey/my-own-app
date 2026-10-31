import type { Entity, WorkspaceState } from "../../types";

export function getWorkoutBodyPart(data: WorkspaceState, workout: Entity): string {
  const template = data.workoutTemplates.find((item) => item.id === workout.template_id);
  return String(workout.body_part || template?.body_part || workout.name || "训练");
}

export function getWorkoutExerciseSummaries(data: WorkspaceState, workout: Entity): string[] {
  const actualExercises = data.workoutExercises
    .filter((item) => item.workout_id === workout.id)
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
  if (actualExercises.length) {
    return actualExercises.map((exercise) => {
      const sets = data.workoutSets.filter((item) => item.workout_exercise_id === exercise.id);
      const completedSets = sets.filter((item) => Boolean(item.completed));
      const countedSets = completedSets.length ? completedSets : workout.status === "completed" ? sets : [];
      const repetitions = countedSets.reduce((sum, set) => sum + Number(set.reps || 0), 0);
      return repetitions ? `${exercise.name} ${repetitions}次` : String(exercise.name);
    });
  }
  return data.workoutTemplateExercises
    .filter((item) => item.template_id === workout.template_id)
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    .map((exercise) => `${exercise.name} ${exercise.target_sets || 1}×${exercise.target_reps || "自定"}`);
}

export function findPreviousSet(data: WorkspaceState, name: string, currentWorkoutId: string): Entity | null {
  const exercise = data.workoutExercises.find((item) => item.name === name && item.workout_id !== currentWorkoutId);
  if (!exercise) return null;
  return data.workoutSets.find((item) => item.workout_exercise_id === exercise.id && item.completed) ?? null;
}
