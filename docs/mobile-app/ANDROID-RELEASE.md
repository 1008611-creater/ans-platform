# 安卓 App 发版手册

手机端 App 是 `mobile/android` 里的一个 WebView 外壳，打开就是 `https://ans.cauai.fun/competitions/agrihackathon`。网站改动不用发 App；只有外壳本身变了（上传、下载、返回键、图标、首页地址等）才需要发新版。

## 签名密钥（最重要）

- 正式密钥只有一把：`~/.ans-secrets/android/ans-release.p12`（别名 `ans`，密码在同目录 `keystore-password.txt`）。
- 证书 SHA-256 指纹：`C4:FD:3F:3B:BE:D0:7D:0B:DE:F9:91:C2:0E:9F:85:2C:6D:3F:0F:4E:7A:17:B5:F6:3F:56:3C:67:56:56:F1:71`。
- 丢了它，以后的新版本没法覆盖安装，所有用户都得卸载重装。这个目录要另外加密备份，**不进 git，不放网盘公开目录**。
- CI 用的是仓库 Secrets：`ANS_KEYSTORE_BASE64`、`ANS_KEYSTORE_PASSWORD`。`.github/workflows/android.yml` 会核对指纹，签名对不上直接失败。

换电脑时，把 `~/.ans-secrets/android/` 整个拷过去即可；CI 不依赖本机。

## 发一个新版本

1. 改 `mobile/android/gradle.properties`：`ANS_VERSION_CODE` 加 1，`ANS_VERSION_NAME` 改成新版本号。
2. 开 PR。`Android App` 工作流会编译、签名、核对指纹，安装包挂在运行页的 Artifacts 里，先下载到真机试装。
3. 试装没问题后，把安装包放进 `public/downloads/ANS-<版本号>.apk`，删掉上一个版本的 apk，并更新 `public/downloads/android-latest.json` 的 `versionCode`、`versionName`、`file`、`sizeBytes`、`notes`。
4. 合并、部署。旧版 App 下次启动会读 `android-latest.json`，提示升级。

真机试装至少走一遍：安装 → 登录 → 农客松提交页选文件（含 .zip、多选、拍照）→ 返回键 → 断网再重试 → 点站外链接会跳浏览器。

## iPhone

没有安装包。`/app` 页引导用户用 Safari「分享 → 添加到主屏幕」，从桌面打开是全屏的。要做真正的 iOS App 需要苹果开发者账号（$99/年）走 TestFlight，暂不做。
