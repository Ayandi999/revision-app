import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "../database/db";
import { questions, type Question } from "../database/schema";

export type SearchSortBy = "most-correct" | "most-incorrect";

export interface SearchFilters {
  query?: string;
  subject?: string | null;
  topics?: string[];
  subtopics?: string[];
  sortBy?: SearchSortBy;
}

export interface SearchResult {
  questions: Question[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Searches questions with text matching and taxonomy filters.
 *
 * - Text search queries `extractedText` (from OCR), `personalNote`, and `subject`.
 * - Filters by subject, topics, and subtopics if specified.
 * - Supports pagination (page is 0-indexed).
 */
export async function searchQuestions(
  filters: SearchFilters,
  page: number = 0,
  pageSize: number = 30
): Promise<SearchResult> {
  try {
    const conditions = [];

    // 1. Text Query: search in extractedText, personalNote, or subject
    if (filters.query && filters.query.trim().length > 0) {
      const term = `%${filters.query.trim()}%`;
      conditions.push(
        or(
          like(questions.extractedText, term),
          like(questions.personalNote, term),
          like(questions.subject, term)
        )
      );
    }

    // 2. Subject filter
    if (filters.subject && filters.subject.trim().length > 0) {
      conditions.push(eq(questions.subject, filters.subject.trim()));
    }

    // 3. Topics filter (any match in JSON array)
    if (filters.topics && filters.topics.length > 0) {
      const topicConditions = filters.topics.map((topic) =>
        like(questions.topics, `%"${topic}"%`)
      );
      if (topicConditions.length === 1) {
        conditions.push(topicConditions[0]);
      } else if (topicConditions.length > 1) {
        conditions.push(or(...topicConditions));
      }
    }

    // 4. Subtopics filter (any match in JSON array)
    if (filters.subtopics && filters.subtopics.length > 0) {
      const subtopicConditions = filters.subtopics.map((subtopic) =>
        like(questions.subtopics, `%"${subtopic}"%`)
      );
      if (subtopicConditions.length === 1) {
        conditions.push(subtopicConditions[0]);
      } else if (subtopicConditions.length > 1) {
        conditions.push(or(...subtopicConditions));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch total count matching the criteria
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(questions);

    const countResult = whereClause
      ? await countQuery.where(whereClause)
      : await countQuery;

    const totalCount = countResult[0]?.count ?? 0;

    // Fetch paginated results
    const offset = page * pageSize;
    const baseQuery = db
      .select()
      .from(questions);

    const orderClause =
      filters.sortBy === "most-incorrect"
        ? [desc(questions.incorrect), asc(questions.correct), desc(questions.createdAt)]
        : [desc(questions.correct), asc(questions.incorrect), desc(questions.createdAt)];

    const rows = whereClause
      ? await baseQuery
          .where(whereClause)
          .orderBy(...orderClause)
          .limit(pageSize)
          .offset(offset)
      : await baseQuery
          .orderBy(...orderClause)
          .limit(pageSize)
          .offset(offset);

    const hasMore = offset + rows.length < totalCount;

    return {
      questions: rows,
      totalCount,
      hasMore,
    };
  } catch (error) {
    console.error("[searchQuestions] Search query failed:", error);
    return {
      questions: [],
      totalCount: 0,
      hasMore: false,
    };
  }
}
