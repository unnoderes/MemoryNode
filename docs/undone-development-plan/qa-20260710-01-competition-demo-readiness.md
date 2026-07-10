# Competition Demo Readiness - QA、文档与叙事锁定

## 目的

在继续扩展功能或录制视频前，验证已集成的 governed-memory 主链路，更新已过期的交付文档，并给出清晰的竞赛演示就绪判断。

本卡是 QA 与文档任务，不修复产品缺陷。发现缺陷时创建 bug 卡，由独立修复任务处理。

## 基线

- 分支：`main`
- 基线能力：提案抽取、人工批准/拒绝、FTS 搜索、explain、撤销、受控替代、到期治理。
- 所有测试均在本地执行；不得输出、复制或提交 `.env` 中的密钥。
- 使用隔离的本地数据库或已有安全演示数据；不得破坏用户的真实数据库。

## 范围

1. 运行后端回归与前端生产构建。
2. 在浏览器中验证核心治理工作流及桌面、移动端可用性。
3. 验证真实模型抽取链路是否可用于演示，但不记录 API key 或完整环境变量。
4. 将已实现的替代、到期与审计能力同步到 `README.md`、`docs/architecture.md`、`docs/demo-script.md`、`AGENTS.md`。
5. 填写本报告的实际结果与证据，作出发布判断。

## 非目标

- 不新增 SDK、MCP、hooks、Docker、auth、向量数据库或新产品能力。
- 不修复本卡发现的代码问题；只创建可独立执行的 bug 卡。
- 不录制最终视频、不提交比赛材料、不改变 Git 历史。
- 不以模拟成功代替真实模型抽取的演示准备度结论。

## QA 矩阵

执行者必须填写“实际结果”“结果”“证据”“备注”。结果取值只能是 `pass`、`fail`、`blocked` 或 `not-run`。

| ID | 区域 | 类型 | 场景 | 前置条件 | 步骤 | 预期结果 | 实际结果 | 结果 | 证据 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA-01 | Backend | Regression | 后端测试 | 依赖已安装 | `cd backend`; `python -m pytest -q` | 全部通过 | 待填写 | not-run | 待填写 | 记录测试数与失败信息 |
| QA-02 | Frontend | Build | 生产构建 | 依赖已安装 | `cd frontend`; `npm run build` | 构建、类型检查、静态页面生成通过 | 待填写 | not-run | 待填写 | 记录 Next.js 输出摘要 |
| QA-03 | Extraction | Smoke | 真实模型抽取 | 后端使用安全本地 `.env` 启动；不可显示密钥 | 通过 `/proposals` 提交演示文本 | 生成 pending 提案；无自动批准 | 待填写 | not-run | 待填写 | 仅记录模型是否可达与错误摘要 |
| QA-04 | Review | E2E | 批准与拒绝 | 至少有两条 pending 提案 | 批准一条，拒绝一条 | 仅批准项创建 active memory；拒绝项不可搜索 | 待填写 | not-run | 待填写 | 记录记忆与提案 ID 的末尾片段即可 |
| QA-05 | Retrieval | E2E | 搜索、解释与撤销 | 有一条 active memory | 搜索，进入详情，查看来源与事件，撤销后再次搜索 | 详情显示来源/理由/事件；撤销项从默认搜索消失 | 待填写 | not-run | 待填写 | 截图不得包含密钥 |
| QA-06 | Supersession | E2E | 相关记忆与受控替代 | 同项目、同类型有一条 active memory 和一条 pending 提案 | 加载相关记忆，选择旧记忆，批准并替代 | 新记忆 active；旧记忆 revoked；新旧详情可相互追溯 | 待填写 | not-run | 待填写 | 验证审计事件 |
| QA-07 | Expiration | Regression | 到期状态、搜索与事件 | 使用测试覆盖或隔离数据，避免等待真实时间 | 运行到期测试；必要时用隔离数据库触发相关请求 | 仅 active 记忆到期一次；变为 expired；默认搜索排除 | 待填写 | not-run | 待填写 | 不手改用户真实数据库 |
| QA-08 | Failure UX | Smoke | 抽取失败提示 | 不改动用户密钥或正常配置 | 复核后端和前端已有错误路径；可引用自动化测试 | 失败信息清晰；不会创建已批准记忆 | 待填写 | not-run | 待填写 | 无安全方法验证时标记 blocked |
| QA-09 | Responsive UI | Manual | Dashboard 桌面和移动端 | 后端与前端本地运行 | 浏览器检查 1280px 和 390px 下 proposals、memories、detail | 文字、操作、关联候选、时间线不溢出或重叠 | 待填写 | not-run | 待填写 | 记录截图路径或人工检查说明 |
| QA-10 | Docs | Release-check | 文档与代码一致 | QA-01 至 QA-09 已执行或明确 blocked | 检查 README、architecture、demo-script、AGENTS | 已实现功能、端点、状态和演示叙事无过时描述 | 待填写 | not-run | 待填写 | 记录更新文件 |

## 文档锁定要求

在 QA 事实确认后，更新以下文件，且只写已实现和已验证的能力：

- `README.md`：端点清单、已实现能力、演示链路、当前阶段。
- `docs/architecture.md`：替代关系、到期状态转换与按需刷新边界。
- `docs/demo-script.md`：三分钟主线突出来源、人工审核、解释、撤销；替代与到期作为可展示的扩展治理能力，不要求在同一次实时录制中等待到期。
- `AGENTS.md`：删除已完成的“无冲突检测、无到期 UI”陈述；保留真实的已知限制，例如无 SDK、MCP、auth、Docker、向量数据库，以及模型配额风险。

不要把“相关记忆候选”写成自动语义冲突裁决，也不要把按需到期刷新写成后台定时任务。

## 缺陷分流

若任一 QA 项为 `fail`，创建：

```text
docs/undone-development-plan/bugtriage-20260710-01-<short-name>.md
```

每张 bug 卡必须包含：

- Bug ID、严重级别、类型、基线、影响。
- 复现步骤、预期结果、实际结果、证据。
- 建议修复范围、禁止操作、验收标准、回归要求。
- 是否阻塞发布。
- 用于独立修复 AGENT 的一键执行提示词。

不得在本 QA 卡中顺手修复 bug。

## 发布判断

完成 QA 后，在本节填写唯一结论：`release-ready`、`conditionally-ready` 或 `not-ready`。

### release-ready

- QA-01、QA-02、QA-04 至 QA-10 均为 `pass`。
- QA-03 真实模型抽取成功，且无 P0/P1 缺陷。
- 文档已同步并经实际流程验证。

### conditionally-ready

- 核心治理链路和构建均通过。
- 唯一未完成项是外部模型配额、网络或 relay 可用性等非代码环境条件。
- 报告中明确条件、证据和再次检查命令；不可据此录制依赖真实抽取的最终视频。

### not-ready

- 任一主链路失败、出现 P0/P1 缺陷，或真实抽取不可用且没有已验证的替代演示方案。

## 最终报告

执行完成时，替换本文件中的“待填写”项，并在此处写入：

```text
结论：
阻塞项：
已创建 bug 卡：
文档更新：
下一步一键提示词：
```

若有 bug，下一步提示词必须指向相应 bug 卡。若 `release-ready`，下一步提示词应要求执行截图、录制与最终 release-check，而不是新增功能。

## 提交与推送

本任务产生的 QA 报告、bug 卡和文档更新通过验证后使用一个 coherent commit：

```text
docs: add demo readiness QA report
```

然后推送 `main` 到 `origin`，并保持工作区干净。
