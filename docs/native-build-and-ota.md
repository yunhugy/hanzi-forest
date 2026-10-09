# 汉字小森林 · Android 原生版构建与云端更新

> 目标：出一个能装在 Android 手机上的 APK，并且**以后改代码不用重装** —— 更新走你自己的服务器。

## 架构

```
你的 GitHub 仓库 ──push──▶ GitHub Actions ──构建──▶ APK ──▶ 装到手机
                                │
                                └──▶ 更新包 ──▶ 你的服务器 ──▶ 手机自动拉取
```

- **构建**：GitHub Actions（私有仓库每月 2000 分钟免费，Android 构建约 10–15 分钟）
- **更新分发**：你服务器上的 xprem（自托管 OTA 服务，遵循 Expo 官方协议）
- **不需要**：EAS 账号、Expo 云、Google Play、Apple 账号

## 本地已经改好的东西

| 文件 | 作用 |
|---|---|
| `app.json` | 加了 `runtimeVersion`（fingerprint 策略）与 `updates` 配置 |
| `plugins/withAndroidReleaseSigning.js` | 让 release 构建用你自己的签名，而不是 RN 模板默认的 debug 签名（**已实测生效**） |
| `.github/workflows/android-build.yml` | 云端构建 APK 的流水线 |
| `.gitignore` | 排除 `/android` `/ios`（每次构建现场生成，不进仓库） |

## 你需要做的三件事

### ① 生成签名密钥（只做一次，然后务必多处备份）

Android 的更新必须用**同一个签名**。这个文件丢了，已装的 App 就再也收不到更新，只能卸载重装。

```bash
# 在项目根目录执行
keytool -genkeypair -v \
  -keystore hanzi-forest.jks \
  -alias hanzi-forest \
  -keyalg RSA -keysize 2048 -validity 10000
```

它会问密码和姓名等信息。**密码请自己设，存进密码管理器**，不要发给我。

生成后立刻备份到网盘 + 另一块本地盘。然后转 base64（后面填进 GitHub Secrets 用）：

```bash
base64 -w 0 hanzi-forest.jks > keystore.b64
```

> ⚠️ `hanzi-forest.jks` 与 `keystore.b64` **都不要提交到仓库**（`.gitignore` 已排除 `*.jks`）。

### ② 部署 xprem 更新服务器

在你那台服务器上执行（需要 Docker）。

**a. 生成两个密钥**

```bash
openssl rand -base64 32   # 记作 JWT_SECRET
openssl rand -base64 32   # 记作 DB_KEYS_MASTER_KEY_B64
```

**b. 启动 Postgres**

```bash
docker network create eoo

docker run -d --name eoo-db --network eoo \
  -e POSTGRES_PASSWORD='换成一个强密码' \
  -e POSTGRES_DB=expo_open_ota \
  --restart unless-stopped \
  postgres:16
```

**c. 启动 xprem**

```bash
mkdir -p ~/xprem/updates && cd ~/xprem

docker run -d --name xprem --network eoo \
  -p 3000:3000 \
  -e BASE_URL=https://你的域名 \
  -e DB_URL="postgres://postgres:换成一个强密码@eoo-db:5432/expo_open_ota?sslmode=disable" \
  -e DB_KEYS_MASTER_KEY_B64=第一步的DB_KEYS_MASTER_KEY_B64 \
  -e JWT_SECRET=第一步的JWT_SECRET \
  -e STORAGE_MODE=local \
  -e LOCAL_BUCKET_BASE_PATH=/updates \
  -e CACHE_MODE=local \
  -e USE_DASHBOARD=true \
  -e ADMIN_EMAIL=你的邮箱 \
  -e ADMIN_PASSWORD='你的面板密码' \
  -v ~/xprem/updates:/updates \
  --restart unless-stopped \
  ghcr.io/mercuretechnologies/xprem:latest
```

启动成功的标志是日志里出现：

```
⚙️  [CONTROL] Initializing Control Plane (DB Mode)..
```

自检：

```bash
curl http://localhost:3000/hc
```

**d. 配 HTTPS**

`expo-updates` 强制要求 HTTPS。用 Nginx 反代 + Let's Encrypt：

```bash
certbot --nginx -d 你的域名
```

Nginx 站点配置：

```nginx
server {
    listen 443 ssl http2;
    server_name 你的域名;

    ssl_certificate     /etc/letsencrypt/live/你的域名/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/你的域名/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**e. 在面板里创建应用**

访问 `https://你的域名/dashboard`，用 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 登录，然后：

1. **App Info** → 复制 **App ID**
2. **App Info** → 右上角 **Download certificate** → 存成 `certs/certificate.pem`（**这个要提交到仓库**，App 用它验证更新确实来自你的服务器）
3. **API tokens** → 新建一个 token（**只显示一次**，保存好，这就是 `EOO_TOKEN`）
4. **Channels** → Create Channel，名字填 `production`

### ③ 建 GitHub 仓库并配置 Secrets

把 `apps/hanzi-forest` 作为仓库根推上去。然后在 **Settings → Secrets and variables → Actions** 里加这些：

| Secret 名 | 值 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | ① 生成的 `keystore.b64` 全文 |
| `ANDROID_KEYSTORE_PASSWORD` | keystore 密码 |
| `ANDROID_KEY_ALIAS` | `hanzi-forest` |
| `ANDROID_KEY_PASSWORD` | 密钥密码（通常与上面相同） |
| `EOO_TOKEN` | ② 里创建的 API token |

还要把 `app.json` 里的占位地址换成你的真实域名：

```json
"updates": {
  "url": "https://你的域名",
  ...
}
```

（`npx eoas init` 也能自动写这段，它会提示你填 App ID 和服务器地址）

## 首次构建

推代码上去后，到 **Actions → Build Android APK → Run workflow** 手动触发。

构建成功后在 run 页面底部下载 `hanzi-forest-apk`，传到手机安装（首次需允许「未知来源」）。

## 日常更新（以后就这么干）

```bash
export EOO_TOKEN=你的token
export RELEASE_CHANNEL=production
npx eoas@<服务器版本> publish --branch production
```

> ⚠️ 不要用不带版本号的 `npx eoas` —— 官方明确警告可能拉到不兼容的新版本，版本号要与服务器保持一致。

孩子下次打开 App 时更新在后台下载，再下次打开就是新版。

## 什么情况必须重新出 APK

- 新增原生依赖库
- 改权限或系统能力
- 换图标、应用名、包名
- 升级 Expo / RN 大版本

其余（改题目、加字库、调样式、修 bug）都能走云端更新。

## 已知限制

- **iOS 不适用** —— 需要 Apple 开发者账号（$99/年）
- **服务器在美国/欧洲，国内拉更新偏慢** —— 但 `expo-updates` 是增量更新（只下载变化的文件），日常更新包通常几百 KB，可以接受；真嫌慢可加 CDN
- **本地跑 `expo prebuild --clean` 会被宿主拦截**（批量删除保护，阈值 50 文件）—— 本地要重新生成原生工程时，先把 `android/` 目录 `mv` 走，再跑不带 `--clean` 的 prebuild

