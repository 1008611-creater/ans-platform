// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import * as r from "react/jsx-runtime";
import * as a from "react";
let i = (e, s) => [e, s];
let n = (e, s, t) => ({
  label: e,
  value: s,
  state: t
});
let o = (e, s, t, r) => ({
  badge: e,
  items: s,
  evidence: t,
  outcome: r
});
let c = (e, s, t, r, a) => ({
  mode: e,
  label: s,
  tabs: t,
  scenes: r,
  variant: a
});
let d = (e, s, t) => ({
  title: e,
  detail: s,
  state: t
});
let l = [{
  badge: i("阶段 1 \xb7 同步处理导致等待", "Stage 1 \xb7 Synchronous work causes waiting"),
  page: d(i("导出页面", "Export page"), i("点击“导出账单”", "Clicks “Export invoices”"), "active"),
  queue: d(i("消息队列", "Message queue"), i("尚未接入", "Not used"), "blocked"),
  worker: d(i("生成文件", "File generation"), i("占用当前请求处理", "Runs inside the request"), "active"),
  result: d(i("页面状态", "UI state"), i("持续等待，可能超时", "Keeps waiting and may time out"), "error"),
  jobId: i("任务编号：未生成", "Task ID: not created"),
  evidence: i("请求在文件生成期间一直未结束，页面没有可供后续查询的任务编号", "The request remains open during generation, with no task ID the page can check later"),
  outcome: i("耗时工作和页面请求绑在一起；一旦等待中断，用户难以判断任务是否仍在继续。", "Long-running work is tied to the page request; after an interruption, task state is unclear.")
}, {
  badge: i("阶段 2 \xb7 创建任务并写入队列", "Stage 2 \xb7 Create and enqueue the task"),
  page: d(i("导出接口", "Export API"), i("返回 export_104", "Returns export_104"), "success"),
  queue: d(i("消息队列", "Message queue"), i("暂存 export_104", "Buffers export_104"), "active"),
  worker: d(i("后台工作进程", "Background worker"), i("等待领取任务", "Waiting to claim the task"), "blocked"),
  result: d(i("页面状态", "UI state"), i("已排队，可继续查询", "Queued and trackable"), "success"),
  jobId: i("任务编号：export_104", "Task ID: export_104"),
  evidence: i("接口响应和队列消息都包含 export_104，页面能够用它查询状态", "Both the API response and queued message contain export_104, which the page can use for status checks"),
  outcome: i("写入队列只证明任务已被受理，不能把“已排队”显示成“导出完成”。", "Enqueueing proves acceptance only; queued must not be presented as completed.")
}, {
  badge: i("阶段 3 \xb7 工作进程交付最终结果", "Stage 3 \xb7 Worker delivers the final result"),
  page: d(i("导出页面", "Export page"), i("查询 export_104", "Checks export_104"), "active"),
  queue: d(i("消息队列", "Message queue"), i("任务已领取并确认", "Task claimed and acknowledged"), "success"),
  worker: d(i("后台工作进程", "Background worker"), i("生成文件并记录地址", "Builds the file and stores its location"), "success"),
  result: d(i("页面状态", "UI state"), i("已完成，可下载", "Completed and downloadable"), "success"),
  jobId: i("任务编号：export_104", "Task ID: export_104"),
  evidence: i("同一编号能够对上接口响应、队列消息、执行日志和最终下载状态", "The same ID matches the API response, queued message, worker log, and final download state"),
  outcome: i("验收要看到完成或失败的最终状态；重试时还要检查重复消息不会产生两份结果。", "Acceptance needs a completed or failed terminal state, plus duplicate-safe behavior on retries.")
}];
let u = (e, s, t, r) => ({
  id: e,
  name: s,
  statusValue: t,
  state: r
});
let h = (e, s, t) => ({
  version: e,
  detail: s,
  state: t
});
let p = [{
  badge: i("阶段 1 \xb7 旧记录没有 status", "Stage 1 \xb7 Existing rows have no status"),
  rows: [u("101", i("张三", "Zhang San"), i("NULL", "NULL"), "error"), u("102", i("李四", "Li Si"), i("NULL", "NULL"), "error"), u("103", i("王五", "Wang Wu"), i("NULL", "NULL"), "error")],
  steps: [h(i("0001_init.sql", "0001_init.sql"), i("已应用", "Applied"), "success"), h(i("直接 ADD status NOT NULL", "Direct ADD status NOT NULL"), i("旧记录不满足约束，迁移被拒绝", "Rejected because old rows violate the constraint"), "error"), h(i("0002_add_status_nullable.sql", "0002_add_status_nullable.sql"), i("尚未执行", "Not run"), "blocked"), h(i("0003_backfill_status.sql", "0003_backfill_status.sql"), i("尚未执行", "Not run"), "blocked")],
  history: i("migration history: 0001_init", "migration history: 0001_init"),
  evidence: i("执行结果明确指出旧记录的 status 为空，不能直接增加非空约束", "The result shows existing NULL values prevent the required constraint from being added directly"),
  outcome: i("先确认存量数据是否满足新规则，再决定迁移顺序；不要把失败描述成数据库“崩溃”。", "Inspect existing data before choosing the migration order; a rejected change is not a database crash.")
}, {
  badge: i("阶段 2 \xb7 先兼容并回填旧记录", "Stage 2 \xb7 Stay compatible and backfill"),
  rows: [u("101", i("张三", "Zhang San"), i("active", "active"), "success"), u("102", i("李四", "Li Si"), i("NULL → active", "NULL → active"), "active"), u("103", i("王五", "Wang Wu"), i("NULL → active", "NULL → active"), "active")],
  steps: [h(i("0001_init.sql", "0001_init.sql"), i("已应用", "Applied"), "success"), h(i("0002_add_status_nullable.sql", "0002_add_status_nullable.sql"), i("已应用：允许 NULL", "Applied: NULL allowed"), "success"), h(i("0003_backfill_status.sql", "0003_backfill_status.sql"), i("执行中：按业务规则回填", "Running: backfill under a business rule"), "active"), h(i("0004_enforce_not_null.sql", "0004_enforce_not_null.sql"), i("等待空值归零", "Waiting for zero NULL values"), "blocked")],
  history: i("migration history: 0001 → 0002 → 0003（执行中）", "migration history: 0001 → 0002 → 0003 (running)"),
  evidence: i("回填日志记录处理行数，空值查询仍有结果，因此约束步骤继续等待", "The backfill log records affected rows; the NULL query still returns rows, so enforcement waits"),
  outcome: i("先让结构兼容新旧代码，再转换存量数据；是否能不停机还取决于应用和数据库方案。", "Make the schema compatible before transforming old data; downtime depends on the wider deployment design.")
}, {
  badge: i("阶段 3 \xb7 空值归零后收紧约束", "Stage 3 \xb7 Enforce after NULL count reaches zero"),
  rows: [u("101", i("张三", "Zhang San"), i("active", "active"), "success"), u("102", i("李四", "Li Si"), i("active", "active"), "success"), u("103", i("王五", "Wang Wu"), i("active", "active"), "success")],
  steps: [h(i("0001_init.sql", "0001_init.sql"), i("已应用", "Applied"), "success"), h(i("0002_add_status_nullable.sql", "0002_add_status_nullable.sql"), i("已应用", "Applied"), "success"), h(i("0003_backfill_status.sql", "0003_backfill_status.sql"), i("已完成：NULL 数量为 0", "Complete: NULL count is zero"), "success"), h(i("0004_enforce_not_null.sql", "0004_enforce_not_null.sql"), i("已应用：NOT NULL 生效", "Applied: NOT NULL enforced"), "success")],
  history: i("migration history: 0001 → 0002 → 0003 → 0004", "migration history: 0001 → 0002 → 0003 → 0004"),
  evidence: i("空值查询返回 0，迁移记录完整，新旧应用读写检查均通过", "The NULL query returns zero, migration history is complete, and old/new application checks pass"),
  outcome: i("这些证据只验收本次变更；迁移记录不是数据备份，破坏性操作仍需恢复方案。", "This evidence accepts this change only; migration history is not a backup for destructive operations.")
}];
let m = {
  transaction: c("data", i("订单事务记录", "Order transaction record"), [i("部分失败", "Partial failure"), i("放进事务", "Use transaction"), i("整体结果", "Whole result")], [o(i("订单 2048", "Order 2048"), [n(i("orders", "orders"), i("已创建", "created"), "success"), n(i("stock", "stock"), i("写入失败", "write failed"), "error"), n(i("提交状态", "commit"), i("留下半套数据", "partial data remains"), "error")], i("错误发生在第二次写入", "The second write failed"), i("用户看见订单，但库存没有扣减。", "The order exists, but stock was not reduced.")), o(i("BEGIN … COMMIT", "BEGIN … COMMIT"), [n(i("orders", "orders"), i("等待提交", "pending commit"), "active"), n(i("stock", "stock"), i("等待提交", "pending commit"), "active"), n(i("事务边界", "transaction"), i("两次写入属于同一组", "both writes are grouped"), "active")], i("任一步失败都会触发 ROLLBACK", "Any failed step triggers ROLLBACK"), i("数据库先保留中间结果，不把半套状态当成成功。", "The database keeps intermediate work from becoming partial success.")), o(i("COMMIT / ROLLBACK", "COMMIT / ROLLBACK"), [n(i("orders", "orders"), i("一起保存或撤销", "saved or undone together"), "success"), n(i("stock", "stock"), i("一起保存或撤销", "saved or undone together"), "success"), n(i("最终状态", "final state"), i("只有完整结果", "whole result only"), "success")], i("复查订单与库存记录", "Inspect order and stock records"), i("失败后两张表都不留下半成品。", "Neither table keeps a partial result after failure."))]),
  atomicity: c("data", i("库存扣减现场", "Inventory decrement"), [i("读后再写", "Read then write"), i("原子更新", "Atomic update"), i("检查结果", "Verify result")], [o(i("剩余 1 件", "1 item left"), [n(i("请求 A", "Request A"), i("读到 1", "reads 1"), "active"), n(i("请求 B", "Request B"), i("也读到 1", "also reads 1"), "active"), n(i("最终库存", "final stock"), i("可能被重复扣减", "may be decremented twice"), "error")], i("两个请求看见同一个旧值", "Both requests observe the same old value"), i("拆开的读和写留下了可被竞争的中间状态。", "Separated read and write expose an intermediate state.")), o(i("一个不可分割的更新", "One indivisible update"), [n(i("条件", "condition"), i("库存必须 > 0", "stock must be > 0"), "active"), n(i("更新", "update"), i("扣减与判断一起执行", "check and decrement together"), "active"), n(i("失败请求", "losing request"), i("得到明确失败", "gets a clear failure"), "blocked")], i("数据库或原子操作返回成功/失败", "The atomic operation returns success or failure"), i("外部只能看见扣减前或扣减后的完整状态。", "Observers see a complete before or after state.")), o(i("并发复验", "Concurrent verification"), [n(i("成功数", "successes"), i("1", "1"), "success"), n(i("失败数", "failures"), i("1", "1"), "success"), n(i("最终库存", "final stock"), i("0", "0"), "success")], i("重复并发运行仍得到同一结果", "Repeated concurrent runs keep the same result"), i("故意让一步失败，也不会留下部分结果。", "Forcing one step to fail leaves no partial result."))]),
  "database-write": c("data", i("资料保存记录", "Profile save record"), [i("页面先报成功", "UI says success early"), i("等待写入", "Await the write"), i("刷新复查", "Refresh and verify")], [o(i("保存 profile_7", "Save profile_7"), [n(i("页面提示", "page message"), i("保存成功", "saved"), "success"), n(i("数据库记录", "database record"), i("仍是旧内容", "still old"), "error"), n(i("写入任务", "write task"), i("尚未完成", "not completed"), "active")], i("成功提示早于写入结果", "The success message appears before the write result"), i("刷新后内容消失，说明并没有完成落库。", "The content disappears after refresh because the write did not finish.")), o(i("等待 INSERT / COMMIT", "Await INSERT / COMMIT"), [n(i("请求", "request"), i("保持处理中", "stays pending"), "active"), n(i("数据库", "database"), i("执行并提交", "writes and commits"), "active"), n(i("响应", "response"), i("按真实结果返回", "uses the real result"), "idle")], i("数据库返回主键或错误", "The database returns an id or an error"), i("页面只在已提交后显示成功，失败则保留输入。", "The page reports success only after commit and keeps input on failure.")), o(i("重新读取 profile_7", "Read profile_7 again"), [n(i("数据库记录", "database record"), i("昵称：小林", "name: Aiko"), "success"), n(i("刷新请求", "refresh request"), i("读取同一主键", "reads the same id"), "success"), n(i("页面", "page"), i("显示已保存内容", "shows saved content"), "success")], i("直接查询与刷新结果一致", "Direct query and refresh agree"), i("可观察证据是记录存在且刷新后仍能读到。", "The record exists and remains visible after refresh."))]),
  idempotency: c("data", i("支付回调处理记录", "Payment webhook record"), [i("并发送达", "Concurrent delivery"), i("原子领取", "Atomic claim"), i("复用结果", "Reuse result")], [o(i("event pay_928", "event pay_928"), [n(i("第一次回调", "first webhook"), i("创建入账记录", "creates payment record"), "success"), n(i("并发回调", "concurrent webhook"), i("同时开始处理", "starts at the same time"), "error"), n(i("订单金额", "order amount"), i("重复入账", "recorded twice"), "error")], i("两个处理器同时收到相同事件", "Two handlers receive the same event together"), i("同一操作执行两次，目标结果发生了变化。", "Repeating the operation changes the target result.")), o(i("幂等键 pay_928", "Idempotency key pay_928"), [n(i("唯一键", "unique key"), i("pay_928", "pay_928"), "active"), n(i("获胜请求", "winner"), i("原子取得处理权", "claims processing atomically"), "success"), n(i("其他请求", "other request"), i("处理中 / 已处理", "processing / handled"), "blocked")], i("唯一约束或幂等记录拦住重复生效", "A unique key or idempotency record blocks duplicate effect"), i("重试仍能得到结果，但不会再创建一笔。", "Retries return a result without creating another payment.")), o(i("最终订单", "Final order"), [n(i("支付记录", "payment records"), i("1 条", "1"), "success"), n(i("订单状态", "order status"), i("已支付", "paid"), "success"), n(i("重复响应", "repeat response"), i("返回同一结果", "same result"), "success")], i("让同一个键并发到达至少两次", "Deliver the same key concurrently at least twice"), i("验收看目标状态，而不是要求系统完全没有日志。", "Verify the target state; logs may still be written."))]),
  "side-effect": c("data", i("报价预览与提交", "Quote preview and submit"), [i("预览也写入", "Preview writes"), i("分开计算与提交", "Separate preview and commit"), i("重复预览", "Repeat preview")], [o(i("点击预览", "Click Preview"), [n(i("返回报价", "returned quote"), i("\xa51,280", "$1,280"), "success"), n(i("数据库", "database"), i("新增草稿", "draft inserted"), "error"), n(i("邮件", "email"), i("已发送", "sent"), "error")], i("返回值之外还有外部变化", "External state changed beyond the return value"), i("用户只是预览，却产生了写库和发送邮件的副作用。", "A preview unexpectedly writes data and sends mail.")), o(i("纯计算 + 显式提交", "Pure calculation + explicit submit"), [n(i("预览函数", "preview"), i("只返回金额", "returns amount only"), "active"), n(i("提交按钮", "submit"), i("用户明确触发", "explicit action"), "active"), n(i("外部写入", "external write"), i("只在提交后发生", "runs after submit"), "idle")], i("操作边界能从按钮与日志看见", "The action boundary is visible in UI and logs"), i("计算和改变外部状态不再藏在同一步里。", "Calculation no longer hides an external change.")), o(i("连续预览两次", "Preview twice"), [n(i("返回报价", "returned quote"), i("两次相同", "same twice"), "success"), n(i("数据库新增", "database inserts"), i("0 条", "0"), "success"), n(i("邮件发送", "emails sent"), i("0 封", "0"), "success")], i("提交后才出现一条可追踪写入", "One traceable write appears only after submit"), i("副作用没有被消灭，而是被放到明确、可验收的动作里。", "The side effect is explicit and verifiable, not eliminated."))]),
  process: c("runtime", i("服务器进程监视器", "Server process monitor"), [i("一个进程", "One process"), i("拆出任务进程", "Separate worker"), i("故障隔离", "Failure isolated")], [o(i("PID 410 \xb7 web", "PID 410 \xb7 web"), [n(i("Web 服务", "Web server"), i("处理请求与图片", "handles requests and images"), "active"), n(i("内存", "memory"), i("共同占用 1.8 GB", "1.8 GB shared workload"), "error"), n(i("图片任务", "image job"), i("崩溃拖停服务", "crash stops server"), "error")], i("所有工作在同一个 PID", "All work runs under one PID"), i("一个未处理崩溃让整个运行环境退出。", "One unhandled crash exits the whole runtime.")), o(i("PID 410 + PID 522", "PID 410 + PID 522"), [n(i("Web 进程", "web process"), i("PID 410 \xb7 独立内存", "PID 410 \xb7 isolated memory"), "active"), n(i("图片进程", "image process"), i("PID 522 \xb7 独立内存", "PID 522 \xb7 isolated memory"), "active"), n(i("任务传递", "job transfer"), i("通过队列或管道", "queue or pipe"), "idle")], i("操作系统分别管理两个执行环境", "The OS manages two execution environments"), i("程序把容易失败的工作交给另一个进程。", "Risky work moves to a separate process.")), o(i("PID 522 exited", "PID 522 exited"), [n(i("Web 进程", "web process"), i("仍在响应", "still serving"), "success"), n(i("图片进程", "image process"), i("已退出并重启", "exited and restarted"), "error"), n(i("用户请求", "user requests"), i("不随它一起中断", "remain available"), "success")], i("进程 ID 与退出状态可分别观察", "PIDs and exit states are observed separately"), i("故障被限制在图片处理进程，主服务仍可用。", "The image-worker failure does not stop the web process."))]),
  thread: c("runtime", i("同一进程内的线程", "Threads inside one process"), [i("共享状态", "Shared state"), i("同步访问", "Synchronize access"), i("核对归属", "Verify ownership")], [o(i("PID 410", "PID 410"), [n(i("线程 A", "Thread A"), i("读取 cache=8", "reads cache=8"), "active"), n(i("线程 B", "Thread B"), i("也读取 cache=8", "also reads cache=8"), "active"), n(i("共享缓存", "shared cache"), i("写入互相覆盖", "writes overwrite"), "error")], i("两个线程共享同一进程内存", "Both threads share process memory"), i("共享让通信容易，也让错误能互相影响。", "Sharing eases communication but exposes interference.")), o(i("PID 410 \xb7 shared lock", "PID 410 \xb7 shared lock"), [n(i("线程 A", "Thread A"), i("持有共享资源", "owns shared resource"), "active"), n(i("线程 B", "Thread B"), i("等待访问", "waits"), "blocked"), n(i("共享缓存", "shared cache"), i("一次只允许一个写", "one writer at a time"), "idle")], i("线程日志带同一 PID、不同线程 ID", "Logs show one PID and different thread IDs"), i("同步规则把共享内存的访问顺序说清楚。", "Synchronization makes shared-memory access ordered.")), o(i("完成两次请求", "Two requests complete"), [n(i("线程 A", "Thread A"), i("done", "done"), "success"), n(i("线程 B", "Thread B"), i("done", "done"), "success"), n(i("共享缓存", "shared cache"), i("最终值 10", "final value 10"), "success")], i("同一 PID 内可见多个线程", "Multiple threads remain under one PID"), i("验收既看并发完成，也看共享状态没有丢失更新。", "Verify both completion and shared-state correctness."))]),
  coroutine: c("runtime", i("异步请求调度", "Async request scheduling"), [i("同步等待", "Blocking wait"), i("挂起让出", "Suspend and yield"), i("恢复合并", "Resume and combine")], [o(i("线程 1", "Thread 1"), [n(i("请求 A", "Request A"), i("等待外部 API 2s", "waits 2s for API"), "active"), n(i("请求 B", "Request B"), i("排在后面", "queued behind"), "blocked"), n(i("CPU", "CPU"), i("等待期间空闲", "idle while waiting"), "idle")], i("同步等待占住当前执行路径", "Blocking wait occupies the execution path"), i("后续任务不能利用这段 I/O 等待时间。", "Later work cannot use the I/O wait.")), o(i("协程调度器", "Coroutine scheduler"), [n(i("协程 A", "Coroutine A"), i("在 await 处挂起", "suspended at await"), "blocked"), n(i("协程 B", "Coroutine B"), i("继续发出请求", "continues work"), "active"), n(i("线程 1", "Thread 1"), i("交替运行多个协程", "runs multiple coroutines"), "active")], i("暂停点明确让出执行", "An explicit suspension point yields execution"), i("同一线程在等待期间可以推进其他协程。", "The same thread advances other coroutines during waits.")), o(i("三个响应返回", "Three responses returned"), [n(i("协程 A", "Coroutine A"), i("恢复", "resumed"), "success"), n(i("协程 B", "Coroutine B"), i("恢复", "resumed"), "success"), n(i("合并结果", "combined result"), i("一次返回页面", "returned together"), "success")], i("跟踪挂起、恢复和总耗时", "Trace suspension, resumption, and elapsed time"), i("I/O 等待被重叠，但 CPU 密集计算不会自动变快。", "I/O waits overlap; CPU work is not automatically faster."))]),
  lock: c("runtime", i("库存记录的锁", "Inventory record lock"), [i("同时进入", "Enter together"), i("一个持有", "One owner"), i("顺序完成", "Complete in order")], [o(i("stock_9 = 1", "stock_9 = 1"), [n(i("请求 A", "Request A"), i("读取并准备扣减", "reads and decrements"), "active"), n(i("请求 B", "Request B"), i("同时读取", "reads concurrently"), "active"), n(i("最终库存", "final stock"), i("可能出现 -1", "may become -1"), "error")], i("两个执行单元同时进入临界区", "Two workers enter the critical section"), i("共享记录没有访问顺序，结果取决于时机。", "The shared record has no access order.")), o(i("lock stock_9", "lock stock_9"), [n(i("请求 A", "Request A"), i("持有锁", "holds lock"), "active"), n(i("请求 B", "Request B"), i("等待释放", "waits for release"), "blocked"), n(i("锁范围", "lock scope"), i("只保护 stock_9", "protects stock_9 only"), "idle")], i("锁状态能显示持有者与等待者", "Lock state reveals owner and waiter"), i("竞争者不能同时修改被保护的记录。", "Competitors cannot update the protected record together.")), o(i("释放锁", "Lock released"), [n(i("请求 A", "Request A"), i("扣减成功", "decrement succeeds"), "success"), n(i("请求 B", "Request B"), i("重新检查后失败", "rechecks and fails"), "blocked"), n(i("最终库存", "final stock"), i("0", "0"), "success")], i("并发测试得到一个成功、一个失败", "Concurrent test yields one success and one failure"), i("锁保证访问顺序，但仍要处理超时与死锁。", "The lock orders access; timeout and deadlock still matter."))]),
  "race-condition": c("runtime", i("优惠券并发领取", "Concurrent coupon claim"), [i("偶发超领", "Occasional oversell"), i("记录时序", "Trace ordering"), i("并发复验", "Concurrent retest")], [o(i("最后 1 张券", "Last coupon"), [n(i("请求 A", "Request A"), i("判断还有 1 张", "sees 1 left"), "active"), n(i("请求 B", "Request B"), i("也判断还有 1 张", "also sees 1 left"), "active"), n(i("发放结果", "claim result"), i("偶尔成功 2 次", "sometimes succeeds twice"), "error")], i("相同输入在不同运行中结果不同", "Identical inputs differ across runs"), i("错误取决于两个请求谁先读、谁先写。", "The result depends on request timing.")), o(i("关联请求时序", "Correlated request timeline"), [n(i("A 读取", "A read"), i("10:00:00.101", "10:00:00.101"), "active"), n(i("B 读取", "B read"), i("10:00:00.102", "10:00:00.102"), "active"), n(i("两次写入", "two writes"), i("都基于旧值", "both use stale value"), "error")], i("日志与并发测试还原交错顺序", "Logs and concurrent tests reveal interleaving"), i("证据指向共享状态的先检查后修改。", "Evidence points to a check-then-update race.")), o(i("原子更新后", "After atomic update"), [n(i("成功请求", "winner"), i("1 个", "1"), "success"), n(i("失败请求", "loser"), i("1 个", "1"), "success"), n(i("剩余券", "remaining"), i("0", "0"), "success")], i("重复高并发运行并保留结果", "Repeat concurrent runs and retain results"), i("修复后结果稳定；一次通过仍不能证明所有竞态都消失。", "Results stabilize, though one pass cannot prove every race is gone."))]),
  enqueue: c("queue", i("图片转码任务队列", "Image-transcoding queue"), [i("请求内处理", "Process in request"), i("写入队列", "Enqueue job"), i("查看任务状态", "Track job")], [o(i("上传 hero.mov", "Upload hero.mov"), [n(i("HTTP 请求", "HTTP request"), i("等待转码 48s", "waits 48s"), "active"), n(i("页面", "page"), i("超时", "times out"), "error"), n(i("转码结果", "output"), i("状态不明", "unknown"), "error")], i("耗时任务占住用户请求", "Long work occupies the user request"), i("用户不知道任务是否还在运行。", "The user cannot tell whether work continues.")), o(i("job transcode_81", "job transcode_81"), [n(i("生产者", "producer"), i("写入任务", "writes job"), "active"), n(i("队列", "queue"), i("等待消费者", "waits for consumer"), "active"), n(i("接口响应", "API response"), i("返回任务 ID", "returns job id"), "success")], i("队列确认任务已接收", "The queue confirms receipt"), i("入队把“已接收”与“已处理”分成两个状态。", "Enqueue separates accepted from completed.")), o(i("transcode_81 \xb7 done", "transcode_81 \xb7 done"), [n(i("队列", "queue"), i("任务已取出", "job taken"), "success"), n(i("消费者", "consumer"), i("转码完成", "transcode complete"), "success"), n(i("页面状态", "page status"), i("可下载", "download ready"), "success")], i("任务 ID 串起入队、处理与结果", "The job id connects enqueue, processing, and result"), i("验收同时检查入队证据和最终完成状态。", "Verify both queue receipt and final completion."))]),
  "message-consumer": c("queue", i("邮件消息队列", "Email message queue"), [i("无人消费", "No consumer"), i("接收与确认", "Receive and acknowledge"), i("失败重投", "Redelivery")], [o(i("email queue", "email queue"), [n(i("消息 41", "message 41"), i("ready", "ready"), "active"), n(i("消息 42", "message 42"), i("ready", "ready"), "active"), n(i("消费者数量", "consumers"), i("0", "0"), "error")], i("队列深度持续增加", "Queue depth keeps increasing"), i("生产者发送成功，但没有应用取出处理。", "Publishing succeeds, but no application consumes messages.")), o(i("consumer mailer-2", "consumer mailer-2"), [n(i("消息 41", "message 41"), i("processing", "processing"), "active"), n(i("消息 42", "message 42"), i("ready", "ready"), "idle"), n(i("确认", "ack"), i("完成后发送", "sent after completion"), "active")], i("监控显示消费者、未确认数与速率", "Metrics show consumers, unacked count, and rate"), i("消费者接收、处理，再用确认告诉队列可以移除。", "The consumer receives, processes, then acknowledges.")), o(i("message 42 redelivered", "message 42 redelivered"), [n(i("消费者 A", "consumer A"), i("处理中退出", "exits during work"), "error"), n(i("队列", "queue"), i("消息重新可用", "message ready again"), "active"), n(i("消费者 B", "consumer B"), i("接管并确认", "takes over and acks"), "success")], i("同一消息可能再次送达", "The same message may be redelivered"), i("消费者还要让处理逻辑能够安全应对重复消息。", "Consumer logic must handle duplicate delivery safely."))]),
  backpressure: c("queue", i("事件处理队列", "Event-processing queue"), [i("上游过快", "Producer too fast"), i("反馈减速", "Signal slowdown"), i("维持边界", "Hold a bound")], [o(i("10,000 条/秒", "10,000 msg/s"), [n(i("生产者", "producer"), i("持续全速发送", "keeps full speed"), "active"), n(i("消费者", "consumer"), i("只能处理 2,000/s", "handles 2,000/s"), "blocked"), n(i("队列内存", "queue memory"), i("不断增长", "keeps growing"), "error")], i("输入速率长期高于处理速率", "Input rate stays above processing rate"), i("没有反馈时，未处理工作会挤满内存。", "Without feedback, pending work fills memory.")), o(i("flow / prefetch=100", "flow / prefetch=100"), [n(i("下游", "downstream"), i("报告已到上限", "reports capacity reached"), "active"), n(i("上游", "upstream"), i("暂停或降低速率", "pauses or slows"), "blocked"), n(i("未确认消息", "unacked"), i("最多 100", "max 100"), "active")], i("压力从下游反向传回上游", "Pressure travels back upstream"), i("发送速度开始服从实际处理能力。", "Sending rate follows downstream capacity.")), o(i("稳定运行", "Stable operation"), [n(i("生产速率", "publish rate"), i("≈ 2,000/s", "≈ 2,000/s"), "success"), n(i("处理速率", "consume rate"), i("≈ 2,000/s", "≈ 2,000/s"), "success"), n(i("队列内存", "queue memory"), i("保持边界", "bounded"), "success")], i("观察速率、队列深度与内存", "Observe rates, depth, and memory"), i("背压控制堆积，但不会凭空增加消费者容量。", "Backpressure bounds growth; it does not create capacity."))]),
  "circuit-breaker": c("resilience", i("订单服务调用支付服务", "Order service calling payments"), [i("Closed", "Closed"), i("Open", "Open"), i("Half-Open", "Half-Open")], [o(i("正常转发", "Normal forwarding"), [n(i("订单请求", "order request"), i("通过熔断器", "passes breaker"), "active"), n(i("支付服务", "payment service"), i("200 OK", "200 OK"), "success"), n(i("熔断状态", "breaker"), i("Closed", "Closed"), "success")], i("成功率与延迟都在阈值内", "Success and latency remain within threshold"), i("依赖健康时，请求正常通过。", "Requests pass while the dependency is healthy.")), o(i("连续失败", "Repeated failures"), [n(i("支付服务", "payment service"), i("超时 / 5xx", "timeout / 5xx"), "error"), n(i("熔断器", "breaker"), i("Open \xb7 暂停转发", "Open \xb7 stops forwarding"), "blocked"), n(i("订单页面", "checkout"), i("快速失败或降级", "fails fast or degrades"), "active")], i("拒绝数与打开时间可观察", "Rejected calls and open time are observable"), i("系统不再让每个请求继续等待故障依赖。", "Requests stop waiting on a failing dependency.")), o(i("少量探测", "Limited probe"), [n(i("熔断器", "breaker"), i("Half-Open", "Half-Open"), "active"), n(i("探测请求", "probe"), i("1 个成功", "1 succeeds"), "success"), n(i("后续流量", "later traffic"), i("逐步恢复", "gradually resumes"), "success")], i("恢复探测决定关闭或重新打开", "A recovery probe closes or reopens the breaker"), i("熔断负责隔离连续失败，不替代超时和重试策略。", "Circuit breaking isolates repeated failure; timeout and retry still matter."))]),
  lease: c("resilience", i("账单任务领导者租约", "Billing-job leader lease"), [i("同时竞争", "Compete"), i("持有并续租", "Hold and renew"), i("过期接管", "Expire and take over")], [o(i("每天 09:00", "Daily at 09:00"), [n(i("实例 A", "instance A"), i("准备生成账单", "ready to bill"), "active"), n(i("实例 B", "instance B"), i("也准备执行", "also ready"), "active"), n(i("重复任务风险", "duplicate risk"), i("可能执行两次", "may run twice"), "error")], i("两个实例都能看见同一计划", "Both instances observe the same schedule"), i("没有协调时，定时任务会重复执行。", "Without coordination, the job can run twice.")), o(i("lease billing-leader", "lease billing-leader"), [n(i("持有者", "holder"), i("instance A", "instance A"), "success"), n(i("续租时间", "renewed"), i("08:59:58", "08:59:58"), "active"), n(i("实例 B", "instance B"), i("等待租约", "waits for lease"), "blocked")], i("租约记录持有者、时长与续租时间", "The lease records holder, duration, and renewal"), i("只有当前持有者执行任务，并持续证明自己仍存活。", "Only the current holder runs the job and renews ownership.")), o(i("A 停止续租", "A stops renewing"), [n(i("旧租约", "old lease"), i("已过期", "expired"), "error"), n(i("实例 B", "instance B"), i("取得代次 42", "gets token 42"), "success"), n(i("实例 A", "instance A"), i("代次 41 被拒绝", "token 41 rejected"), "blocked")], i("写入目标原子拒绝小于当前值的代次", "The write target atomically rejects stale tokens"), i("租约允许接管，递增代次阻止旧持有者继续写入。", "The lease permits takeover; fencing rejects writes from an old holder."))]),
  "distributed-system": c("instances", i("订单与库存跨节点协作", "Orders and inventory across nodes"), [i("跨服务调用", "Cross-service call"), i("网络部分失败", "Partial network failure"), i("对账收敛", "Reconcile")], [o(i("创建订单", "Create order"), [n(i("order-api", "order-api"), i("写入 order_42", "writes order_42"), "success"), n(i("网络", "network"), i("请求 inventory", "calls inventory"), "active"), n(i("inventory-api", "inventory-api"), i("准备扣库存", "ready to decrement"), "idle")], i("不同节点只能通过网络交换信息", "Nodes exchange information over the network"), i("一次用户操作跨越了两个独立运行节点。", "One user action spans independent runtime nodes.")), o(i("响应在途中丢失", "Response lost in transit"), [n(i("order-api", "order-api"), i("不知道库存结果", "does not know stock result"), "error"), n(i("网络", "network"), i("超时", "times out"), "error"), n(i("inventory-api", "inventory-api"), i("可能已经扣减", "may have decremented"), "active")], i("节点仍运行，但通信结果不确定", "Nodes run, but communication is uncertain"), i("分布式失败可能只影响流程的一部分。", "Distributed failure can affect only part of a workflow.")), o(i("幂等重试 + 对账", "Idempotent retry + reconciliation"), [n(i("关联 ID", "correlation id"), i("order_42", "order_42"), "active"), n(i("库存结果", "inventory result"), i("已确认", "confirmed"), "success"), n(i("订单状态", "order status"), i("已收敛", "converged"), "success")], i("日志与状态最终指向同一操作", "Logs and state converge on the same operation"), i("系统用重试、幂等和对账处理网络不确定性。", "Retry, idempotency, and reconciliation handle network uncertainty."))]),
  "single-instance": c("instances", i("单实例 Web 服务", "Single-instance web service"), [i("一个副本", "One replica"), i("实例重启", "Instance restarts"), i("恢复服务", "Recover")], [o(i("replicas = 1", "replicas = 1"), [n(i("负载入口", "traffic"), i("全部到 web-1", "all to web-1"), "active"), n(i("web-1", "web-1"), i("Healthy", "Healthy"), "success"), n(i("备用实例", "standby"), i("不存在", "none"), "idle")], i("平台显示运行副本数为 1", "The platform shows one running replica"), i("结构简单，但所有实时流量依赖同一个实例。", "All live traffic depends on one instance.")), o(i("web-1 restarting", "web-1 restarting"), [n(i("web-1", "web-1"), i("Unavailable", "Unavailable"), "error"), n(i("用户请求", "requests"), i("没有可转发目标", "no target"), "blocked"), n(i("进程内任务", "in-memory jobs"), i("随实例退出", "lost on exit"), "error")], i("重启窗口内健康实例数为 0", "Healthy instance count reaches 0 during restart"), i("单个实例停止时，没有同服务副本接住流量。", "No sibling replica can receive traffic during the stop.")), o(i("web-1 healthy", "web-1 healthy"), [n(i("web-1", "web-1"), i("重新就绪", "ready again"), "success"), n(i("外部数据库", "external database"), i("数据仍存在", "data remains"), "success"), n(i("用户请求", "requests"), i("恢复", "resume"), "success")], i("就绪探针与外部持久化共同验证", "Readiness and external persistence provide evidence"), i("单实例描述副本数量，不等于数据一定只在内存里。", "Single-instance describes replica count, not storage durability."))]),
  "multi-instance": c("instances", i("多实例 Web 服务", "Multi-instance web service"), [i("三个副本", "Three replicas"), i("本地状态冲突", "Local-state conflict"), i("共享状态", "Shared state")], [o(i("replicas = 3", "replicas = 3"), [n(i("负载均衡", "load balancer"), i("分发请求", "distributes traffic"), "active"), n(i("web-1 / web-2", "web-1 / web-2"), i("Healthy", "Healthy"), "success"), n(i("web-3", "web-3"), i("Healthy", "Healthy"), "success")], i("请求日志出现多个实例 ID", "Request logs show several instance IDs"), i("同一服务的多个副本共同承载流量。", "Multiple replicas of one service share traffic.")), o(i("登录状态只在 web-1", "Session only on web-1"), [n(i("第一次请求", "first request"), i("到 web-1 \xb7 已登录", "web-1 \xb7 signed in"), "success"), n(i("第二次请求", "second request"), i("到 web-2 \xb7 无状态", "web-2 \xb7 no session"), "error"), n(i("用户页面", "user page"), i("偶发掉登录", "random sign-out"), "error")], i("实例切换后状态不一致", "State differs after routing to another instance"), i("进程内状态不能自动跨副本共享。", "In-memory state is not shared across replicas.")), o(i("共享 Session / 数据库", "Shared session / database"), [n(i("web-1", "web-1"), i("读取 session_7", "reads session_7"), "success"), n(i("web-2", "web-2"), i("读取同一状态", "reads same state"), "success"), n(i("web-3 停止", "web-3 stops"), i("其余仍服务", "others keep serving"), "success")], i("跨实例请求得到一致身份结果", "Requests across replicas see the same identity"), i("多实例提高服务冗余，但数据库和协调仍要单独设计。", "Multiple instances add service redundancy; data and coordination remain separate."))]),
  "audit-log": c("observability", i("管理员权限审计记录", "Admin permission audit"), [i("只有结果", "Result only"), i("记录操作", "Record action"), i("按对象追查", "Trace object")], [o(i("user_42 变成管理员", "user_42 became admin"), [n(i("应用日志", "app log"), i("permission updated", "permission updated"), "active"), n(i("操作者", "actor"), i("未知", "unknown"), "error"), n(i("来源与时间", "source and time"), i("无法确认", "unknown"), "error")], i("系统只留下结果，没有操作上下文", "Only the result remains, without action context"), i("团队无法回答是谁在什么时候改了权限。", "The team cannot identify who changed the role or when.")), o(i("audit event 981", "audit event 981"), [n(i("操作者", "actor"), i("admin_7", "admin_7"), "success"), n(i("动作与对象", "action and object"), i("role.update \xb7 user_42", "role.update \xb7 user_42"), "active"), n(i("结果", "result"), i("success \xb7 16:42", "success \xb7 16:42"), "success")], i("请求身份、资源、动作、来源和结果同条记录", "Identity, resource, action, source, and result share one event"), i("审计日志保留可追查的安全相关操作顺序。", "The audit log preserves a traceable action sequence.")), o(i("筛选 user_42", "Filter user_42"), [n(i("16:42", "16:42"), i("admin_7 提升权限", "admin_7 raised role"), "active"), n(i("16:51", "16:51"), i("admin_9 撤销权限", "admin_9 reverted role"), "success"), n(i("来源 IP", "source IP"), i("已受控展示", "shown with access control"), "idle")], i("按对象和时间得到完整操作链", "Filtering by object and time reveals the action chain"), i("能回答谁、何时、对什么做了什么及结果。", "The record answers who, when, what, action, and outcome."))]),
  "load-testing": c("observability", i("结账接口负载测试", "Checkout load test"), [i("建立基线", "Set baseline"), i("模拟峰值", "Run peak load"), i("对照阈值", "Check threshold")], [o(i("单请求检查", "Single-request check"), [n(i("并发用户", "virtual users"), i("1", "1"), "idle"), n(i("p95 延迟", "p95 latency"), i("120 ms", "120 ms"), "success"), n(i("错误率", "error rate"), i("0%", "0%"), "success")], i("功能可用，但没有容量证据", "Function works, but capacity is unknown"), i("一次点击不能说明活动峰值下的表现。", "One request does not represent peak traffic.")), o(i("预计峰值 500 VUs", "Expected peak 500 VUs"), [n(i("负载脚本", "load script"), i("浏览→加购→结账", "browse→cart→checkout"), "active"), n(i("请求速率", "request rate"), i("2,400/min", "2,400/min"), "active"), n(i("运行环境", "environment"), i("接近生产配置", "production-like"), "active")], i("负载、持续时间和用户路径都被记录", "Load, duration, and user path are recorded"), i("系统在可复现的预期流量下运行。", "The system runs under reproducible expected traffic.")), o(i("验收报告", "Acceptance report"), [n(i("p95 延迟", "p95 latency"), i("780 ms ≤ 1s", "780 ms ≤ 1s"), "success"), n(i("错误率", "error rate"), i("0.4% ≤ 1%", "0.4% ≤ 1%"), "success"), n(i("吞吐量", "throughput"), i("2,380/min", "2,380/min"), "success")], i("结果同时写明负载和阈值", "Results include both load and thresholds"), i("报告证明这次条件下达标，不保证生产永不故障。", "The run meets its thresholds; production is not guaranteed."))]),
  "message-queue": c("queue", i("报表导出任务链路", "Report export job path"), [i("提交导出", "Submit export"), i("任务入队", "Job queued"), i("查看结果", "Check result")], [o(i("无队列缓冲", "No queue buffering"), [n(i("导出请求", "export request"), i("等待文件生成", "waits for file generation"), "active"), n(i("生成任务", "generation task"), i("占用当前请求", "runs inside the request"), "error"), n(i("用户页面", "page"), i("一直转圈", "spinning"), "error")], i("耗时工作拖住页面请求", "Long-running work delays the page request"), i("任何下游卡顿都会直接传导到前端用户界面。", "Downstream latency directly impacts frontend users.")), o(i("任务进入队列", "Job enters queue"), [n(i("导出接口", "export API"), i("写入 export_104", "writes export_104"), "active"), n(i("消息队列", "message queue"), i("暂存缓冲中", "buffered"), "active"), n(i("接口响应", "API response"), i("返回任务编号", "returns task ID"), "success")], i("接口响应与文件生成分开", "API response and file generation are separated"), i("页面看到“已排队”，而不是误以为导出已经完成。", "The page shows queued instead of pretending the export is complete.")), o(i("消费者按能力拉取", "Consumer pulls work"), [n(i("消息队列", "message queue"), i("任务派发中", "dispatching"), "success"), n(i("导出 Worker", "export worker"), i("生成文件", "builds file"), "success"), n(i("任务状态", "task status"), i("completed", "completed"), "success")], i("同一任务编号串起处理记录", "One task ID links processing records"), i("最终状态和下载结果必须能用 export_104 查到。", "The final state and download result must be traceable through export_104."))], "queue-task"),
  "database-migration": c("data", i("users 表分步迁移", "Staged users-table migration"), [i("检查旧行", "Inspect old rows"), i("兼容并回填", "Add and backfill"), i("收紧约束", "Enforce constraint")], [o(i("直接增加必填约束", "Add the required constraint directly"), [n(i("ALTER TABLE", "ALTER TABLE"), i("无默认值 NOT NULL", "NOT NULL without default"), "active"), n(i("存量数据", "legacy rows"), i("校验失败", "check failed"), "error"), n(i("迁移结果", "migration result"), i("执行被拒绝", "change rejected"), "error")], i("破坏性变更未做存量兼容", "Destructive edit lacks backward compatibility"), i("没有版本记录和兼容步骤，失败后也难以复现。", "Without versioned, compatible steps, the failure is hard to reproduce.")), o(i("0002_add_status_nullable.sql", "0002_add_status_nullable.sql"), [n(i("版本记录", "migration log"), i("写入版本号 v2", "record v2 applied"), "active"), n(i("新增列", "add column"), i("先允许 NULL", "nullable first"), "active"), n(i("数据回填", "backfill"), i("按业务规则补值", "fills values by business rule"), "success")], i("结构变更与代码提交同步", "Schema changes synchronized with git commit"), i("按顺序执行并留下记录，才能比较各环境到达了哪个版本。", "Ordered, recorded steps reveal which version each environment reached.")), o(i("约束已验证", "Constraint verified"), [n(i("用户表结构", "user schema"), i("status 已设为必填", "status is required"), "success"), n(i("空值检查", "NULL check"), i("NULL = 0", "NULL = 0"), "success"), n(i("迁移历史", "migration history"), i("版本记录完整", "versions recorded"), "success")], i("旧行仍在、空值归零、约束生效", "Legacy rows remain, NULL is zero, and the constraint is active"), i("这些证据只验收本次迁移，不承诺所有变更都可逆。", "This evidence accepts this migration; it does not make every change reversible."))], "migration")
};
let v = (e, s) => e[+("en" === s)];
function b(e) {
  let {
    mode: s,
    items: t,
    locale: a
  } = e;
  return (0, r.jsx)("div", {
    className: "system-visual-items mode-".concat(s),
    children: t.map((e, s) => (0, r.jsxs)("div", {
      className: "system-visual-item state-".concat(e.state),
      children: [(0, r.jsx)("i", {
        "aria-hidden": "true"
      }), (0, r.jsx)("span", {
        children: v(e.label, a)
      }), (0, r.jsx)("strong", {
        children: v(e.value, a)
      })]
    }, "".concat(e.label[0], "-").concat(s)))
  });
}
function g(e) {
  let {
      scene: s,
      locale: t
    } = e,
    a = [s.page, s.queue, s.worker, s.result];
  return (0, r.jsxs)("div", {
    className: "system-special-workbench system-queue-workbench",
    children: [(0, r.jsxs)("header", {
      children: [(0, r.jsx)("span", {
        children: v(i("报表导出任务", "Report export job"), t)
      }), (0, r.jsx)("b", {
        children: v(s.badge, t)
      })]
    }), (0, r.jsx)("div", {
      className: "system-job-id",
      children: v(s.jobId, t)
    }), (0, r.jsx)("div", {
      className: "system-queue-flow",
      "aria-label": v(i("导出任务处理链路", "Export job processing path"), t),
      children: a.map(e => (0, r.jsxs)("div", {
        className: "system-queue-node state-".concat(e.state),
        children: [(0, r.jsx)("i", {
          "aria-hidden": "true"
        }), (0, r.jsx)("span", {
          children: v(e.title, t)
        }), (0, r.jsx)("strong", {
          children: v(e.detail, t)
        })]
      }, e.title[0]))
    }), (0, r.jsxs)("div", {
      className: "system-visual-evidence",
      children: [(0, r.jsx)("span", {
        children: v(i("可观察证据", "Evidence"), t)
      }), (0, r.jsx)("b", {
        children: v(s.evidence, t)
      })]
    })]
  });
}
function w(e) {
  let {
    scene: s,
    locale: t
  } = e;
  return (0, r.jsxs)("div", {
    className: "system-special-workbench system-migration-workbench",
    children: [(0, r.jsxs)("header", {
      children: [(0, r.jsx)("span", {
        children: v(i("真实 users 表与迁移记录", "Live users table and migration log"), t)
      }), (0, r.jsx)("b", {
        children: v(s.badge, t)
      })]
    }), (0, r.jsxs)("div", {
      className: "system-migration-layout",
      children: [(0, r.jsxs)("div", {
        className: "system-data-table",
        children: [(0, r.jsxs)("div", {
          className: "system-data-row is-head",
          children: [(0, r.jsx)("span", {
            children: "id"
          }), (0, r.jsx)("span", {
            children: v(i("name", "name"), t)
          }), (0, r.jsx)("span", {
            children: "status"
          })]
        }), s.rows.map(e => (0, r.jsxs)("div", {
          className: "system-data-row state-".concat(e.state),
          children: [(0, r.jsx)("span", {
            children: e.id
          }), (0, r.jsx)("strong", {
            children: v(e.name, t)
          }), (0, r.jsx)("code", {
            children: v(e.statusValue, t)
          })]
        }, e.id))]
      }), (0, r.jsx)("ol", {
        className: "system-migration-steps",
        children: s.steps.map(e => (0, r.jsxs)("li", {
          className: "state-".concat(e.state),
          children: [(0, r.jsx)("i", {
            "aria-hidden": "true"
          }), (0, r.jsx)("span", {
            children: v(e.version, t)
          }), (0, r.jsx)("strong", {
            children: v(e.detail, t)
          })]
        }, e.version[0]))
      })]
    }), (0, r.jsxs)("div", {
      className: "system-migration-history",
      children: [(0, r.jsx)("span", {
        children: v(i("执行记录", "Applied history"), t)
      }), (0, r.jsx)("code", {
        children: v(s.history, t)
      })]
    }), (0, r.jsxs)("div", {
      className: "system-visual-evidence",
      children: [(0, r.jsx)("span", {
        children: v(i("可观察证据", "Evidence"), t)
      }), (0, r.jsx)("b", {
        children: v(s.evidence, t)
      })]
    })]
  });
}
function k(e) {
  var s, t, i;
  let {
      kind: n,
      locale: o = "zh"
    } = e,
    c = m[n],
    [d, u] = (0, a.useState)(0);
  if (!c) return null;
  let h = null != (s = l[d]) ? s : l[0],
    k = null != (t = p[d]) ? t : p[0],
    y = null != (i = c.scenes[d]) ? i : c.scenes[0],
    f = "queue-task" === c.variant ? h.outcome : "migration" === c.variant ? k.outcome : y.outcome,
    x = "en" === o;
  return (0, r.jsxs)("section", {
    className: "system-concept-visual interactive-demo mode-".concat(c.mode, " state-").concat(d),
    tabIndex: 0,
    "aria-label": "".concat(v(c.label, o)).concat(x ? ". Use left and right arrow keys to change state." : "，可用左右方向键切换状态。"),
    onKeyDown: e => {
      if ("ArrowLeft" === e.key || "ArrowRight" === e.key) {
        let s;
        e.preventDefault(), s = "ArrowLeft" === e.key ? -1 : 1, u(e => Math.max(0, Math.min(2, e + s)));
      }
    },
    children: [(0, r.jsx)("div", {
      className: "system-visual-controls",
      role: "group",
      "aria-label": x ? "Change visual state" : "切换图解状态",
      children: c.tabs.map((e, s) => (0, r.jsx)("button", {
        type: "button",
        className: s === d ? "is-active" : "",
        "aria-pressed": s === d,
        onClick: () => u(s),
        children: v(e, o)
      }, e[0]))
    }), "queue-task" === c.variant ? (0, r.jsx)(g, {
      scene: h,
      locale: o
    }) : "migration" === c.variant ? (0, r.jsx)(w, {
      scene: k,
      locale: o
    }) : (0, r.jsxs)("div", {
      className: "system-visual-workbench",
      children: [(0, r.jsxs)("header", {
        children: [(0, r.jsx)("span", {
          children: v(c.label, o)
        }), (0, r.jsx)("b", {
          children: v(y.badge, o)
        })]
      }), "observability" === c.mode && (0, r.jsx)("div", {
        className: "system-visual-bars",
        "aria-hidden": "true",
        children: [38, 54 + 13 * d, 44 + 20 * d, 62 + 9 * d, 50 + 16 * d].map((e, s) => (0, r.jsx)("i", {
          style: {
            height: "".concat(Math.min(e, 96), "%")
          }
        }, s))
      }), "instances" === c.mode && (0, r.jsx)("div", {
        className: "system-visual-router",
        children: x ? "traffic / network" : "流量 / 网络"
      }), (0, r.jsx)(b, {
        mode: c.mode,
        items: y.items,
        locale: o
      }), (0, r.jsxs)("div", {
        className: "system-visual-evidence",
        children: [(0, r.jsx)("span", {
          children: x ? "Evidence" : "可观察证据"
        }), (0, r.jsx)("b", {
          children: v(y.evidence, o)
        })]
      })]
    }), (0, r.jsx)("p", {
      children: v(f, o)
    })]
  });
}
export {};
export default k;
