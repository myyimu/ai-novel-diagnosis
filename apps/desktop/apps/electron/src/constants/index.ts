// 自定义协议名：模板遗留（渲染层已剥离），保留以免引用处报错
export const DEFAULT_SCHEME = "myapp";

// 桌面应用加载的地址：dev 下由 `one dev` 提供（3000），打包后由 sidecar Next 服务提供
// 始终走 HTTP，不走自定义协议
export const APP_URL = "http://127.0.0.1:3000";

// 本地 API 健康检查地址（打包模式下，启动顺序：API → /health 200 → Next → 窗口）
export const API_HEALTH_URL = "http://127.0.0.1:3001/health";
