import * as Haptics from "expo-haptics";

/**
 * Trigger crisp, elevated selection feedback.
 * Uses ImpactFeedbackStyle.Medium instead of selectionAsync so tab clicks,
 * option picks, and toggle switches produce a noticeable, satisfying tactile click.
 */
export async function hapticSelection(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    try {
      await Haptics.selectionAsync();
    } catch {}
  }
}

/**
 * Trigger success notification feedback (soft double pulse).
 * Ideal for correct answers, saving questions, completing restore, and stopping voice notes.
 */
export async function hapticSuccess(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

/**
 * Trigger error notification feedback (distinct error vibration).
 * Ideal for incorrect answers, input validation failures, or operation errors.
 */
export async function hapticError(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {}
}

/**
 * Trigger warning notification feedback.
 * Ideal for delete actions or destructive warnings.
 */
export async function hapticWarning(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
}

/**
 * Trigger noticeable impact feedback.
 * Upgraded to Medium for a distinct tactile bump on card flips and navigation.
 */
export async function hapticImpactLight(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
}

/**
 * Trigger maximum intensity heavy impact feedback.
 * Upgraded to Heavy for a solid, prominent punch on primary action buttons
 * (e.g. Add Question, Record Voice Note, and Home CTA).
 */
export async function hapticImpactMedium(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {}
}

/**
 * Explicit heavy impact for maximum physical feedback.
 */
export async function hapticImpactHeavy(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {}
}
