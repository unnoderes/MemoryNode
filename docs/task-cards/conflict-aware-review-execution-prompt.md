# Conflict-Aware Review 任务卡执行提示词

将下面内容完整发送给需要执行此任务的 AGENT：

```text
你正在接手 MemoryNode 的一个明确实现任务。请在当前工作区自主完成，不要只提供计划或代码片段。

先阅读：
1. AGENTS.md
2. docs/task-cards/conflict-aware-review.md
3. 与任务直接相关的现有后端、前端和测试代码

任务：完整实现 docs/task-cards/conflict-aware-review.md 中的 “Conflict-Aware Review - 相关记忆审查与受控替代” 任务卡。

必须遵守：
- 当前产品主线是 extract -> approve/reject -> search -> explain -> revoke；普通批准流程不能回归。
- 相关记忆仅是人工审核候选，绝不能自动判定冲突、自动替代或自动合并。
- 不增加 SDK、MCP、hooks、Docker、auth、向量数据库、嵌入、LLM 二次分类、Alembic 或任何新依赖。
- 复用现有 FastAPI、SQLAlchemy、SQLite、Next.js 与 React 结构；改动保持小而直接。
- SQLite 旧数据库必须能安全增加 supersedes_memory_id；不要假设 create_all 会修改既有表。
- 替代操作必须在同一个数据库事务中创建新记忆、撤销旧记忆并写入审计事件。
- 不提交 .env、真实密钥、数据库、缓存、node_modules 或 .next。
- 尊重工作区现有改动；不要重写历史或回退不属于本任务的文件。

实施前：
1. 运行 git status --short --branch。
2. 阅读所有任务卡指定文件，并追踪将要修改的函数及其调用方。
3. 根据实际代码调整细节，但不得突破任务卡的产品边界；遇到真实阻塞时说明证据。

实施要求：
- 实现任务卡中定义的模型字段、SQLite 兼容迁移、相关记忆端点、受控替代校验与事务、explain 关系数据、Dashboard 审核和详情展示。
- 为新增的非平凡逻辑添加针对性的后端测试。
- 使用清晰的中文 UI 文案，提供加载、空态和错误状态。
- 不做任务卡明确排除的功能。

完成前必须运行：
cd backend
python -m pytest -q

cd ../frontend
npm run build

修复本任务造成的失败；若失败来自无关的现有问题，明确报告命令和错误。

完成后：
1. 检查 git diff --check 与 git status --short。
2. 提交所有本任务文件，提交信息必须为：add supervised memory supersession
3. 推送 main 到 origin。
4. 最终回复仅说明：完成内容、验证结果、commit SHA、push 结果，以及任何真实未解决风险。
```
