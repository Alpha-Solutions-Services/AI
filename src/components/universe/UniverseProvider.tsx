"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PlanetId } from "@/config/planets.config";

export type UniverseCameraState = {
  focusPlanetId: PlanetId | null;
  zoom: number;
  yaw: number;
};

export type UniverseAgentStatus =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "acting";

export type UniverseConversationState = {
  conversationId: string | null;
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
  }>;
};

export type PendingUniverseConfirm = {
  runId: string;
  toolName: string;
  args: Record<string, unknown>;
  description: string;
};

type UniverseContextValue = {
  activePlanetId: PlanetId | null;
  setActivePlanetId: (id: PlanetId | null) => void;
  camera: UniverseCameraState;
  setCamera: (patch: Partial<UniverseCameraState>) => void;
  resetCamera: () => void;
  agentStatus: UniverseAgentStatus;
  setAgentStatus: (status: UniverseAgentStatus) => void;
  conversation: UniverseConversationState;
  setConversation: (patch: Partial<UniverseConversationState>) => void;
  /** Floating reply near Alpha Star */
  starReply: string | null;
  setStarReply: (text: string | null) => void;
  /** Thin beam toward planet Alpha is acting on */
  beamPlanetId: PlanetId | null;
  setBeamPlanetId: (id: PlanetId | null) => void;
  voiceLevel: number;
  setVoiceLevel: (n: number) => void;
  pendingConfirms: PendingUniverseConfirm[];
  setPendingConfirms: (items: PendingUniverseConfirm[]) => void;
  /** Voice → command bar inbox */
  voiceInbox: string | null;
  pushVoiceTranscript: (text: string) => void;
  clearVoiceInbox: () => void;
};

const defaultCamera: UniverseCameraState = {
  focusPlanetId: null,
  zoom: 1,
  yaw: 0,
};

const defaultConversation: UniverseConversationState = {
  conversationId: null,
  messages: [],
};

const UniverseContext = createContext<UniverseContextValue | null>(null);

export function UniverseProvider({ children }: { children: ReactNode }) {
  const [activePlanetId, setActivePlanetId] = useState<PlanetId | null>(null);
  const [camera, setCameraState] = useState<UniverseCameraState>(defaultCamera);
  const [agentStatus, setAgentStatus] =
    useState<UniverseAgentStatus>("idle");
  const [conversation, setConversationState] =
    useState<UniverseConversationState>(defaultConversation);
  const [starReply, setStarReply] = useState<string | null>(null);
  const [beamPlanetId, setBeamPlanetId] = useState<PlanetId | null>(null);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [pendingConfirms, setPendingConfirms] = useState<
    PendingUniverseConfirm[]
  >([]);
  const [voiceInbox, setVoiceInbox] = useState<string | null>(null);

  const pushVoiceTranscript = useCallback((text: string) => {
    const t = text.trim();
    if (t) setVoiceInbox(t);
  }, []);

  const clearVoiceInbox = useCallback(() => setVoiceInbox(null), []);

  const setCamera = useCallback((patch: Partial<UniverseCameraState>) => {
    setCameraState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetCamera = useCallback(() => {
    setCameraState(defaultCamera);
    setActivePlanetId(null);
    setBeamPlanetId(null);
  }, []);

  const setConversation = useCallback(
    (patch: Partial<UniverseConversationState>) => {
      setConversationState((prev) => ({
        ...prev,
        ...patch,
        messages: patch.messages ?? prev.messages,
      }));
    },
    []
  );

  const value = useMemo<UniverseContextValue>(
    () => ({
      activePlanetId,
      setActivePlanetId,
      camera,
      setCamera,
      resetCamera,
      agentStatus,
      setAgentStatus,
      conversation,
      setConversation,
      starReply,
      setStarReply,
      beamPlanetId,
      setBeamPlanetId,
      voiceLevel,
      setVoiceLevel,
      pendingConfirms,
      setPendingConfirms,
      voiceInbox,
      pushVoiceTranscript,
      clearVoiceInbox,
    }),
    [
      activePlanetId,
      camera,
      setCamera,
      resetCamera,
      agentStatus,
      conversation,
      setConversation,
      starReply,
      beamPlanetId,
      voiceLevel,
      pendingConfirms,
      voiceInbox,
      pushVoiceTranscript,
      clearVoiceInbox,
    ]
  );

  return (
    <UniverseContext.Provider value={value}>{children}</UniverseContext.Provider>
  );
}

export function useUniverse() {
  const ctx = useContext(UniverseContext);
  if (!ctx) {
    throw new Error("useUniverse must be used within UniverseProvider");
  }
  return ctx;
}
