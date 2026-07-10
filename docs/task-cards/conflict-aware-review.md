# Conflict-Aware Review - 相关记忆审查与受控替代

## 目标

让审核者在批准新提案前查看同项目、同类型的有效记忆，并可明确选择以新记忆替代其中一条旧记忆。系统只提供相关候选和受控操作，不自动判定冲突、合并或替代。

目标流程：

```text
extract -> pending proposal -> review related memories
        -> approve normally
        -> or approve + supersede old memory
        -> explain the replacement chain
```

## 产品规则

- 相关记忆是待人工判断的候选，不代表系统已判定冲突。
- 替代必须由审核者在批准提案时明确发起；普通批准保持现有行为。
- 新记忆替代旧记忆后：
  - 新记忆状态为 `active`。
  - 新记忆的 `supersedes_memory_id` 指向旧记忆。
  - 旧记忆状态改为 `revoked`，不再出现在默认搜索中。
  - 新旧记忆都保留来源、提案和审计事件。
- 仅可替代与新提案同 `actor_id`、`project_id`、`type` 的有效记忆。
- 不增加 `superseded` 状态。当前生命周期使用 `revoked`，由替代事件和关系字段表达“被替代”。

## 范围

### 数据库与模型

在 `memories` 增加可空字段：

```text
supersedes_memory_id
```

含义：当前记忆所替代的旧记忆 ID。

项目没有迁移框架。`init_db()` 必须检查 `memories` 表是否已有该列，旧 SQLite 数据库缺列时执行最小 `ALTER TABLE ... ADD COLUMN`。不要引入 Alembic 或其他迁移依赖。

新建数据库的 SQLAlchemy 模型也必须包含该字段。运行时服务层仍需验证目标记忆存在且符合范围，不能依赖 SQLite 外键配置。

### API

新增端点：

```text
GET /v1/proposals/{proposal_id}/related-memories
```

端点返回该提案同 `actor_id + project_id + type` 下的所有 `active` 记忆，按创建时间倒序排列。返回内容足以供审核者选择：

```json
{
  "memories": [
    {
      "id": "mem_previous",
      "content": "MVP backend uses SQLite.",
      "type": "project_decision",
      "status": "active",
      "created_at": "2026-07-10T00:00:00Z"
    }
  ]
}
```

这是小数据量 MVP 的候选扫描，不宣称语义冲突。实现中保留简短注释：

```python
# ponytail: scans active project memories; add ranked retrieval only when memory volume needs it.
```

扩展现有批准请求：

```json
POST /v1/proposals/{proposal_id}/approve
{
  "actor_id": "reviewer",
  "note": "SQLite decision was updated.",
  "supersede_memory_id": "mem_previous"
}
```

`supersede_memory_id` 为可选字段；未传时维持普通批准行为和现有响应兼容性。

扩展 `GET /v1/memories/{id}/explain` 响应：

```json
{
  "memory": {},
  "proposal": {},
  "source": {},
  "events": [],
  "supersedes": null,
  "superseded_by": null
}
```

- `supersedes`：当前记忆所替代的旧记忆摘要；无则 `null`。
- `superseded_by`：替代当前记忆的新记忆摘要；无则 `null`。

### 批准与替代逻辑

普通批准保持：

```text
pending proposal -> approved proposal + active memory + approve event
```

传入 `supersede_memory_id` 时，在同一事务中完成：

```text
pending proposal
-> approved proposal
-> new active memory (supersedes_memory_id = old id)
-> old active memory becomes revoked
-> approve event on new memory
-> supersede event on new memory
-> superseded event on old memory
```

替代请求必须返回 `409`，当：

- 提案不是 `pending`。
- 目标记忆不存在或不是 `active`。
- 目标记忆与提案的 `actor_id` 不同。
- 目标记忆与提案的 `project_id` 不同。
- 目标记忆与提案的 `type` 不同。

替代后的旧记忆仍可通过详情与 explain API 查看；默认搜索会因现有 `active` 过滤而排除它。

### Dashboard

在提案页的每个待审核提案上：

1. 添加“查看相关记忆”入口，点击后才调用相关记忆 API，避免列表初始渲染产生 N+1 请求。
2. 候选区域展示内容、类型、创建时间、状态和详情链接。
3. 使用单选控件选择“以此新提案替代”目标。
4. 未选择目标时按钮为“批准”；选择后为“批准并替代”。
5. 显示加载、空候选和 API 错误状态。

在记忆详情页：

- 新记忆显示“替代自”及旧记忆链接。
- 被替代的旧记忆显示“已被替代”及新记忆链接。
- 审计时间线显示批准、替代、被替代、撤销等事件。
- 不删除或隐藏已替代记忆的来源、理由与历史。

## 不做

- 不做自动语义冲突判断、自动合并或自动替代。
- 不新增向量数据库、嵌入、LLM 二次分类或搜索依赖。
- 不添加版本图、版本树或多级可视化；详情页前后关联链接已经足够。
- 不更改既有搜索 API 的默认可见性规则。

## 验收与测试

后端测试至少覆盖：

1. 普通批准不会创建替代关系。
2. 替代批准创建有效新记忆，并将旧记忆改为 `revoked`。
3. 默认搜索只返回新记忆，旧记忆不出现。
4. 新旧记忆的 explain 响应均返回正确的替代关系和审计事件。
5. 跨用户、跨项目、不同类型、非有效或不存在的替代目标均返回 `409` 或 `404`。
6. 已有 SQLite 数据库在启动时能补充新列。

手动前端检查：

1. 提案默认显示普通批准路径。
2. 相关候选仅在用户请求后加载。
3. 选择候选后可完成“批准并替代”。
4. 新旧详情页均能跳转到对方并展示事件。
5. 桌面与移动端的候选区域不溢出。

验证命令：

```powershell
cd backend
python -m pytest -q

cd ../frontend
npm run build
```

## 完成条件

- 上述 API、数据关系、审核流程和详情展示可用。
- 全部测试和构建通过。
- 不提交 `.env`、数据库文件、缓存、`node_modules` 或 `.next`。
- 使用一个 coherent commit：

```text
add supervised memory supersession
```

- 推送 `main` 到 `origin`。
