# Memory Expiration - 到期时间与生命周期治理

## 目标

让审核者能在批准提案时为记忆设定可选的到期时间，并使已到期记忆可靠地从 `active` 转为 `expired`，保留审计记录且不再出现在默认搜索中。

目标流程：

```text
pending proposal -> approve with optional expires_at -> active memory
                                                  -> due time reached
                                                  -> expired memory + expire event
                                                  -> excluded from default search
```

## 产品规则

- 到期时间是审核者控制的可选治理属性，不由模型自动决定。
- 未设置到期时间的记忆不会自动过期。
- 到期仅适用于 `active` 记忆。已撤销、已被替代的记忆不会再产生到期事件。
- 到期后的记忆必须保留来源、提案、事件和 explain 可见性；只从默认搜索中排除。
- 现有 `expires_at` 字段已经存在，不增加表、状态类型或外部调度服务。
- 不提供手动“立即过期”按钮，也不提供批准后修改或清除到期时间的功能；有该需求时再设计独立的受控更新流程。

## 范围

### 批准 API

扩展 `DecisionRequest`，新增可选字段：

```text
expires_at: Optional[datetime]
```

请求示例：

```json
POST /v1/proposals/{proposal_id}/approve
{
  "actor_id": "reviewer",
  "note": "This vendor preference must be reviewed next quarter.",
  "expires_at": "2026-10-01T00:00:00Z"
}
```

要求：

- 仅接收带时区的 ISO 8601 时间；无时区值返回 `400`，避免服务器与浏览器本地时间含义不一致。
- 批准时的 `expires_at` 必须严格晚于当前时间；过去时间或当前时间返回 `400`。
- 未传 `expires_at` 时保持普通批准和既有响应兼容性。
- 批准创建的 `Memory.expires_at` 必须持久化该值。

前端原生 `<input type="datetime-local">` 的值必须在发送前转为 `new Date(value).toISOString()`，确保 API 获得有时区的 UTC 时间。空值不发送 `expires_at`。

### 到期状态迁移

新增服务函数，例如：

```text
expire_due_memories(db)
```

它执行以下逻辑：

1. 找出 `status == active` 且 `expires_at` 不为空的记忆。
2. 对每条 `expires_at <= now` 的记忆：
   - 状态设为 `expired`。
   - 更新 `updated_at`。
   - 创建 `MemoryEvent(event_type="expire", actor_id="system")`。
3. 在一次事务中提交所有到期更新和事件。

该函数必须在以下现有服务入口调用，以保证用户看到的状态与搜索结果一致：

- `search_memories`
- `get_memory`，覆盖详情、explain 和撤销前的读取
- `related_memories`
- `approve_proposal`，在校验替代目标前刷新状态，防止替代已到期记忆

这是一种按需刷新，而不是后台定时任务。首次相关请求发生时会完成状态迁移与事件记录。保留简短注释：

```python
# ponytail: expires on relevant requests; add a scheduled worker only when prompt expiry is required.
```

不要在每个 FastAPI 路由复制刷新逻辑；复用一个服务函数并从上述共享服务入口调用。

### 搜索与解释

- 默认搜索必须排除 `expired` 记忆。
- `include_inactive=true` 可返回到期记忆，并且状态必须是 `expired`，不是旧的 `active`。
- `GET /v1/memories/{id}` 和 `GET /v1/memories/{id}/explain` 必须反映刷新后的到期状态。
- explain 的事件列表必须包含 `expire`。
- 保持现有撤销、替代和搜索契约，不修改路径或参数名称。

### Dashboard

#### 提案审核页

每个待审核提案添加可选的“到期时间”原生日期时间输入：

- 留空表示永久有效，按钮仍为原有的“批准”或“批准并替代”。
- 填写后，批准请求携带 UTC ISO 时间。
- 展示简短说明：到期后将自动从默认搜索中移除，审计记录仍保留。
- 与相关记忆选择、普通批准和拒绝操作共存，不能影响已有替代流程。

#### 记忆库与详情页

- 搜索结果若有到期时间，显示“到期于”及格式化时间。
- 详情页显示到期时间；未设置时显示“未设置到期时间”。
- `expired` 状态页明确说明：该记录已过期，不再对默认检索可见，但可以审计。
- 事件时间线增加 `expire` 的中文标签和相应状态样式。

使用现有样式和原生控件；不引入日期选择器、日期库或新的 UI 依赖。

## 状态转换

```text
active + expires_at > now  -> active
active + expires_at <= now -> expired + expire event
revoked                    -> revoked
expired                    -> expired
```

优先级：任何非 `active` 记忆都不能再次到期。替代旧记忆后其状态已是 `revoked`，因此不会额外生成 `expire` 事件。

## 不做

- 不添加 cron、Celery、队列、后台 worker 或部署基础设施。
- 不允许在批准后修改、延长、缩短或清除到期时间。
- 不添加自动建议 TTL、模型推断 TTL 或每类记忆的全局默认 TTL。
- 不添加新的数据库表、迁移框架或第三方依赖。
- 不改变 supersession 的状态模型或关系数据。

## 验收与测试

后端测试至少覆盖：

1. 带未来 `expires_at` 的批准会在新记忆中持久化该值。
2. 不带 `expires_at` 的普通批准保持现有行为。
3. 过去时间、当前时间和无时区时间被批准 API 拒绝。
4. 到期记忆在下一次相关请求中变为 `expired`，只生成一次 `expire` 事件。
5. 默认搜索不返回到期记忆；`include_inactive=true` 返回其 `expired` 状态。
6. explain 返回到期状态、到期时间和 `expire` 审计事件。
7. 已撤销或被替代的记忆即使时间已过，也不会产生 `expire` 事件。
8. 替代操作不能选择已到期的目标记忆。

手动前端检查：

1. 留空到期时间可普通批准。
2. 填写未来时间后，详情和搜索结果显示到期信息。
3. 到期记忆的详情页显示正确状态与事件。
4. 移动端日期时间输入、审核按钮和候选区不溢出。
5. 普通批准、拒绝、撤销和批准并替代仍可用。

验证命令：

```powershell
cd backend
python -m pytest -q

cd ../frontend
npm run build
```

## 完成条件

- 审核者可为新批准记忆设置未来到期时间。
- 到期状态、事件、搜索、详情和替代校验保持一致。
- 所有后端测试和前端构建通过。
- 不提交 `.env`、数据库、缓存、`node_modules` 或 `.next`。
- 使用一个 coherent commit：

```text
add memory expiration governance
```

- 推送 `main` 到 `origin`。
