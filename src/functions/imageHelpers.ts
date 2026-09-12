/**
 * Helper functions to safely retrieve all question and solution image URIs,
 * seamlessly supporting both new multi-image arrays and legacy single-image columns.
 */

export interface QuestionImageHolder {
  questionImageUris?: string[] | null;
  questionImageUri?: string | null;
}

export interface SolutionImageHolder {
  solutionImageUris?: string[] | null;
  solutionImageUri?: string | null;
}

/**
 * Returns an array of question image URIs for a question item.
 * Falls back to legacy questionImageUri if questionImageUris is absent or empty.
 */
export function getQuestionImages(q?: QuestionImageHolder | null): string[] {
  if (!q) return [];
  if (Array.isArray(q.questionImageUris) && q.questionImageUris.length > 0) {
    return q.questionImageUris.filter(Boolean);
  }
  if (q.questionImageUri) {
    return [q.questionImageUri];
  }
  return [];
}

/**
 * Returns an array of solution image URIs for a question item.
 * Falls back to legacy solutionImageUri if solutionImageUris is absent or empty.
 */
export function getSolutionImages(q?: SolutionImageHolder | null): string[] {
  if (!q) return [];
  if (Array.isArray(q.solutionImageUris) && q.solutionImageUris.length > 0) {
    return q.solutionImageUris.filter(Boolean);
  }
  if (q.solutionImageUri) {
    return [q.solutionImageUri];
  }
  return [];
}
