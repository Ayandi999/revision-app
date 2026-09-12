import type { SyllabusSchema } from "@/types/syllabus";

// ─── Static Syllabus Imports for Metro Bundler ──────────────────────────────────
import gate_ae from "@/assets/syllabus/gate_ae.json";
import gate_ag from "@/assets/syllabus/gate_ag.json";
import gate_ar from "@/assets/syllabus/gate_ar.json";
import gate_bm from "@/assets/syllabus/gate_bm.json";
import gate_bt from "@/assets/syllabus/gate_bt.json";
import gate_ce from "@/assets/syllabus/gate_ce.json";
import gate_ch from "@/assets/syllabus/gate_ch.json";
import gate_cs from "@/assets/syllabus/gate_cs.json";
import gate_cy from "@/assets/syllabus/gate_cy.json";
import gate_da from "@/assets/syllabus/gate_da.json";
import gate_ec from "@/assets/syllabus/gate_ec.json";
import gate_ee from "@/assets/syllabus/gate_ee.json";
import gate_es from "@/assets/syllabus/gate_es.json";
import gate_ey from "@/assets/syllabus/gate_ey.json";
import gate_ge from "@/assets/syllabus/gate_ge.json";
import gate_gg from "@/assets/syllabus/gate_gg.json";
import gate_in from "@/assets/syllabus/gate_in.json";
import gate_ma from "@/assets/syllabus/gate_ma.json";
import gate_me from "@/assets/syllabus/gate_me.json";
import gate_mn from "@/assets/syllabus/gate_mn.json";
import gate_mt from "@/assets/syllabus/gate_mt.json";
import gate_nm from "@/assets/syllabus/gate_nm.json";
import gate_pe from "@/assets/syllabus/gate_pe.json";
import gate_ph from "@/assets/syllabus/gate_ph.json";
import gate_pi from "@/assets/syllabus/gate_pi.json";
import gate_ra from "@/assets/syllabus/gate_ra.json";
import gate_st from "@/assets/syllabus/gate_st.json";
import gate_xe from "@/assets/syllabus/gate_xe.json";
import gate_xh from "@/assets/syllabus/gate_xh.json";
import gate_xl from "@/assets/syllabus/gate_xl.json";

import neet_ug from "@/assets/syllabus/neet.json";
import neet_pg from "@/assets/syllabus/neet_pg.json";

import jee_main from "@/assets/syllabus/jee_main.json";
import jee_advanced from "@/assets/syllabus/jee_advanced.json";

import self_study from "@/assets/syllabus/self_study.json";

export interface StreamOption {
  id: string;
  code?: string;
  name: string;
  description?: string;
}

export interface ExamOption {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string; // Ionicons name
  color: string;
  streams: StreamOption[];
}

export const EXAM_OPTIONS: ExamOption[] = [
  {
    id: "gate",
    name: "GATE",
    shortName: "GATE",
    description: "Graduate Aptitude Test in Engineering (30 Disciplines)",
    icon: "hardware-chip-outline",
    color: "#3B82F6",
    streams: [
      { id: "gate_cs", code: "CS", name: "Computer Science and Information Technology" },
      { id: "gate_da", code: "DA", name: "Data Science and Artificial Intelligence" },
      { id: "gate_ec", code: "EC", name: "Electronics and Communication Engineering" },
      { id: "gate_ee", code: "EE", name: "Electrical Engineering" },
      { id: "gate_me", code: "ME", name: "Mechanical Engineering" },
      { id: "gate_ce", code: "CE", name: "Civil Engineering" },
      { id: "gate_in", code: "IN", name: "Instrumentation Engineering" },
      { id: "gate_ch", code: "CH", name: "Chemical Engineering" },
      { id: "gate_bt", code: "BT", name: "Biotechnology" },
      { id: "gate_ae", code: "AE", name: "Aerospace Engineering" },
      { id: "gate_ag", code: "AG", name: "Agricultural Engineering" },
      { id: "gate_ar", code: "AR", name: "Architecture and Planning" },
      { id: "gate_bm", code: "BM", name: "Biomedical Engineering" },
      { id: "gate_cy", code: "CY", name: "Chemistry" },
      { id: "gate_es", code: "ES", name: "Environmental Science and Engineering" },
      { id: "gate_ey", code: "EY", name: "Ecology and Evolution" },
      { id: "gate_ge", code: "GE", name: "Geomatics Engineering" },
      { id: "gate_gg", code: "GG", name: "Geology and Geophysics" },
      { id: "gate_ma", code: "MA", name: "Mathematics" },
      { id: "gate_mn", code: "MN", name: "Mining Engineering" },
      { id: "gate_mt", code: "MT", name: "Metallurgical Engineering" },
      { id: "gate_nm", code: "NM", name: "Naval Architecture and Marine Engineering" },
      { id: "gate_pe", code: "PE", name: "Petroleum Engineering" },
      { id: "gate_ph", code: "PH", name: "Physics" },
      { id: "gate_pi", code: "PI", name: "Production and Industrial Engineering" },
      { id: "gate_ra", code: "RA", name: "Robotics and Automation" },
      { id: "gate_st", code: "ST", name: "Statistics" },
      { id: "gate_xe", code: "XE", name: "Engineering Sciences" },
      { id: "gate_xh", code: "XH", name: "Humanities and Social Sciences" },
      { id: "gate_xl", code: "XL", name: "Life Sciences" },
    ],
  },
  {
    id: "neet",
    name: "NEET",
    shortName: "NEET",
    description: "National Eligibility cum Entrance Test (Medical)",
    icon: "medkit-outline",
    color: "#10B981",
    streams: [
      { id: "neet_ug", code: "UG", name: "NEET UG (Undergraduate - MBBS/BDS)" },
      { id: "neet_pg", code: "PG", name: "NEET PG (Postgraduate - MD/MS)" },
    ],
  },
  {
    id: "jee",
    name: "JEE",
    shortName: "JEE",
    description: "Joint Entrance Examination (Engineering)",
    icon: "calculator-outline",
    color: "#F59E0B",
    streams: [
      { id: "jee_main", code: "Main", name: "JEE Main" },
      { id: "jee_advanced", code: "Adv", name: "JEE Advanced" },
    ],
  },
  {
    id: "self_study",
    name: "Self Study",
    shortName: "Self Study",
    description: "Personalized revision & custom subjects",
    icon: "school-outline",
    color: "#8B5CF6",
    streams: [
      { id: "self_study", code: "Custom", name: "General / Self-Paced" },
    ],
  },
];

// Mapping from streamId -> Syllabus JSON
const SYLLABUS_MAP: Record<string, any> = {
  gate_ae,
  gate_ag,
  gate_ar,
  gate_bm,
  gate_bt,
  gate_ce,
  gate_ch,
  gate_cs,
  gate_cy,
  gate_da,
  gate_ec,
  gate_ee,
  gate_es,
  gate_ey,
  gate_ge,
  gate_gg,
  gate_in,
  gate_ma,
  gate_me,
  gate_mn,
  gate_mt,
  gate_nm,
  gate_pe,
  gate_ph,
  gate_pi,
  gate_ra,
  gate_st,
  gate_xe,
  gate_xh,
  gate_xl,

  neet_ug,
  neet_pg,

  jee_main,
  jee_advanced,

  self_study,
};

export const DEFAULT_EXAM_ID = "neet";
export const DEFAULT_STREAM_ID = "neet_ug";

/**
 * Returns the syllabus for the given stream ID.
 * Falls back to an empty SyllabusSchema if not found or invalid.
 */
export function getSyllabusForStream(streamId: string): SyllabusSchema {
  const data = SYLLABUS_MAP[streamId];
  if (data && typeof data === "object" && data.subjects) {
    return data as SyllabusSchema;
  }
  return { subjects: {} };
}

/**
 * Helper to get readable titles for an exam + stream pair.
 */
export function getExamDisplayInfo(examId: string, streamId: string) {
  const exam = EXAM_OPTIONS.find((e) => e.id === examId) || EXAM_OPTIONS[1]; // NEET default
  const stream =
    exam.streams.find((s) => s.id === streamId) ||
    exam.streams[0] || { id: streamId, name: streamId, code: "" };

  return {
    exam,
    stream,
    fullTitle:
      exam.id === "self_study"
        ? "Self Study"
        : `${exam.shortName} • ${stream.code ? stream.code + " - " : ""}${stream.name}`,
    shortBadge: `${exam.shortName} ${stream.code || ""}`.trim(),
  };
}
