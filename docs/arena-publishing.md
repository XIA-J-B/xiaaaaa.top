# Arena 公开统计页

路径：`https://xiaaaaa.top/arena/`。主站项目区新增入口；原项目入口保留。
仅静态 HTML/CSS/JS 和汇总快照，适用 GitHub Pages。不需要改变 DNS，也不对外开放本机 Node 服务。

## 发布范围

允许公开：观测日期、模型名称、模式、调用次数、trace Token 与费用合计、标签覆盖率、近似标签数量，以及快照生成时间。
不公开：会话标题、session/run/span ID、账户/额度、原始记录、提示词或回复、凭据、本机路径。
公众可以下载公开 JSON；只读不等于不可复制。不要把本机 data 目录、导出文件或 .env 放入此仓库。

## 更新快照

1. 开启本机统计站，等待插件同步。
2. 在仓库根目录运行（填写你的实际 Inspector 目录）：

   `node tools/arena/update-snapshot.mjs --inspector "C:\path\to\arena-trace-inspector"`

3. 运行回归：`node --test tools/arena/snapshot.test.mjs`。
4. 审核 `arena/snapshot.json` 变化，再提交并推送到当前 GitHub Pages 发布分支。

更新脚本只读本机服务的账本，在内存中复用本机调用规范化/去重逻辑，再构造严格公开白名单；只写出 `arena/snapshot.json`。脚本不会执行 git commit/push，不会写出临时原始账本。

访客“刷新快照”仅重新读取已发布 JSON，不能控制本机同步或触发发布。GitHub Pages/CDN 可能存在发布与缓存延迟。快照生成超过 24 小时时页面会提示。
本机管理站与公开静态页独立，本机关闭后仍可查看最后发布的快照。

## 本次恢复

经授权以线上首页为基础恢复缺失的本地 index.html，再增加 Arena 入口；未用旧备份覆盖线上主页。部署前的线上首页与 git 状态保存在仓库外的 `XIAAAAA.top-backups` 中。
只提交本次 index.html、arena/、tools/arena/ 和本文档；不要夹带其他未跟踪 tools 或 docs 文件。
