# MemoryNode Final Release Check — 2026-07-11

## 结论

`release-ready`

基线：`main` 已安全快进至 `a72758a`，并包含 `6663588`。本轮未发现 P0/P1 或其他发布阻塞缺陷，未修改产品代码。

## 自动验证

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 后端回归 | pass | `python -m pytest -q`：`12 passed in 2.58s` |
| 前端生产构建 | pass | Next.js 16.2.10 编译、TypeScript 检查及 4 个路由生成通过 |

## 隔离数据演练

使用 `%TEMP%/memorynode-final-release-20260711/release-check.db`，未读取或改写用户数据库，也未展示 `.env` 或密钥。

| 场景 | 结果 | 实际证据 |
| --- | --- | --- |
| 提案批准与拒绝 | pass | 批准后记忆为 `active`；拒绝后提案为 `rejected` |
| 搜索、解释与来源 | pass | 撤销前 `Qwen Cloud` 默认搜索返回 1 条；explain 返回 source、reason 与事件 |
| 撤销 | pass | 状态转为 `revoked`；撤销后默认搜索返回 0 条 |
| 受控替代 | pass | 相关候选 1 条；审核者显式选择后新记忆 `active`、旧记忆 `revoked`；双向关系存在；事件分别为 `approve,supersede` 与 `approve,superseded` |
| 请求驱动到期 | pass | 到期记忆在相关请求后为 `expired`；事件为 `approve,expire`，`expire` 恰好 1 次 |
| 审计时间线 | pass | 批准、替代、被替代、到期和撤销均保留可解释事件 |

相关记忆仅作为人工审核候选，不代表自动语义冲突裁决。到期迁移由相关请求触发，不是后台定时任务。

## 截图与录制

允许入库的最终材料位于 `docs/demo-assets/final-20260711/`：

- 390px 与 1280px 两组 `/proposals`、`/memories`、`/memories/[id]` 截图均存在并完成视觉复核；截图内容使用合成数据，无横向溢出证据已记录于同目录 README。
- `approved-demo-flow.mp4` 已复核为 H.264、1280x720、20 秒、600 帧，覆盖待审核、批准后检索、解释与审计、撤销、撤销后默认检索无结果。
- 本轮内置浏览器重新捕获连接异常，未伪造新的录制结果；采用同日已提交的最终捕获材料，并以本轮隔离 API 演练、测试和构建重新确认产品状态。

## 缺陷与风险

- 新缺陷：无，因此未创建 `bugtriage-20260711-NN-*`。
- 非阻塞风险：Qwen Cloud 配额仍待批准；本地真实模型链路依赖既有安全 relay 配置。本轮未读取或输出该配置。
- 已关闭风险：P1 移动端横向溢出已由 `a53e6e5` 修复，并在 390px 与 1280px 捕获证据中关闭。

## Release Check

- 核心链路 `extract -> approve/reject -> search -> explain -> revoke` 的既有真实抽取证据与本轮隔离生命周期复演一致。
- 受控替代、到期状态和审计关系通过。
- 后端测试和前端生产构建通过。
- 最终截图与批准后演示录屏已存在并通过产物校验。
- 未发现发布阻塞项。

最终判断：`release-ready`
