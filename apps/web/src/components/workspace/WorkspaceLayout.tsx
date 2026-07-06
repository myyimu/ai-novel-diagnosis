"use client";

import { ReactNode, useState, useRef, useEffect } from "react";
import { SidebarToggle } from "./SidebarToggle";
import { Resizer } from "./ResizablePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STORAGE_KEYS = {
  leftSidebarOpen: "workspace-left-sidebar-open",
  leftSidebarWidth: "workspace-left-sidebar-width",
  rightPanelOpen: "workspace-right-panel-open",
  rightPanelWidth: "workspace-right-panel-width",
  mainTab: "workspace-main-tab",
  rightPanelTab: "workspace-right-panel-tab",
} as const;

function getStorageValue<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item !== null ? (JSON.parse(item) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorageValue<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
}

interface WorkspaceTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface RightPanelTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface WorkspaceLayoutProps {
  sidebar: ReactNode;
  mainTabs: WorkspaceTab[];
  rightPanelTabs?: RightPanelTab[];
  defaultMainTab?: string;
  defaultRightPanelTab?: string;
  showRightPanel?: boolean;
}

export function WorkspaceLayout({
  sidebar,
  mainTabs,
  rightPanelTabs = [],
  defaultMainTab,
  defaultRightPanelTab,
  showRightPanel = true,
}: WorkspaceLayoutProps) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(() =>
    getStorageValue(STORAGE_KEYS.leftSidebarOpen, true)
  );
  const [rightPanelOpen, setRightPanelOpen] = useState(() =>
    getStorageValue(STORAGE_KEYS.rightPanelOpen, showRightPanel && rightPanelTabs.length > 0)
  );
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(() =>
    getStorageValue(STORAGE_KEYS.leftSidebarWidth, 256)
  );
  const [rightPanelWidth, setRightPanelWidth] = useState(() =>
    getStorageValue(STORAGE_KEYS.rightPanelWidth, 320)
  );
  const [mainTab, setMainTab] = useState(() =>
    getStorageValue(STORAGE_KEYS.mainTab, defaultMainTab || mainTabs[0]?.id || "input")
  );
  const [rightPanelTab, setRightPanelTab] = useState(() =>
    getStorageValue(STORAGE_KEYS.rightPanelTab, defaultRightPanelTab || rightPanelTabs[0]?.id || "history")
  );

  // 拖拽相关状态
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const startPositionRef = useRef(0);
  const startSizeRef = useRef(0);

  // 左侧拖拽逻辑
  const handleLeftResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
    startPositionRef.current = e.clientX;
    startSizeRef.current = leftSidebarWidth;
  };

  // 右侧拖拽逻辑
  const handleRightResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
    startPositionRef.current = e.clientX;
    startSizeRef.current = rightPanelWidth;
  };

  // 全局鼠标移动事件
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const diff = e.clientX - startPositionRef.current;
        const newWidth = Math.max(180, Math.min(400, startSizeRef.current + diff));
        setLeftSidebarWidth(newWidth);
      }
      if (isResizingRight) {
        const diff = startPositionRef.current - e.clientX;
        const newWidth = Math.max(200, Math.min(500, startSizeRef.current + diff));
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  // 持久化状态到 localStorage
  useEffect(() => {
    setStorageValue(STORAGE_KEYS.leftSidebarOpen, leftSidebarOpen);
  }, [leftSidebarOpen]);

  useEffect(() => {
    setStorageValue(STORAGE_KEYS.rightPanelOpen, rightPanelOpen);
  }, [rightPanelOpen]);

  useEffect(() => {
    setStorageValue(STORAGE_KEYS.leftSidebarWidth, leftSidebarWidth);
  }, [leftSidebarWidth]);

  useEffect(() => {
    setStorageValue(STORAGE_KEYS.rightPanelWidth, rightPanelWidth);
  }, [rightPanelWidth]);

  useEffect(() => {
    setStorageValue(STORAGE_KEYS.mainTab, mainTab);
  }, [mainTab]);

  useEffect(() => {
    setStorageValue(STORAGE_KEYS.rightPanelTab, rightPanelTab);
  }, [rightPanelTab]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (!cmdOrCtrl) return;

      // Cmd/Ctrl+B: 切换左侧侧边栏
      if (e.key === "b" && !e.shiftKey) {
        e.preventDefault();
        setLeftSidebarOpen((prev) => !prev);
        return;
      }

      // Cmd/Ctrl+Shift+B: 切换右侧面板
      if (e.key === "b" && e.shiftKey) {
        e.preventDefault();
        setRightPanelOpen((prev) => !prev);
        return;
      }

      // Cmd/Ctrl+1-4: 切换主区域标签页
      if (e.key >= "1" && e.key <= "4") {
        const tabIndex = parseInt(e.key, 10) - 1;
        if (tabIndex < mainTabs.length) {
          e.preventDefault();
          setMainTab(mainTabs[tabIndex].id);
        }
        return;
      }

      // Cmd/Ctrl+Shift+1-6: 切换右侧面板标签页
      if (e.shiftKey && e.key >= "1" && e.key <= "6") {
        const panelIndex = parseInt(e.key, 10) - 1;
        if (panelIndex < rightPanelTabs.length) {
          e.preventDefault();
          setRightPanelTab(rightPanelTabs[panelIndex].id);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mainTabs, rightPanelTabs]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 左侧侧边栏 */}
      {leftSidebarOpen && (
        <div
          className="h-full flex-shrink-0 border-r border-sidebar-border bg-sidebar"
          style={{ width: `${leftSidebarWidth}px` }}
        >
          {sidebar}
        </div>
      )}

      {/* 左侧拖拽条 */}
      {leftSidebarOpen && (
        <Resizer
          direction="horizontal"
          onMouseDown={handleLeftResizeStart}
          className={isResizingLeft ? "bg-primary" : ""}
        />
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 侧边栏切换按钮 */}
        <div className="relative flex-shrink-0">
          <SidebarToggle
            isOpen={leftSidebarOpen}
            onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
            position="left"
          />
          {rightPanelTabs.length > 0 && (
            <SidebarToggle
              isOpen={rightPanelOpen}
              onToggle={() => setRightPanelOpen(!rightPanelOpen)}
              position="right"
            />
          )}
        </div>

        {/* 主内容区 - 使用 flex 占据剩余空间 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 主标签页区域 */}
          <div className="flex-1 overflow-auto p-4">
            <Tabs value={mainTab} onValueChange={setMainTab}>
              <TabsList className="mb-4 w-full justify-start overflow-x-auto">
                {mainTabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {mainTabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-0">
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* 右侧面板 */}
          {rightPanelOpen && rightPanelTabs.length > 0 && (
            <>
              {/* 右侧拖拽条 */}
              <Resizer
                direction="horizontal"
                onMouseDown={handleRightResizeStart}
                className={isResizingRight ? "bg-primary" : ""}
              />
              <div
                className="h-full flex-shrink-0 border-l border-sidebar-border bg-sidebar overflow-hidden"
                style={{ width: `${rightPanelWidth}px` }}
              >
                <Tabs value={rightPanelTab} onValueChange={setRightPanelTab}>
                  <TabsList className="mx-2 my-2 w-[calc(100%-16px)]">
                    {rightPanelTabs.map((tab) => (
                      <TabsTrigger key={tab.id} value={tab.id}>
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <div className="h-[calc(100%-48px)] overflow-auto px-2">
                    {rightPanelTabs.map((tab) => (
                      <TabsContent key={tab.id} value={tab.id} className="mt-0">
                        {tab.content}
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
