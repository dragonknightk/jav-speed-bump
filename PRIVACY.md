# 隐私政策

**色情减速带（jav-speed-bump）**  
生效日期：2026-11-02

本扩展不收集、不传输、不出售、不分享任何用户数据。开发者没有接收浏览记录或设置的服务器。名单、设置和触发记录只保存在你自己的设备上。

## 保存在本机的数据

扩展只使用 `chrome.storage.local`。数据不会同步到浏览器账号，也不会离开这台设备。

- **名单与设置。** 你添加的域名和关键词、你移除的条目，以及“24 小时后生效”的待移除项。内置屏蔽名单随扩展一起打包，不从网络下载、也不单独上传。
- **触发记录。** 每次拦截会记一条，最多保留最近 5000 条，字段包括：时间、域名（主机名）、命中的规则（某个域名或关键词）、你在屏蔽页自己点选的原因（无聊、压力、孤独、疲惫、等待中、其他）、做题用时、是否完成、当次难度和题型。记录里没有完整网址、路径、查询串或网页正文。
- **安装时间。** 一个 `installedAt` 时间戳，用来在统计页计算连续未触发时长。

这些数据只用于本机拦截、难度调整和统计，不会上传或离开本机。

卸载或移除扩展后，浏览器会删除该扩展的 `chrome.storage.local` 数据。

解题页打开期间，原始网址只出现在扩展页面自己的地址片段里，并临时写在该页面的 `sessionStorage` 中，以免刷新时重复记一条；做完题跳转到最终屏蔽页时只传递域名（主机名），不保留路径或查询参数。原始完整网址不会写入上面的持久记录，扩展也不会把它发送出去。未命中屏蔽规则的访问不会被保存。内存里会短暂记住刚被拦截的地址，只为避免同一个标签页被连续跳转两次；扩展进程结束后这份内存记录消失。

## 扩展不会做的事

- 不加载远程代码。全部脚本、样式和图标都打包在扩展内，没有远程脚本，也没有 `eval`。
- 不使用分析、统计或广告服务，不接入任何第三方。
- 不读取网页正文、Cookie、密码或表单内容。没有内容脚本。
- 不要求账号，也没有登录。

## 权限为什么需要

| 权限 | 用途 |
| --- | --- |
| `storage` | 把名单、设置和触发记录写入本机 `chrome.storage.local`。 |
| `declarativeNetRequest` | 在名单中的网站发出主框架请求之前，把导航重定向到扩展内的解题页。不读取响应内容。 |
| `webNavigation` | 查看主框架导航的网址，用来拦住关键词搜索，以及单页应用里的 `pushState`、路由和片段跳转。域名拦截由上一条规则完成。 |
| `tabs` | 读取标签页的网址以判断要不要拦截，并把该标签页转到解题页；屏蔽页上的“关闭”会关掉当前标签页。不向网页注入脚本。 |
| `alarms` | 大约每 10 分钟检查一次，把已经到期的“移除名单”请求在本机生效。 |
| `<all_urls>` | 主机权限只用来看到导航网址并决定要不要重定向。扩展不读取页面内容。未命中的网址不会写入存储。 |

## 联系

对本政策或扩展的数据处理有疑问，请到 GitHub 提 issue：<https://github.com/dragonknightk/jav-speed-bump/issues>。

## English

jav-speed-bump does not collect, transmit, sell, or share any user data. Blocklist customizations, settings, and trigger logs (time, hostname, matched rule, reason you choose, puzzle duration, completion, difficulty, and puzzle types) stay on your device in `chrome.storage.local` and are deleted when you remove the extension. There is no remote code, no analytics, and no third-party service. Permissions (`storage`, `declarativeNetRequest`, `webNavigation`, `tabs`, `alarms`, and `<all_urls>`) are used only to store that local data and to decide whether a navigation should be redirected. The extension does not read page content. Contact: <https://github.com/dragonknightk/jav-speed-bump/issues>. Effective date: 2026-11-02.
