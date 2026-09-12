/**
 * Helper functions to safely retrieve all question and solution image URIs,
 * seamlessly supporting both new multi-image arrays and legacy single-image columns.
 *
 * All paths stored in the database are RELATIVE (e.g. "revision-app/images/questions/123.jpg").
 * This module resolves them to absolute file:// URIs at read-time using Paths.document.
 */

import { File, Paths } from "expo-file-system";

// ─── Path Resolution Utilities ────────────────────────────────────────────────

/**
 * Resolves a relative path (or legacy absolute URI) to a full file:// URI.
 *
 * - If the value is already an absolute `file://` or `http` URI, returns it as-is
 *   (backward-compatible with old rows that haven't been migrated yet).
 * - Otherwise, treats it as a relative path under `Paths.document` and constructs
 *   the absolute URI dynamically for the current device.
 */
export function resolveImageUri(pathOrUri: string | null | undefined): string | null {
  if (!pathOrUri) return null;

  // Already absolute — return unchanged (backward compat for unmigrated rows)
  if (pathOrUri.startsWith("file://") || pathOrUri.startsWith("http")) {
    return pathOrUri;
  }

  // Construct absolute URI from the device's document directory
  return new File(Paths.document, pathOrUri).uri;
}

/**
 * Strips the device-specific document directory prefix from an absolute file URI,
 * returning only the portable relative path.
 *
 * Example:
 *   "file:///data/user/0/com.app/files/revision-app/images/questions/123.jpg"
 *   → "revision-app/images/questions/123.jpg"
 *
 * If the URI doesn't start with the document directory, returns it unchanged
 * (safety net for unexpected values).
 */
export function toRelativePath(absoluteUri: string): string {
  if (!absoluteUri) return absoluteUri;

  const docPrefix = Paths.document.uri;

  // Normalize: ensure prefix ends with /
  const normalizedPrefix = docPrefix.endsWith("/") ? docPrefix : `${docPrefix}/`;

  if (absoluteUri.startsWith(normalizedPrefix)) {
    return absoluteUri.slice(normalizedPrefix.length);
  }

  // Fallback: if it doesn't match (e.g. already relative), return as-is
  return absoluteUri;
}

// ─── Image Holder Interfaces ──────────────────────────────────────────────────

export interface QuestionImageHolder {
  questionImageUris?: string[] | null;
  questionImageUri?: string | null;
}

export interface SolutionImageHolder {
  solutionImageUris?: string[] | null;
  solutionImageUri?: string | null;
}

// ─── Image Getter Functions ───────────────────────────────────────────────────

/**
 * Returns an array of **resolved absolute** question image URIs for a question item.
 * Falls back to legacy questionImageUri if questionImageUris is absent or empty.
 * All returned URIs are resolved to absolute file:// paths.
 */
export function getQuestionImages(q?: QuestionImageHolder | null): string[] {
  if (!q) return [];
  let rawUris: string[];
  if (Array.isArray(q.questionImageUris) && q.questionImageUris.length > 0) {
    rawUris = q.questionImageUris.filter(Boolean);
  } else if (q.questionImageUri) {
    rawUris = [q.questionImageUri];
  } else {
    return [];
  }
  // Resolve every path to an absolute URI
  return rawUris
    .map(resolveImageUri)
    .filter((uri): uri is string => uri !== null);
}

/**
 * Returns an array of **resolved absolute** solution image URIs for a question item.
 * Falls back to legacy solutionImageUri if solutionImageUris is absent or empty.
 * All returned URIs are resolved to absolute file:// paths.
 */
export function getSolutionImages(q?: SolutionImageHolder | null): string[] {
  if (!q) return [];
  let rawUris: string[];
  if (Array.isArray(q.solutionImageUris) && q.solutionImageUris.length > 0) {
    rawUris = q.solutionImageUris.filter(Boolean);
  } else if (q.solutionImageUri) {
    rawUris = [q.solutionImageUri];
  } else {
    return [];
  }
  // Resolve every path to an absolute URI
  return rawUris
    .map(resolveImageUri)
    .filter((uri): uri is string => uri !== null);
}
