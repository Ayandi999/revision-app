export interface SyllabusSchema {
  subjects: {
    [subjectName: string]: {
      topics?: {
        [topicName: string]: string[];
      };
      // Allows direct topic-to-subtopics mapping if "topics" wrapper is omitted
      [topicOrKey: string]: any;
    };
  };
}

/**
 * Internal helper to retrieve the topics dictionary for a subject,
 * supporting both `{ "topics": { ... } }` and direct `{ [topicName]: string[] }`.
 */
function getSubjectTopicsMap(
  data: SyllabusSchema | null | undefined,
  subject: string | null | undefined
): Record<string, string[]> | null {
  if (!data || !data.subjects || !subject || !data.subjects[subject]) return null;
  const subjObj = data.subjects[subject];
  if (subjObj.topics && typeof subjObj.topics === "object") {
    return subjObj.topics;
  }
  // Otherwise, the subject object itself contains the topics as keys
  return subjObj as Record<string, string[]>;
}

/**
 * Utility functions for extracting subjects, topics, and subtopics from any syllabus schema.
 * Can be used with local JSON files (like neet.json, gate_cs.json) or data fetched dynamically from an API.
 */
export const getSubjects = (data: SyllabusSchema | null | undefined): string[] => {
  if (!data || !data.subjects) return [];
  return Object.keys(data.subjects);
};

export const getTopics = (
  data: SyllabusSchema | null | undefined,
  subject: string | null | undefined
): string[] => {
  const topicsObj = getSubjectTopicsMap(data, subject);
  if (!topicsObj) return [];
  return Object.keys(topicsObj).filter((k) => k !== "topics");
};

export const getSubtopics = (
  data: SyllabusSchema | null | undefined,
  subject: string | null | undefined,
  topic: string | null | undefined
): string[] => {
  if (!topic) return [];
  const topicsObj = getSubjectTopicsMap(data, subject);
  if (!topicsObj || !topicsObj[topic] || !Array.isArray(topicsObj[topic])) {
    return [];
  }
  return topicsObj[topic] || [];
};

export const getSubtopicsForTopics = (
  data: SyllabusSchema | null | undefined,
  subject: string | null | undefined,
  topics: string[]
): string[] => {
  if (!topics.length) return [];
  const topicsObj = getSubjectTopicsMap(data, subject);
  if (!topicsObj) return [];

  const result: string[] = [];
  const seen = new Set<string>();

  for (const t of topics) {
    const list = topicsObj[t];
    if (Array.isArray(list)) {
      for (const sub of list) {
        if (!seen.has(sub)) {
          seen.add(sub);
          result.push(sub);
        }
      }
    }
  }
  return result;
};
