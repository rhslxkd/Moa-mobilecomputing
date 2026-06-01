/**
 * src/contexts/ProjectContext.tsx
 *
 * 앱 전체에서 프로젝트 데이터를 공유하는 Context
 *
 * 사용법:
 *   const { projects, currentProject, setCurrentProject } = useProject();
 */

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

// ── 타입 ──────────────────────────────────
export interface Member {
  id: string;
  name: string;
  roles: string[]; // 예: ["팀장", "개발자"]
}

export interface Project {
  id: string;
  name: string;
  emoji: string;
  color: string; // hex color (e.g. "#00A9EC")
  members: Member[];
  memberCount: number; // members.length 캐시 (카드 표시용)
  startDate: string;   // "YYYY.MM.DD"
  endDate: string;     // "YYYY.MM.DD"
  daysLeft: number;    // endDate - today
  status: "active" | "upcoming" | "completed";
  hasChatAlert?: boolean;
  hasTodoAlert?: boolean;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project;
  setCurrentProject: (project: Project) => void;
  updateProject: (updated: Project) => void;
  addProject: (project: Project) => void;
}

// ── Mock 데이터 ───────────────────────────
// 나중에 Spring Boot API로 교체
const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    name: "AI 챗봇 개발 프로젝트",
    emoji: "🤖",
    color: "#00A9EC",
    members: [
      { id: "m1", name: "박지민", roles: ["팀장", "기획자"] },
      { id: "m2", name: "이수현", roles: ["개발자"] },
      { id: "m3", name: "김태양", roles: ["개발자", "QA"] },
      { id: "m4", name: "최아린", roles: ["디자이너"] },
      { id: "m5", name: "정우진", roles: ["기획자"] },
    ],
    memberCount: 5,
    startDate: "2026.02.01",
    endDate:   "2026.05.08",
    daysLeft: 32,
    status: "active",
    hasChatAlert: true,
    hasTodoAlert: true,
  },
  {
    id: "2",
    name: "모바일 앱 디자인",
    emoji: "📱",
    color: "#7C3AED",
    members: [
      { id: "m1", name: "박지민", roles: ["팀장"] },
      { id: "m6", name: "한소희", roles: ["디자이너", "기획자"] },
      { id: "m7", name: "오민준", roles: ["개발자"] },
      { id: "m8", name: "윤서연", roles: ["기획자"] },
    ],
    memberCount: 4,
    startDate: "2026.03.01",
    endDate:   "2026.05.13",
    daysLeft: 37,
    status: "upcoming",
    hasChatAlert: false,
    hasTodoAlert: true,
  },
  {
    id: "3",
    name: "데이터 분석 프로젝트",
    emoji: "📊",
    color: "#16A34A",
    members: [
      { id: "m1", name: "박지민", roles: ["팀장"] },
      { id: "m9", name: "강다은", roles: ["데이터 분석", "개발자"] },
      { id: "m10", name: "임현우", roles: ["개발자"] },
    ],
    memberCount: 3,
    startDate: "2025.12.15",
    endDate:   "2026.05.28",
    daysLeft: 52,
    status: "completed",
    hasChatAlert: true,
    hasTodoAlert: false,
  },
];

// ── Context 생성 ──────────────────────────
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// ── Provider ──────────────────────────────
export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [currentProject, setCurrentProject] = useState<Project>(MOCK_PROJECTS[0]);

  const updateProject = (updated: Project) => {
    const synced = { ...updated, memberCount: updated.members.length };
    setProjects((prev) => prev.map((p) => (p.id === synced.id ? synced : p)));
    if (currentProject.id === synced.id) setCurrentProject(synced);
  };

  const addProject = (project: Project) => {
    const synced = { ...project, memberCount: project.members.length };
    setProjects((prev) => [...prev, synced]);
  };

  return (
    <ProjectContext.Provider value={{ projects, currentProject, setCurrentProject, updateProject, addProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

// ── 훅 ────────────────────────────────────
export function useProject(): ProjectContextType {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject은 ProjectProvider 안에서만 사용할 수 있어요.");
  }
  return context;
}