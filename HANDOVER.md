# 腕上导航维护交接

更新日期：2026-10-28。工作目录以当前仓库根目录为准，与用户使用中文沟通。

## 亮度功能回退与最终状态（2026-10-28）

0.2.8 真机验证结论：滑条调节后手环亮度无变化、页面亦无任何错误文字——**10 Pro 固件接受 `system.brightness.setValue` 调用但不产生实际效果，导航亮度调节在该机型判定为不可用**（0.2.8 的错误可视化诊断正好给出了这一判定）。按用户决定整体移除亮度调节代码：手机滑条与协议 brightness 字段、手环应用/恢复/错误显示逻辑全部删除；`systembrightnessrecovery` 兜底保留（用于常亮释放卡死，与调亮无关）。

重建交付：手环 `wearable/dist/io.github.mi9pro.navigation.debug.0.2.6.rpk`，199,942 字节，SHA-256 `6d1df8cddf2532e8319ae6c8088365eb69308e8b11d07c14b04c55f335525498`（内容即 0.2.6 功能定义；手环已装 0.2.8，需先卸载再安装）；手机 `android/app/build/outputs/apk/debug/app-debug.apk`，0.2.2 / code 7（内容回退为与 0.2.1 一致），800,536 字节，SHA-256 `44da0942bf1acbdf096dedb01ac31d4530d94c914a856b81265c47456701a296`，同签名可直接覆盖安装。本地验证：49/49 项 JS 测试、RPK 内容/签名检查、Android 单测/Lint/构建通过。若未来固件更新后想重试腕上亮度控制，判定方法沿用 0.2.8：无变化且无错误文字即不可用。

## 0.2.8 修复导航亮度不生效（2026-10-28，已回退）

用户反馈 0.2.7 滑条调整后手环亮度无变化。三个根因同轮修复：亮度原先在 setKeepScreenOn 之前应用，固件进入常亮时重新套用自身亮度造成覆盖，现改为常亮建立成功后再应用（success 回调与直接调用双保险，覆盖不回调的固件）；自动亮度模式（mode=1）会持续覆盖手动值，进入常亮时 getMode 探测、自动则临时 setMode(0) 并保存原模式，退出常亮/导航结束/销毁时恢复原模式与原亮度；亮度读写失败原先静默，现通过页面警告通道（screenError 同款）显示「亮度设置失败/读取失败/控制不可用 + 错误码」，成功即清除。0.2.8 / code 13 仅手环端变更，手机 0.2.2 无需更新。

本地验证：54/54 项 JS 测试（新增自动模式切换与恢复、亮度错误显示两组用例；mock 增加 getMode/setMode 与 brightnessFails 对 setValue 的失败注入）、RPK 内容检查、签名验证、公开文件检查通过。交付 `wearable/dist/io.github.mi9pro.navigation.debug.0.2.8.rpk`，SHA-256 `79703c6c87480dca9370bb9b7ed4744cb270b703ec04692476603208313ce217`。待真机验证：亮度实际变化与退出恢复、自动亮度机型上的表现；若手环页面出现「亮度设置失败/亮度读取失败 + 错误码」，把文案反馈回来即可精确定位；若毫无变化且无任何错误文字，则该固件对 setValue 无实际效果，此功能在该机型上不可用（其余功能不受影响）。

## 0.2.7 / 0.2.2 导航亮度（2026-10-28）

用户定调：导航常亮是刚需，不做自动化折扣，亮度交给用户自调。手机「导航偏好」新增「自定义导航亮度」开关 + 0–255 滑条（默认关＝跟随系统）；开启后经数据包可选 brightness 字段下发（协议向后兼容，decode 校验 0–255 整数，非法整包丢弃）。手环仅在进入常亮时 getValue 存原值 → setValue 应用（下限 1 避免全黑），值变化才更新；退出常亮、导航结束或页面销毁恢复原值，`systembrightnessrecovery` 兜底保留。brightness 属已声明并验证可用的 system.brightness 模块，未新增 feature 声明（无 0.2.6 振动那类风险）；不支持 setValue 的固件静默跟随系统。

手机 0.2.2 / code 7（WearBridge + MainActivity 变更），同签名覆盖安装；手环 0.2.7 / code 12 经 AstroBox 更新（此版本号取代此前未分发过的同号临时构建）。本地验证：52/52 项 JS 测试（含 brightness 协议校验、应用/恢复、跟随系统不触碰）、RPK 内容检查（含亮度应用/恢复断言）、Android 单测/Lint/构建、签名验证、公开文件检查通过。交付：手环 `wearable/dist/io.github.mi9pro.navigation.debug.0.2.7.rpk`，200,259 字节，SHA-256 `b15796a4a62cbec5b54680d14815448bf9fa1f363e0c4e82b8c96e7f06677e89`；手机 `android/app/build/outputs/apk/debug/app-debug.apk`，800,536 字节，SHA-256 `e8fc1eb753a7b359c51fe0fbecef224afb20620f702a34a9e8074421eb36a41c`。待真机验证：滑条调节后手环亮度实际变化与退出恢复、自动亮度模式下的行为（官方未承诺，可能被系统覆盖）、0–255 档位手感。耗电对照法：充满电同路线导航 1 小时记录两端电量，开关亮度各测一次。手机端通知监听掉线问题（0.2.6 插曲的真正根因）仍未加自动重绑，遇到时手动开关通知使用权恢复。

## 0.2.6 精简与震动（2026-10-28）

用户确认 0.2.5 在 10 Pro 导航可用后，拍板三项变更：移除内置字体系统（三款 TTF、字体选择页与覆盖检测全部删除，统一系统字体，旧设置中的字体字段被 normalize 静默忽略）；新增转向/到达震动（指引文本变化短震、status=ended 长震，心跳重发的相同指令不重复震；`@system.vibrator` 走 require try/catch 探测，不可用即永久静默；manifest 声明 system.vibrator——aiot-toolkit 强制「代码引用即声明」，构建期就要求声明，无法以无声明方式探测）；页面销毁时常亮清理兜底（曾点亮过才调用，探测到 `systembrightnessrecovery` 才执行）。

插曲与教训：0.2.6 首次安装后 10 Pro 同步中断，当时误判为振动声明所致，临时出过移除振动的 0.2.7；随后确认根因是**手机端通知监听掉线**（App 状态「正在连接通知服务」即 listenerConnected=false，前面环节含手环节点连接全部正常），与手环包无关，0.2.7 撤销、振动恢复进 0.2.6 重建。以后同步类故障先读手机端状态机再怀疑手环包；HyperOS 可能解绑通知监听且 requestRebind 偶尔不生效，手动开关一次通知使用权即可恢复。

0.2.6 / code 11 仅手环端变更，手机 APK 不需要更新。本地验证：49/49 项 JS 测试、RPK 内容检查（含震动与恢复断言）、签名验证、公开文件检查通过。交付 `wearable/dist/io.github.mi9pro.navigation.debug.0.2.6.rpk`，199,952 字节（0.2.4 为 8,169,527 字节），SHA-256 `1da1992db4c4cf9a47366a1515db082c41f2ffbecb92eebf1222205af6c0a168`。更新前先卸载旧包再安装（同版本号覆盖安装行为未验证）。待真机验证：转向/到达震动在 10 Pro 是否生效（官方支持明细未列该机型；9 Pro 官方支持 vibrate）、设置页无字体项、旧设置兼容。若手机监听正常时同步再断，再重新怀疑振动声明。浏览器交互断言未重跑（本机无 agent-browser）。

## 小米手环 10 Pro 适配（2026-10-28）

用户在小米手环 10 Pro（Vela 5.0，屏幕与 9 Pro 同为 1.74 英寸 336×480）安装 0.2.4 RPK 后，手环端发送 ready/ack 报「发送失败（202）invalid args」。根因已从固件源码确认：Vela 5 的 interconnect JIDL 把 send 的 `data` 参数定为 object（open-vela 仓库 `frameworks_runtimes_feature` 的 `interconnect.jidl`、`interconnect_impl.cpp` 中 `kInvalidArgs = 202`，发送前 `getMsg` 检查 `FT_TYPE_OBJECT`），旧固件容忍的 JSON 字符串形态被参数校验拒绝；固件发送前把对象转成文本，手机端收到的仍是 JSON 字节，接收方向 `onmessage` 仍为 string，故手机端与协议校验均无需改动。

修复为手环端发送自适应（0.2.5 / code 10，未构建）：发送默认保持字符串形态，遇 202/invalid args 立即切换对象形态重发同一条消息并锁存可用形态（跨页面重建保留），双形态都失败才显示报错；9 Pro 行为不变。`presentation.js` 新增 `invalidArgs` 判定，`page.test.js` 新增 3 项覆盖拒绝后重发锁存、双形态失败保留报错与错误签名判定，本地 47/47 项测试通过；`tools/preview-runtime.js` mock 兼容双形态。

当前状态：用户拍板为本副本适配生成新的配对签名身份（原作者私有签名不可得，原「不轮换证书」约束针对原作者既有配对，不适用于本副本）。`wearable/sign/debug/{private,certificate}.pem` 与 `signing/development.p12` 现为同一身份：CN=wrist-navigation，证书 SHA-256 指纹 5D:E7:67:F9:96:ED:48:91:81:04:CC:A1:C3:84:44:6E:6E:58:0F:AA:56:AB:02:C0:EF:C7:95:D7:CC:7F:89:B5，有效期至 2036-10-25；两目录均被 gitignore，必须私下备份，丢失后需重新生成并双端重装。0.2.5 双包已构建并通过本地检查：47/47 项 JS 测试、RPK 内容检查与签名验证（含嵌套签名）、Android 单测/Lint/assembleDebug、apksigner 证书指纹与 RPK 证书逐字节一致。交付文件：`wearable/dist/io.github.mi9pro.navigation.debug.0.2.5.rpk`（SHA-256 `a1d2a57fa0c3359a16ea2e0879269c6ab0c42e9747e3f7f7c921a12e15e0851d`）与 `android/app/build/outputs/apk/debug/app-debug.apk`（SHA-256 `519bb017513596087a7f87c12a608a3753a51b2c1af432dcb3ff725fe0c5b399`）。新签名与设备上已安装的 0.2.1/0.2.4 不兼容：手机需先卸载旧「腕上导航」再装新 APK，并重新授予通知使用权、附近设备权限和互联授权；手环 RPK 经 AstroBox 按机型重装。2026-10-28 用户在 10 Pro 安装 0.2.5 双包后确认导航可正常使用（Vela 5 发送自适应生效）；字体的实际加载、全部显示设置、长时间锁屏、重启恢复、ACK 回程、耗电与 9 Pro 回归未逐项验收。本机没有 agent-browser，浏览器交互断言未重跑，页面行为以 vm 级测试覆盖。

## 当前版本与证据

- 手机：0.2.1 / code 6，已核对安装状态；发布候选为从设备恢复并验证的原签名调试 APK。
- 手环：0.2.4 / code 9，已构建、传至手机且核对 SHA-256，用户于 2026-09-22 确认安装使用正常。
- 已实现四种字体、全页面字号联动、箭头大小与粗细、设置滚动、保存和恢复默认。默认字号 30、箭头 42、粗细 8、图文间距 26；齿轮 42，点击区 64×64。旧设置保留。
- 本地 JS、RPK 编译/签名及浏览器交互检查已有通过记录；字体真实加载、资源性能、全部设置、长期锁屏、重启恢复、ACK 和耗电未逐项验收。详见 [验证摘要](docs/navigation-verification.md)。

## 本轮发布范围

用户要求先发布 GitHub，暂停米坛发布，发布前整理文件并参考近期同类项目。原创代码采用 MIT；“仅供学习、研究与技术交流”表达项目定位，不增加 MIT 之外的限制。联系邮箱为 2858005527@qq.com。

公开目录保留双端源码、测试、开发工具、当前截图与必要文档；旧设计图、提示词、米坛草稿和冗长开发记录归档在被忽略的 `.local/archive/github-prep-2026-09-23/`。历史安装包与旧源码 ZIP 在 `outputs/archive/2026-09-23/`。公开 Git 历史未改写，归档不表示旧提交中的已跟踪文档被抹除。

GitHub 仓库现已公开；[v0.2.4 测试版](https://github.com/Gu-Mie/wrist-navigation/releases/tag/v0.2.4) 已发布，标签对应提交 `0f89a92`。该提交的 Windows/Ubuntu × Node.js 22/24 四组 CI 全部通过；四个附件已在未登录状态下载并核对哈希，GitHub 自动源码归档为 188 个文件，不含签名、SDK AAR、安装包或本地资料。

发布附件位于 `outputs/releases/v0.2.4/`；当前预览输出到 `outputs/previews/`。用户随后要求按米坛发布表单截图准备填写文档，已生成 `outputs/publication/bandbbs-v0.2.4/米坛发布填写指南-v0.2.4.md`、纯文本正文、192×192 图标和源码预览图，使用实际 GitHub 下载链接；未向米坛提交资源。

## 仓库更名（2026-09-23）

仓库已改名为 `Gu-Mie/wrist-navigation`，Git origin、当前文档、Release 说明及本地米坛填写材料已同步使用新地址。保留 v0.2.4 标签、Release 和四个附件；安装包的包名、签名及校验值不变。本地工作目录仍以当前检出路径为准。已同步保留用户在 GitHub 对 README 的最新修改。

## 后续工作

1. 保留用户认可的手机界面与当前互联消息格式。
2. 双端必须保持包名 `io.github.mi9pro.navigation` 和原匹配签名；维护现有应用不得重新生成、轮换或公开私钥。
3. 如继续真机联调，先重新查 ADB 状态，只读取本项目与高德相关数据；传包后核对 SHA-256。
4. 优先核对字体实际变化、最大字号滚动、重开保存与导航结束/断连释放常亮；历史成功不替代当前版本验收。
5. 小米 SDK 保留第三方权利说明。已查看的文档未给出可确认的独立分发条款，不声称额外授权，也不把未知事项写成已确认的禁止发布规定。

源码位置与操作边界见 [AGENTS.md](AGENTS.md)，安装与开发入口见 [文档索引](docs/README.md)。
