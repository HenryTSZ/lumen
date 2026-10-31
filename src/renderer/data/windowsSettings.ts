/**
 * Windows 设置项清单（离线内置）。
 *
 * 每一项 = 一个可以直接跳转的入口：
 *   - `ms-settings:*` 走 Windows 设置 URI（Win10/11 通用）
 *   - `.cpl` / `.msc` / 可执行名走控制面板与管理工具
 *
 * 中英双语标题 + 关键词，方便中文直搜（"蓝牙"）也能英文直搜（"bluetooth"）。
 */

export interface WinSettingGroup {
  title: string
  titleEn: string
  icon: string
}

export interface WinSetting {
  /** 中文标题 */
  title: string
  /** 英文标题 */
  titleEn: string
  /** 额外搜索关键词（中英混排） */
  keys: string[]
  /** 分组下标，对应 WIN_SETTING_GROUPS */
  group: number
  /** ms-settings: URI，或控制面板/管理工具的可执行名 */
  target: string
  /** 覆盖分组图标 */
  icon?: string
}

export const WIN_SETTING_GROUPS: WinSettingGroup[] = [
  { title: '系统', titleEn: 'System', icon: '🖥️' },
  { title: '蓝牙与设备', titleEn: 'Bluetooth & Devices', icon: '🖱️' },
  { title: '网络与 Internet', titleEn: 'Network & Internet', icon: '🌐' },
  { title: '个性化', titleEn: 'Personalization', icon: '🎨' },
  { title: '应用', titleEn: 'Apps', icon: '📦' },
  { title: '账户', titleEn: 'Accounts', icon: '👤' },
  { title: '时间与语言', titleEn: 'Time & Language', icon: '🕒' },
  { title: '辅助功能', titleEn: 'Accessibility', icon: '♿' },
  { title: '隐私与安全', titleEn: 'Privacy & Security', icon: '🔒' },
  { title: '游戏', titleEn: 'Gaming', icon: '🎮' },
  { title: '更新与安全', titleEn: 'Update & Security', icon: '🛡️' },
  { title: '管理工具', titleEn: 'Administrative Tools', icon: '🧰' }
]

export const WIN_SETTINGS: WinSetting[] = [
  /* ---------------- 0 系统 ---------------- */
  { title: '系统', titleEn: 'System', keys: ['system', '关于', 'about', '设备规格'], group: 0, target: 'ms-settings:system' },
  { title: '显示', titleEn: 'Display', keys: ['display', '屏幕', '分辨率', '缩放', '显示器', 'resolution'], group: 0, target: 'ms-settings:display' },
  { title: '图形设置', titleEn: 'Graphics Settings', keys: ['graphics', '显卡', 'GPU', '默认图形', '高性能'], group: 0, target: 'ms-settings:display-advancedgraphics' },
  { title: '夜间模式', titleEn: 'Night Light', keys: ['nightlight', 'night light', '护眼', '蓝光', '色温'], group: 0, target: 'ms-settings:nightlight', icon: '🌙' },
  { title: '声音', titleEn: 'Sound', keys: ['sound', '音量', '音频', '扬声器', '麦克风', 'volume', 'audio'], group: 0, target: 'ms-settings:sound', icon: '🔊' },
  { title: '声音设备', titleEn: 'Sound Devices', keys: ['输入设备', '输出设备', 'audio devices'], group: 0, target: 'ms-settings:sound-devices', icon: '🔊' },
  { title: '通知', titleEn: 'Notifications', keys: ['notification', '消息', '横幅', '免打扰', '专注'], group: 0, target: 'ms-settings:notifications', icon: '🔔' },
  { title: '电源与电池', titleEn: 'Power & Battery', keys: ['power', 'battery', '电源', '电池', '睡眠', '省电', '功耗'], group: 0, target: 'ms-settings:powersleep', icon: '🔋' },
  { title: '电池使用情况', titleEn: 'Battery Usage', keys: ['battery saver', '电量', '耗电'], group: 0, target: 'ms-settings:batterysaver', icon: '🔋' },
  { title: '存储', titleEn: 'Storage', keys: ['storage', '磁盘', '空间', '容量', '清理', 'disk'], group: 0, target: 'ms-settings:storagesense', icon: '💾' },
  { title: '多任务处理', titleEn: 'Multitasking', keys: ['multitasking', '贴靠', '分屏', 'snap', '虚拟桌面', '任务视图'], group: 0, target: 'ms-settings:multitasking' },
  { title: '投影到此电脑', titleEn: 'Projecting to this PC', keys: ['project', '投屏', '无线显示', 'miracast'], group: 0, target: 'ms-settings:project', icon: '📽️' },
  { title: '远程桌面', titleEn: 'Remote Desktop', keys: ['remote desktop', 'rdp', '远程', 'mstsc'], group: 0, target: 'ms-settings:remotedesktop' },
  { title: '剪贴板', titleEn: 'Clipboard', keys: ['clipboard', '复制', '粘贴', '历史记录', '剪切板'], group: 0, target: 'ms-settings:clipboard', icon: '📋' },
  { title: '关于本机', titleEn: 'About', keys: ['about', '设备名称', '规格', 'CPU', '内存', '系统版本'], group: 0, target: 'ms-settings:about', icon: 'ℹ️' },

  /* ---------------- 1 蓝牙与设备 ---------------- */
  { title: '蓝牙和设备', titleEn: 'Bluetooth & Devices', keys: ['bluetooth', '蓝牙', '配对', '无线耳机', '设备'], group: 1, target: 'ms-settings:bluetooth', icon: '🖇️' },
  { title: '打印机和扫描仪', titleEn: 'Printers & Scanners', keys: ['printers', '打印机', '扫描仪', 'print', '打印队列'], group: 1, target: 'ms-settings:printers', icon: '🖨️' },
  { title: '已连接的设备', titleEn: 'Connected Devices', keys: ['connecteddevices', '已连接设备', '外接设备'], group: 1, target: 'ms-settings:connecteddevices' },
  { title: '触控笔和 Windows Ink', titleEn: 'Pen & Windows Ink', keys: ['pen', '触控笔', '手写', 'ink', '手写笔'], group: 1, target: 'ms-settings:pen', icon: '✒️' },
  { title: '自动播放', titleEn: 'AutoPlay', keys: ['autoplay', '自动播放', '插入U盘'], group: 1, target: 'ms-settings:autoplay', icon: '▶️' },
  { title: 'USB', titleEn: 'USB', keys: ['usb', '设备连接', 'usb  hubs'], group: 1, target: 'ms-settings:usb', icon: '🔌' },

  /* ---------------- 2 网络 ---------------- */
  { title: '网络和 Internet', titleEn: 'Network & Internet', keys: ['network', '网络', 'internet', '联网'], group: 2, target: 'ms-settings:network' },
  { title: 'Wi-Fi', titleEn: 'Wi-Fi', keys: ['wifi', 'wi-fi', '无线', 'wlan', '无线网络', '热点列表'], group: 2, target: 'ms-settings:network-wifi', icon: '📶' },
  { title: '以太网', titleEn: 'Ethernet', keys: ['ethernet', '有线', '网线', 'lan'], group: 2, target: 'ms-settings:network-ethernet' },
  { title: 'VPN', titleEn: 'VPN', keys: ['vpn', '虚拟专用网', '代理隧道'], group: 2, target: 'ms-settings:network-vpn', icon: '🔐' },
  { title: '飞行模式', titleEn: 'Airplane Mode', keys: ['airplane', '飞行模式', '断网', 'airplane mode'], group: 2, target: 'ms-settings:network-airplanemode', icon: '✈️' },
  { title: '移动热点', titleEn: 'Mobile Hotspot', keys: ['hotspot', '热点', '共享网络', 'tethering'], group: 2, target: 'ms-settings:network-mobilehotspot', icon: '📡' },
  { title: '代理', titleEn: 'Proxy', keys: ['proxy', '代理', 'http proxy'], group: 2, target: 'ms-settings:network-proxy' },
  { title: '拨号', titleEn: 'Dial-up', keys: ['dialup', '拨号', 'pppoe', '宽带连接'], group: 2, target: 'ms-settings:network-dialup' },
  { title: '网络连接', titleEn: 'Network Connections', keys: ['ncpa', '适配器', '网卡', '适配器设置'], group: 2, target: 'ncpa.cpl', icon: '🔌' },

  /* ---------------- 3 个性化 ---------------- */
  { title: '个性化', titleEn: 'Personalization', keys: ['personalization', '个性化', '外观'], group: 3, target: 'ms-settings:personalization' },
  { title: '背景', titleEn: 'Background', keys: ['background', '壁纸', '桌面背景', 'wallpaper'], group: 3, target: 'ms-settings:personalization-background', icon: '🖼️' },
  { title: '颜色', titleEn: 'Colors', keys: ['colors', '主题色', '深色模式', '浅色模式', 'dark mode', 'accent'], group: 3, target: 'ms-settings:personalization-colors', icon: '🌈' },
  { title: '主题', titleEn: 'Themes', keys: ['themes', '主题', '皮肤'], group: 3, target: 'ms-settings:personalization-themes' },
  { title: '锁屏', titleEn: 'Lock Screen', keys: ['lockscreen', '锁屏', '锁屏壁纸', 'lock screen'], group: 3, target: 'ms-settings:lockscreen', icon: '🔏' },
  { title: '任务栏', titleEn: 'Taskbar', keys: ['taskbar', '任务栏', '开始按钮', '托盘', '系统托盘'], group: 3, target: 'ms-settings:taskbar', icon: '📌' },
  { title: '开始菜单', titleEn: 'Start Menu', keys: ['start', '开始菜单', '开始屏幕', 'start menu'], group: 3, target: 'ms-settings:personalization-start' },
  { title: '字体', titleEn: 'Fonts', keys: ['fonts', '字体', '字形', '安装字体'], group: 3, target: 'ms-settings:fonts', icon: '🔤' },

  /* ---------------- 4 应用 ---------------- */
  { title: '应用', titleEn: 'Apps', keys: ['apps', '应用', '程序'], group: 4, target: 'ms-settings:apps' },
  { title: '已安装的应用', titleEn: 'Installed Apps', keys: ['appsfeatures', '已安装', '卸载', '应用列表', 'installed'], group: 4, target: 'ms-settings:appsfeatures', icon: '🗂️' },
  { title: '默认应用', titleEn: 'Default Apps', keys: ['defaultapps', '默认应用', '默认浏览器', '默认程序', '关联'], group: 4, target: 'ms-settings:defaultapps', icon: '⭐' },
  { title: '可选功能', titleEn: 'Optional Features', keys: ['optionalfeatures', '可选功能', 'windows 功能', '添加功能'], group: 4, target: 'ms-settings:optionalfeatures' },
  { title: '启动应用', titleEn: 'Startup Apps', keys: ['startupapps', '开机启动', '自启', '启动项'], group: 4, target: 'ms-settings:startupapps', icon: '🚀' },
  { title: '应用可用性', titleEn: 'Apps for Websites', keys: ['appsforwebsites', '链接打开方式'], group: 4, target: 'ms-settings:appsforwebsites' },
  { title: '离线地图', titleEn: 'Offline Maps', keys: ['maps', '离线地图', '地图下载'], group: 4, target: 'ms-settings:maps', icon: '🗺️' },
  { title: '程序和功能', titleEn: 'Programs and Features', keys: ['appwiz', '卸载程序', '添加删除程序', 'uninstall'], group: 4, target: 'appwiz.cpl', icon: '🗑️' },

  /* ---------------- 5 账户 ---------------- */
  { title: '账户', titleEn: 'Accounts', keys: ['accounts', '账户', '账号'], group: 5, target: 'ms-settings:accounts' },
  { title: '你的信息', titleEn: 'Your Info', keys: ['yourinfo', '个人信息', '头像', '微软账户'], group: 5, target: 'ms-settings:yourinfo', icon: '🪪' },
  { title: '登录选项', titleEn: 'Sign-in Options', keys: ['signinoptions', '登录', '密码', 'PIN', 'Windows Hello', '指纹', '人脸'], group: 5, target: 'ms-settings:signinoptions', icon: '🔑' },
  { title: '工作或学校账户', titleEn: 'Work or School', keys: ['workplace', '工作账户', '公司账户', 'azure ad'], group: 5, target: 'ms-settings:workplace', icon: '🏢' },
  { title: '家庭和其他用户', titleEn: 'Family & Other Users', keys: ['family', '家庭', '其他用户', '添加用户'], group: 5, target: 'ms-settings:family' },
  { title: '同步设置', titleEn: 'Sync Settings', keys: ['sync', '同步', '云同步', '备份设置'], group: 5, target: 'ms-settings:sync', icon: '🔄' },

  /* ---------------- 6 时间与语言 ---------------- */
  { title: '日期和时间', titleEn: 'Date & Time', keys: ['dateandtime', '时间', '日期', '时区', 'time', 'date'], group: 6, target: 'ms-settings:dateandtime', icon: '📅' },
  { title: '语言和区域', titleEn: 'Language & Region', keys: ['regionlanguage', '语言', '区域', '输入法', '中文', '英文', 'language', 'region'], group: 6, target: 'ms-settings:regionlanguage', icon: '🈶' },
  { title: '键盘', titleEn: 'Keyboard', keys: ['keyboard', '键盘', '按键', '输入法快捷键'], group: 6, target: 'ms-settings:keyboard', icon: '⌨️' },
  { title: '鼠标', titleEn: 'Mouse', keys: ['mouse', '鼠标', '指针', '滚轮', '双击速度'], group: 6, target: 'ms-settings:mouse', icon: '🖱️' },
  { title: '触摸板', titleEn: 'Touchpad', keys: ['touchpad', '触摸板', '触控板', '手势'], group: 6, target: 'ms-settings:touchpad' },
  { title: '鼠标和触摸板', titleEn: 'Mouse & Touchpad', keys: ['mousetouchpad', '指针设备'], group: 6, target: 'ms-settings:mousetouchpad', icon: '🖱️' },
  { title: '语音', titleEn: 'Speech', keys: ['speech', '语音', '语音识别', '朗读', 'tts'], group: 6, target: 'ms-settings:speech', icon: '🗣️' },
  { title: '区域（控制面板）', titleEn: 'Region', keys: ['intl', '区域', '格式', '货币格式', '系统区域设置'], group: 6, target: 'intl.cpl' },
  { title: '日期和时间（控制面板）', titleEn: 'Date and Time (Control Panel)', keys: ['timedate', 'internet 时间', '时间同步'], group: 6, target: 'timedate.cpl', icon: '📅' },
  { title: '鼠标属性', titleEn: 'Mouse Properties', keys: ['main.cpl', '指针方案', '鼠标键'], group: 6, target: 'main.cpl', icon: '🖱️' },

  /* ---------------- 7 辅助功能 ---------------- */
  { title: '辅助功能', titleEn: 'Accessibility', keys: ['easeofaccess', '辅助', '无障碍', 'accessibility'], group: 7, target: 'ms-settings:easeofaccess' },
  { title: '显示（辅助功能）', titleEn: 'Display (Accessibility)', keys: ['文字大小', '视觉效果', '对比', '放大'], group: 7, target: 'ms-settings:easeofaccess-display' },
  { title: '讲述人', titleEn: 'Narrator', keys: ['narrator', '讲述人', '屏幕阅读', '朗读屏幕'], group: 7, target: 'ms-settings:easeofaccess-narrator', icon: '🔊' },
  { title: '放大镜', titleEn: 'Magnifier', keys: ['magnifier', '放大镜', '缩放屏幕', 'zoom'], group: 7, target: 'ms-settings:easeofaccess-magnifier', icon: '🔍' },
  { title: '高对比度', titleEn: 'High Contrast', keys: ['highcontrast', '高对比度', '对比度主题'], group: 7, target: 'ms-settings:easeofaccess-highcontrast', icon: '◐' },
  { title: '键盘（辅助功能）', titleEn: 'Keyboard (Accessibility)', keys: ['粘滞键', '筛选键', '切换键', 'sticky keys'], group: 7, target: 'ms-settings:easeofaccess-keyboard', icon: '⌨️' },
  { title: '鼠标（辅助功能）', titleEn: 'Mouse (Accessibility)', keys: ['鼠标键', '指针大小'], group: 7, target: 'ms-settings:easeofaccess-mouse', icon: '🖱️' },

  /* ---------------- 8 隐私与安全 ---------------- */
  { title: '隐私和安全性', titleEn: 'Privacy & Security', keys: ['privacy', '隐私', '安全', '权限'], group: 8, target: 'ms-settings:privacy' },
  { title: '位置', titleEn: 'Location', keys: ['privacy-location', '定位', 'gps', 'location'], group: 8, target: 'ms-settings:privacy-location', icon: '📍' },
  { title: '摄像头', titleEn: 'Camera', keys: ['privacy-webcam', '相机权限', '摄像头权限', 'camera'], group: 8, target: 'ms-settings:privacy-webcam', icon: '📷' },
  { title: '麦克风', titleEn: 'Microphone', keys: ['privacy-microphone', '麦克风权限', '录音', 'microphone'], group: 8, target: 'ms-settings:privacy-microphone', icon: '🎤' },
  { title: '常规隐私', titleEn: 'General Privacy', keys: ['privacy-general', '广告 ID', '隐私常规'], group: 8, target: 'ms-settings:privacy-general' },
  { title: '文件系统访问', titleEn: 'File System Access', keys: ['broadfilesystemaccess', '文件权限', '文件夹访问'], group: 8, target: 'ms-settings:privacy-broadfilesystemaccess', icon: '📁' },
  { title: 'Windows 安全中心', titleEn: 'Windows Security', keys: ['windowsdefender', '安全中心', '杀毒', '病毒', '防火墙', 'defender', 'antivirus'], group: 8, target: 'ms-settings:windowsdefender', icon: '🛡️' },
  { title: '查找我的设备', titleEn: 'Find My Device', keys: ['findmydevice', '定位设备', '查找设备'], group: 8, target: 'ms-settings:findmydevice', icon: '🧭' },
  { title: 'Windows 防火墙', titleEn: 'Windows Firewall', keys: ['firewall', '防火墙', '入站规则', '出站规则'], group: 8, target: 'firewall.cpl', icon: '🔥' },

  /* ---------------- 9 游戏 ---------------- */
  { title: '游戏', titleEn: 'Gaming', keys: ['gaming', '游戏设置'], group: 9, target: 'ms-settings:gaming' },
  { title: '游戏栏', titleEn: 'Game Bar', keys: ['gamebar', 'xbox game bar', '游戏栏', '截图录制'], group: 9, target: 'ms-settings:gaming-gamebar', icon: '🕹️' },
  { title: '游戏模式', titleEn: 'Game Mode', keys: ['gamemode', '游戏模式', '性能优化'], group: 9, target: 'ms-settings:gaming-gamemode' },
  { title: '游戏录制', titleEn: 'Captures', keys: ['captures', '录制', '回放', '截图'], group: 9, target: 'ms-settings:gaming-captures', icon: '🎥' },

  /* ---------------- 10 更新与安全 ---------------- */
  { title: 'Windows 更新', titleEn: 'Windows Update', keys: ['windowsupdate', '更新', '补丁', '升级', 'update'], group: 10, target: 'ms-settings:windowsupdate', icon: '🔄' },
  { title: '更新历史记录', titleEn: 'Update History', keys: ['windowsupdate-history', '更新记录', '补丁记录'], group: 10, target: 'ms-settings:windowsupdate-history', icon: '📜' },
  { title: '更新高级选项', titleEn: 'Advanced Update Options', keys: ['windowsupdate-options', '暂停更新', '传递优化'], group: 10, target: 'ms-settings:windowsupdate-options' },
  { title: '恢复', titleEn: 'Recovery', keys: ['recovery', '恢复', '重置此电脑', '高级启动', '重置', 'reset'], group: 10, target: 'ms-settings:recovery', icon: '🩹' },
  { title: '备份', titleEn: 'Backup', keys: ['backup', '备份', '文件历史记录', '同步'], group: 10, target: 'ms-settings:backup', icon: '💽' },
  { title: '激活', titleEn: 'Activation', keys: ['activation', '激活', '正版', '序列号', '密钥', 'license'], group: 10, target: 'ms-settings:activation', icon: '✅' },
  { title: '疑难解答', titleEn: 'Troubleshoot', keys: ['troubleshoot', '疑难解答', '修复', '排错', '诊断'], group: 10, target: 'ms-settings:troubleshoot', icon: '🩺' },
  { title: 'Windows 预览体验计划', titleEn: 'Windows Insider Program', keys: ['windowsinsider', '预览版', 'insider', 'beta 通道'], group: 10, target: 'ms-settings:windowsinsider', icon: '🧪' },

  /* ---------------- 11 管理工具 ---------------- */
  { title: '控制面板', titleEn: 'Control Panel', keys: ['control', '控制面板', '经典控制面板'], group: 11, target: 'control', icon: '🎛️' },
  { title: '设备管理器', titleEn: 'Device Manager', keys: ['devmgmt', '设备管理器', '驱动', '硬件', 'device manager', 'driver'], group: 11, target: 'devmgmt.msc', icon: '🔧' },
  { title: '磁盘管理', titleEn: 'Disk Management', keys: ['diskmgmt', '磁盘管理', '分区', '盘符', '格式化', 'partition'], group: 11, target: 'diskmgmt.msc', icon: '💽' },
  { title: '服务', titleEn: 'Services', keys: ['services', '服务', '后台服务', '启动类型'], group: 11, target: 'services.msc', icon: '⚙️' },
  { title: '任务计划程序', titleEn: 'Task Scheduler', keys: ['taskschd', '计划任务', '定时任务', 'scheduler'], group: 11, target: 'taskschd.msc', icon: '⏰' },
  { title: '事件查看器', titleEn: 'Event Viewer', keys: ['eventvwr', '事件查看器', '日志', '系统日志', 'event log'], group: 11, target: 'eventvwr.msc', icon: '📜' },
  { title: '计算机管理', titleEn: 'Computer Management', keys: ['compmgmt', '计算机管理', '本地用户和组'], group: 11, target: 'compmgmt.msc', icon: '🖥️' },
  { title: '注册表编辑器', titleEn: 'Registry Editor', keys: ['regedit', '注册表', 'registry'], group: 11, target: 'regedit', icon: '🗝️' },
  { title: '本地组策略编辑器', titleEn: 'Group Policy Editor', keys: ['gpedit', '组策略', '策略', 'policy'], group: 11, target: 'gpedit.msc', icon: '📋' },
  { title: '系统信息', titleEn: 'System Information', keys: ['msinfo32', '系统信息', '硬件摘要', 'system info'], group: 11, target: 'msinfo32', icon: '📊' },
  { title: '资源监视器', titleEn: 'Resource Monitor', keys: ['resmon', '资源监视器', '占用', '性能'], group: 11, target: 'resmon', icon: '📈' },
  { title: '性能监视器', titleEn: 'Performance Monitor', keys: ['perfmon', '性能监视器', '计数器'], group: 11, target: 'perfmon', icon: '📉' },
  { title: '系统配置', titleEn: 'System Configuration', keys: ['msconfig', '系统配置', '启动项', '引导', 'boot'], group: 11, target: 'msconfig', icon: '🛠️' },
  { title: 'DirectX 诊断工具', titleEn: 'DirectX Diagnostic Tool', keys: ['dxdiag', 'directx', '显卡诊断', '显示诊断'], group: 11, target: 'dxdiag', icon: '🎮' },
  { title: '磁盘清理', titleEn: 'Disk Cleanup', keys: ['cleanmgr', '磁盘清理', '清理垃圾', '释放空间'], group: 11, target: 'cleanmgr', icon: '🧹' },
  { title: '远程桌面连接', titleEn: 'Remote Desktop Connection', keys: ['mstsc', '远程桌面', 'rdp 客户端'], group: 11, target: 'mstsc', icon: '🖥️' },
  { title: '任务管理器', titleEn: 'Task Manager', keys: ['taskmgr', '任务管理器', '进程', '性能', '结束任务'], group: 11, target: 'taskmgr', icon: '📊' },
  { title: 'Windows 终端', titleEn: 'Windows Terminal', keys: ['wt', '终端', 'terminal', 'powershell', '命令行'], group: 11, target: 'wt', icon: '💻' },
  { title: '命令提示符', titleEn: 'Command Prompt', keys: ['cmd', '命令提示符', '命令行', 'dos'], group: 11, target: 'cmd', icon: '⌨️' },
  { title: '系统属性', titleEn: 'System Properties', keys: ['sysdm', '系统属性', '计算机名', '高级系统设置', '性能选项'], group: 11, target: 'sysdm.cpl', icon: '🖥️' },
  { title: '环境变量', titleEn: 'Environment Variables', keys: ['环境变量', 'PATH', 'environment variables'], group: 11, target: 'rundll32.exe sysdm.cpl,EditEnvironmentVariables', icon: '🌱' },
  { title: '电源选项', titleEn: 'Power Options', keys: ['powercfg', '电源计划', '休眠设置', '电源管理'], group: 11, target: 'powercfg.cpl', icon: '🔌' },
  { title: '声音（控制面板）', titleEn: 'Sound (Control Panel)', keys: ['mmsys', '播放设备', '录制设备', '音频设备'], group: 11, target: 'mmsys.cpl', icon: '🔊' },
  { title: 'Internet 属性', titleEn: 'Internet Properties', keys: ['inetcpl', 'internet 选项', '浏览器设置', '安全级别'], group: 11, target: 'inetcpl.cpl', icon: '🌐' },
  { title: '屏幕分辨率', titleEn: 'Screen Resolution', keys: ['desk.cpl', '分辨率', '屏幕设置', '多显示器'], group: 11, target: 'desk.cpl', icon: '🖼️' }
]

/** 分组下标 → 分组定义 */
export function winSettingGroup(index: number): WinSettingGroup {
  return WIN_SETTING_GROUPS[index] ?? WIN_SETTING_GROUPS[0]
}
