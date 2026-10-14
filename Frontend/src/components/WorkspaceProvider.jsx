import { useCallback, useEffect, useState } from "react";
import api from "../api";
import { WorkspaceContext } from "./workspaceContext";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "./workspaceStorage";

export function WorkspaceProvider({ children }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const refresh = useCallback(() => setAttempt((value) => value + 1), []);

  const switchWorkspace = useCallback(async (workspaceId) => {
    const { data } = await api.post(`/workspaces/${workspaceId}/activate`);
    if (!data.success || !data.workspace?.id) throw new Error("Workspace could not be activated.");
    localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, data.workspace.id);
    setActiveWorkspace(data.workspace);
    return data.workspace;
  }, []);

  const createWorkspace = useCallback(async (name) => {
    const { data } = await api.post("/workspaces", { name });
    if (!data.success || !data.workspace?.id) throw new Error("Workspace could not be created.");
    setWorkspaces((current) => [...current.filter((workspace) => workspace.id !== data.workspace.id), data.workspace]);
    await switchWorkspace(data.workspace.id);
    return data.workspace;
  }, [switchWorkspace]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setError("");

    const initialize = async () => {
      try {
        const { data } = await api.get("/workspaces", { signal: controller.signal });
        if (!data.success || !Array.isArray(data.workspaces) || data.workspaces.length === 0) {
          throw new Error("No workspaces are available for this account.");
        }
        if (controller.signal.aborted) return;
        setWorkspaces(data.workspaces);

        const defaultWorkspace = data.workspaces.find((workspace) => workspace.isDefault) || data.workspaces[0];
        const storedId = localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
        const storedWorkspace = data.workspaces.find((workspace) => workspace.id === storedId);
        const preferredWorkspace = storedWorkspace || defaultWorkspace;

        try {
          const { data: activated } = await api.post(`/workspaces/${preferredWorkspace.id}/activate`, {}, { signal: controller.signal });
          if (!activated.success || !activated.workspace?.id) throw new Error("Workspace could not be activated.");
          if (controller.signal.aborted) return;
          localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, activated.workspace.id);
          setActiveWorkspace(activated.workspace);
        } catch (activationError) {
          if (controller.signal.aborted) return;
          if (preferredWorkspace.id === defaultWorkspace.id || activationError.response?.status !== 403) throw activationError;
          const { data: fallback } = await api.post(`/workspaces/${defaultWorkspace.id}/activate`, {}, { signal: controller.signal });
          if (!fallback.success || !fallback.workspace?.id) throw new Error("Default workspace could not be activated.");
          if (controller.signal.aborted) return;
          localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, fallback.workspace.id);
          setActiveWorkspace(fallback.workspace);
        }

        setStatus("ready");
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError.response?.data?.message || loadError.message || "Unable to load workspaces.");
        setStatus("error");
      }
    };

    initialize();
    return () => controller.abort();
  }, [attempt]);

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, status, error, refresh, switchWorkspace, createWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
