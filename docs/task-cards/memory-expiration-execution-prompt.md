# Memory Expiration 任务卡执行提示词

将下面内容完整发送给需要执行此任务的 AGENT：

```text
你正在接手 MemoryNode 的一个明确实现任务。请在当前工作区自主完成，不要只提供计划或代码片段。

先阅读：
1. AGENTS.md
2. docs/task-cards/memory-expiration.md
3. 与任务直接相关的现有后端、前端和测试代码，尤其是 supersession 实现

任务：完整实现 docs/task-cards/memory-expiration.md 中的 “Memory Expiration - 到期时间与生命周期治理” 任务卡。

必须遵守：
- 当前产品主线是 extract -> approve/reject -> search -> explain -> revoke；普通批准、撤销和受控替代不能回归。
- 到期时间是人工审核时设置的可选属性；不自动推断 TTL，不提供自动批准。
- 使用任务卡指定的按需到期刷新机制；不增加 cron、worker、队列、Celery 或部署基础设施。
- 不增加 SDK、MCP、hooks、Docker、auth、向量数据库、嵌入、LLM 二次分类、迁移框架或任何新依赖。
- 复用现有 FastAPI、SQLAlchemy、SQLite、Next.js 与 React 结构；前端使用原生 datetime-local 输入。
- 仅接受带时区且晚于当前时间的 expires_at；前端发送 UTC ISO 时间。
- 到期状态迁移必须有审计事件，且已撤销或已被替代的记忆不得再次产生到期事件。
- 不提交 .env、真实密钥、数据库、缓存、node_modules 或 .next。
- 尊重工作区现有改动；不要重写历史或回退不属于本任务的文件。

实施前：
1. 运行 git status --short --branch。
2. 阅读所有任务卡指定文件，并追踪将要修改的函数及其调用方。
3. 根据实际代码调整细节，但不得突破任务卡的产品边界；遇到真实阻塞时说明证据。

实施要求：
- 完成任务卡定义的批准参数、输入验证、到期刷新服务、审计事件、搜索和 explain 一致性，以及 Dashboard 审核与详情展示。
- 不在每个路由复制逻辑；复用共享服务函数。
- 为新增的非平凡逻辑添加针对性的后端测试。
- 提供加载、空态和错误状态，保持现有中文 UI 与 supersession 交互可用。
- 不做任务卡明确排除的功能。

完成前必须运行：
cd backend
python -m pytest -q

cd ../frontend
npm run build

修复本任务造成的失败；若失败来自无关的现有问题，明确报告命令和错误。

完成后：
1. 检查 git diff --check 与 git status --short。
2. 提交所有本任务文件，提交信息必须为：add memory expiration governance
3. 推送 main 到 origin。
4. 最终回复仅说明：完成内容、验证结果、commit SHA、push 结果，以及任何真实未解决风险。
```
