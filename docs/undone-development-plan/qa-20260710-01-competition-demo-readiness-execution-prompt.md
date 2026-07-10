# Competition Demo Readiness 任务卡执行提示词

将下面内容完整发送给需要执行此任务的 AGENT：

```text
你正在执行 MemoryNode 的集成 QA、交付文档同步与发布准备判断。不要新增产品功能，也不要修复发现的代码缺陷。

先阅读：
1. AGENTS.md
2. docs/undone-development-plan/qa-20260710-01-competition-demo-readiness.md
3. README.md、docs/architecture.md、docs/demo-script.md
4. 当前后端、前端、测试和最近提交的 supersession / expiration 实现

任务：完整执行 `docs/undone-development-plan/qa-20260710-01-competition-demo-readiness.md` 的 QA 矩阵、文档锁定、缺陷分流和发布判断。

必须遵守：
- 这是 QA 任务，不新增 SDK、MCP、hooks、Docker、auth、向量数据库或其他产品功能。
- 不直接修复 bug；每个失败项创建符合任务卡要求的独立 bug 卡，并附带修复 AGENT 的一键提示词。
- 不显示、复制、提交或记录 `.env`、API key、数据库内容中的敏感信息。
- 使用隔离的本地数据库或安全演示数据；不得破坏用户真实数据库。
- 若真实模型抽取因配额、网络或 relay 不可用而无法验证，标记 blocked 并给出 conditionally-ready 或 not-ready 判断，不可伪造成功。
- 文档只描述已实现、已验证的行为；相关候选不是自动冲突判定，按需到期不是后台定时任务。
- 保留用户已有变更，不重写 Git 历史。

实施顺序：
1. 运行 `git status --short --branch` 并记录基线 SHA。
2. 执行任务卡 QA-01 至 QA-10，逐项填写实际结果、结果、证据和备注。
3. 仅在事实验证后更新 README.md、docs/architecture.md、docs/demo-script.md、AGENTS.md。
4. 对每个 fail 创建完整 bug 卡；不要修复。
5. 在 QA 报告填写唯一发布结论和下一步一键提示词。

必须运行：
cd backend
python -m pytest -q

cd ../frontend
npm run build

完成后：
1. 运行 `git diff --check` 与 `git status --short`。
2. 提交 QA 报告、bug 卡（如有）和文档同步，提交信息必须为：`docs: add demo readiness QA report`。
3. 推送 main 到 origin。
4. 最终只报告：QA 结论、通过/失败/阻塞项目、生成的 bug 卡、文档更新、commit SHA 与 push 结果。
```
