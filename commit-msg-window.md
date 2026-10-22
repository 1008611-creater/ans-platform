fix(gateway): 旧的 UNCERTAIN 不再永久占用活跃额度（否则模型会被锁死）

缺陷：codex-gateway 的活跃额度把 UNCERTAIN 永久计入（默认上限 4）：
  上游抖动一次就可能留下 4 笔 UNCERTAIN，此后该学生在这个模型上
  每一轮都被 TOO_MANY_ACTIVE_REQUESTS 拒绝，且没有任何提示或自助出口。
（今天我自己测试就复现了：清掉对账后仍发不出新请求。）

修法：活跃额度只由「真正在跑」（AUTHORIZED/RUNNING）和「刚刚变得不确定」
（UNCERTAIN 且 createdAt 在 15 分钟窗口内）占用。
历史 UNCERTAIN 仍是账务负债，由下方既有的 liabilityScan 照旧处理 —— 钱的语义没变，
变的只是并发闸门不再把陈年记录算成「正在跑」。

验证：typecheck 0 错误；gateway-billing-units / apic-billing / benefit-paid-holds 13 条全过。