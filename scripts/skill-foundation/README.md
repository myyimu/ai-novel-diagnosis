# skill-foundation scripts

这个目录用于沉淀一套可复用的基础 skill 脚本，方便后续把成熟技能中的通用治理能力内置到 `ai-novel-diagnosis`。

## 已内置能力

- `static-check.sh`
  - 统一扫描 `skills/` 下所有 `SKILL.md` 的结构性问题
  - frontmatter、路径引用、agent 引用、markdown 引用和 inline 规则检查
- `check-python-invocation.sh`
  - 防止在仓库脚本里直接写死 `python3`（Windows 兼容性风险）
  - 检查 hook 中 Python 文本输出是否强制 UTF-8 字节流输出
- `check-shared-files.sh`
  - 检查可复用 reference/script 的同名文件内容是否保持一致
- `check-hook-locale-safety.sh`
  - 检查 hook 在 locale / 字符编码上的兼容性风险（若 hook 目录存在则运行）
- `check-codex-adapter.sh` / `check-opencode-adapter.sh`
  - 对接 Codex / OpenCode 部署组件的回归检查（对应目录存在时自动启用）
- `generate-codex-agents.py` / `sync-opencode.py`
  - 适配器内容同步转换脚本，供未来多 CLI 迁移时复用

## 一键运行

```bash
bash scripts/skill-foundation/run-foundation-checks.sh
```

可通过 `npm run skill:foundation:check` 直接触发。
