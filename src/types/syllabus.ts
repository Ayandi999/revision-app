export interface SyllabusSchema {
  subjects: {
    [subjectName: string]: {
      topics: {
        [topicName: string]: string[];
      };
    };
  };
}

/**
 * Utility functions for extracting subjects, topics, and subtopics from any syllabus schema.
 * Can be used with local JSON files (like neet.json) or data fetched dynamically from an API.
 */
export const getSubjects = (data: SyllabusSchema | null | undefined): string[] => {
  if (!data || !data.subjects) return [];
  return Object.keys(data.subjects);
};

export const getTopics = (
  data: SyllabusSchema | null | undefined,
  subject: string | null | undefined
): string[] => {
  if (!data || !data.subjects || !subject || !data.subjects[subject]) return [];
  const topicsObj = data.subjects[subject].topics;
  return topicsObj ? Object.keys(topicsObj) : [];
};

export const getSubtopics = (
  data: SyllabusSchema | null | undefined,
  subject: string | null | undefined,
  topic: string | null | undefined
): string[] => {
  if (
    !data ||
    !data.subjects ||
    !subject ||
    !data.subjects[subject] ||
    !topic ||
    !data.subjects[subject].topics ||
    !data.subjects[subject].topics[topic]
  ) {
    return [];
  }
  return data.subjects[subject].topics[topic] || [];
};

export const getSubtopicsForTopics = (
  data: SyllabusSchema | null | undefined,
  subject: string | null | undefined,
  topics: string[]
): string[] => {
  if (!data || !data.subjects || !subject || !data.subjects[subject] || !topics.length) {
    return [];
  }
  const result: string[] = [];
  const seen = new Set<string>();
  const topicsObj = data.subjects[subject].topics;
  if (!topicsObj) return [];

  for (const t of topics) {
    const list = topicsObj[t] || [];
    for (const sub of list) {
      if (!seen.has(sub)) {
        seen.add(sub);
        result.push(sub);
      }
    }
  }
  return result;
};
