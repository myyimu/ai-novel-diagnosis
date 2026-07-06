"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, KeyRound, CheckCircle2, TriangleAlert, Loader2, ExternalLink } from "lucide-react";

interface AISettingsPanelProps {
  providerPreset?: string;
  providerLabel?: string;
  providerModel?: string;
  isBackendFreeProvider?: boolean;
  isLoading?: boolean;
  onTestConnection?: () => void;
  onOpenFullSettings?: () => void;
}

export function AISettingsPanel({
  providerPreset = "unknown",
  providerLabel = "未知服务",
  providerModel = "",
  isBackendFreeProvider = false,
  isLoading = false,
  onTestConnection,
  onOpenFullSettings,
}: AISettingsPanelProps) {
  const modelDisplay = isBackendFreeProvider
    ? "共享站配置"
    : providerModel || "未设置";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            AI 模型服务
          </CardTitle>
          <CardDescription>
            当前使用的模型服务配置
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">模型服务</span>
              <span className="font-medium">{providerLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">当前模型</span>
              <span className="font-medium truncate max-w-[120px]" title={modelDisplay}>
                {modelDisplay}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onTestConnection}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  测试中
                </>
              ) : (
                "测试连接"
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenFullSettings}
            >
              <Settings className="w-3 h-3 mr-1" />
              配置
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted/50 bg-muted/30">
        <CardHeader>
          <CardTitle className="text-xs">快速说明</CardTitle>
        </CardHeader>
        <CardContent className="text-xs leading-5 text-muted-foreground space-y-2">
          <p>• 共享站由服务端统一配置，无需填写 API Key</p>
          <p>• 付费或本地模型需要配置 Base URL 和 API Key</p>
          <p>• 设置保存在浏览器本地，API Key 不会上传</p>
        </CardContent>
      </Card>
    </div>
  );
}
