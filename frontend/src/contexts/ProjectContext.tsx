/**
 * src/contexts/ProjectContext.tsx
 *
 * 앱 전체에서 프로젝트 데이터를 공유하는 Context
 * - loadProjects() 를 호출해 서버에서 목록을 받아옴
 * - addProject / updateProject / deleteProject 는 모두 서버와 동기 후 로컬 상태 갱신
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { ProjectAPI, ProjectDTO } from "@/services/api";

// ── 타입 ──────────────────────────────────────────────────
export interface Member {
  id: string;
  name: string;
  roles: string[];
}

export interface Project {
  id: string;
  name: string;
  emoji: string;
  color: string;
  status: "active" | "upcoming" | "completed";
  startDate: string;     // "YYYY.MM.DD"
  endDate: string;       // "YYYY.MM.DD"
  daysLeft: number;
  memberCount: number;
  members: Member[];
  hasChatAlert?: boolean;
  hasTodoAlert?: boolean;
}

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  /** 서버에서 프로젝트 목록을 받아와 상태 갱신 */
  loadProjects: () => Promise<void>;
  /** 프로젝트 생성 → 서버 ID가 포함된 Project 반환 */
  addProject: (project: Project) => Promise<Project>;
  /** 프로젝트 수정 */
  updateProject: (updated: Project) => Promise<void>;
  /** 프로젝트 삭제 */
  deleteProject: (id: string) => Promise<void>;
}

// ── DTO → Project 변환 ─────────────────────────────────────
function dtoToProject(dto: ProjectDTO): Project {
  return {
    id: dto.id,
    name: dto.name,
    emoji: dto.emoji,
    color: dto.color,
    status: dto.status,
    startDate: dto.start_date,
    endDate: dto.end_date,
    daysLeft: dto.days_left,
    memberCount: dto.member_count,
    members: dto.members.map((m) => ({ id: m.id, name: m.name, roles: m.roles })),
    hasChatAlert: dto.has_chat_alert,
    hasTodoAlert: dto.has_todo_alert,
  };
}

// ── Context ────────────────────────────────────────────────
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────
export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const dtos = await ProjectAPI.list();
      setProjects(dtos.map(dtoToProject));
    } catch {
      // 토큰 없음 또는 네트워크 오류 — 조용히 무시
    } finally {
      setLoading(false);
    }
  }, []);

  const addProject = useCallback(async (project: Project): Promise<Project> => {
    const dto = await ProjectAPI.create({
      name: project.name,
      emoji: project.emoji,
      color: project.color,
      status: project.status,
      start_date: project.startDate,
      end_date: project.endDate,
      members: project.members.map((m) => ({ name: m.name, roles: m.roles })),
    });
    const created = dtoToProject(dto);
    setProjects((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateProject = useCallback(
    async (updated: Project): Promise<void> => {
      const dto = await ProjectAPI.update(updated.id, {
        name: updated.name,
        emoji: updated.emoji,
        color: updated.color,
        status: updated.status,
        start_date: updated.startDate,
        end_date: updated.endDate,
        members: updated.members.map((m) => ({ name: m.name, roles: m.roles })),
      });
      const synced = dtoToProject(dto);
      setProjects((prev) => prev.map((p) => (p.id === synced.id ? synced : p)));
      if (currentProject?.id === synced.id) setCurrentProject(synced);
    },
    [currentProject],
  );

  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      await ProjectAPI.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (currentProject?.id === id) setCurrentProject(null);
    },
    [currentProject],
  );

  return (
    <ProjectContext.Provider
      value={{
        projects,
        loading,
        currentProject,
        setCurrentProject,
        loadProjects,
        addProject,
        updateProject,
        deleteProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

// ── 훅 ────────────────────────────────────────────────────
export function useProject(): ProjectContextType {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject은 ProjectProvider 안에서만 사용할 수 있어요.");
  }
  return context;
}
