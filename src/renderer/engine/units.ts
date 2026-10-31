/**
 * 单位换算引擎。
 * 覆盖长度/质量/时间/温度/面积/体积/速度/数据存储/压力/能量/功率，外加货币。
 *
 * 货币使用内置快照汇率（离线可用），并支持通过设置面板联网刷新。
 */

interface AffineUnit {
  names: string[]
  /** 转换为该类别基准单位 */
  toBase: (value: number) => number
  /** 由基准单位转换回来 */
  fromBase: (value: number) => number
  label: string
  /** 详情面板里是否作为「其他常见单位」展示 */
  common?: boolean
}

interface LinearCategory {
  id: string
  name: string
  units: Array<{ names: string[]; factor: number; label: string; common?: boolean }>
}

type Category = LinearCategory | (Omit<LinearCategory, 'units'> & { affine: true; units: AffineUnit[] })

/* ------------------------------ 单位表 ------------------------------ */

const CATEGORIES: Category[] = [
  {
    id: 'length',
    name: '长度',
    units: [
      { names: ['m', '米', 'meter', 'metre', '公尺'], factor: 1, label: 'm', common: true },
      { names: ['km', '千米', '公里'], factor: 1000, label: 'km', common: true },
      { names: ['dm', '分米'], factor: 0.1, label: 'dm' },
      { names: ['cm', '厘米'], factor: 0.01, label: 'cm', common: true },
      { names: ['mm', '毫米'], factor: 0.001, label: 'mm' },
      { names: ['um', '微米'], factor: 1e-6, label: 'μm' },
      { names: ['nm', '纳米'], factor: 1e-9, label: 'nm' },
      { names: ['mi', 'mile', '英里'], factor: 1609.344, label: 'mi' },
      { names: ['yd', 'yard', '码'], factor: 0.9144, label: 'yd' },
      { names: ['ft', 'feet', 'foot', '英尺'], factor: 0.3048, label: 'ft', common: true },
      { names: ['in', 'inch', '英寸'], factor: 0.0254, label: 'in', common: true },
      { names: ['nmi', '海里'], factor: 1852, label: '海里' },
      { names: ['ly', '光年'], factor: 9.4607304725808e15, label: '光年' },
      { names: ['尺'], factor: 1 / 3, label: '市尺' },
      { names: ['寸'], factor: 1 / 30, label: '市寸' }
    ]
  },
  {
    id: 'mass',
    name: '质量',
    units: [
      { names: ['kg', '千克', '公斤'], factor: 1, label: 'kg', common: true },
      { names: ['g', '克'], factor: 0.001, label: 'g', common: true },
      { names: ['mg', '毫克'], factor: 1e-6, label: 'mg' },
      { names: ['t', '吨'], factor: 1000, label: 't', common: true },
      { names: ['lb', 'lbs', 'pound', '磅'], factor: 0.45359237, label: 'lb', common: true },
      { names: ['oz', 'ounce', '盎司'], factor: 0.028349523125, label: 'oz' },
      { names: ['斤', 'jin'], factor: 0.5, label: '斤', common: true },
      { names: ['两'], factor: 0.05, label: '两' },
      { names: ['担'], factor: 50, label: '担' }
    ]
  },
  {
    id: 'time',
    name: '时间',
    units: [
      { names: ['s', 'sec', 'second', '秒'], factor: 1, label: '秒', common: true },
      { names: ['ms', '毫秒'], factor: 0.001, label: 'ms' },
      { names: ['us', '微秒'], factor: 1e-6, label: 'μs' },
      { names: ['min', 'minute', '分钟', '分'], factor: 60, label: '分钟', common: true },
      { names: ['h', 'hr', 'hour', '小时', '时'], factor: 3600, label: '小时', common: true },
      { names: ['d', 'day', '天', '日'], factor: 86400, label: '天', common: true },
      { names: ['w', 'week', '周', '星期'], factor: 604800, label: '周' },
      { names: ['month', '月'], factor: 2592000, label: '月' },
      { names: ['y', 'yr', 'year', '年'], factor: 31536000, label: '年' }
    ]
  },
  {
    id: 'temperature',
    name: '温度',
    affine: true,
    units: [
      { names: ['c', '°c', '摄氏度', '度'], label: '°C', toBase: (v) => v, fromBase: (v) => v, common: true },
      {
        names: ['f', '°f', '华氏度'],
        label: '°F',
        toBase: (v) => ((v - 32) * 5) / 9,
        fromBase: (v) => (v * 9) / 5 + 32,
        common: true
      },
      { names: ['k', '开尔文', '开'], label: 'K', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 }
    ]
  },
  {
    id: 'area',
    name: '面积',
    units: [
      { names: ['m2', 'm²', '平方米', '平米'], factor: 1, label: 'm²', common: true },
      { names: ['km2', 'km²', '平方千米'], factor: 1e6, label: 'km²' },
      { names: ['cm2', 'cm²', '平方厘米'], factor: 1e-4, label: 'cm²' },
      { names: ['ha', '公顷', '垧'], factor: 10000, label: '公顷', common: true },
      { names: ['acre', '英亩'], factor: 4046.8564224, label: '英亩' },
      { names: ['ft2', 'ft²', '平方英尺'], factor: 0.09290304, label: 'ft²' },
      { names: ['mi2', 'mi²', '平方英里'], factor: 2589988.11, label: 'mi²' },
      { names: ['亩'], factor: 666.6666667, label: '亩', common: true }
    ]
  },
  {
    id: 'volume',
    name: '体积',
    units: [
      { names: ['l', 'liter', 'litre', '升'], factor: 1, label: 'L', common: true },
      { names: ['ml', '毫升'], factor: 0.001, label: 'mL', common: true },
      { names: ['m3', 'm³', '立方米', '方'], factor: 1000, label: 'm³' },
      { names: ['cm3', 'cm³', '立方厘米'], factor: 0.001, label: 'cm³' },
      { names: ['gal', 'gallon', '加仑'], factor: 3.785411784, label: 'gal' },
      { names: ['qt', 'quart', '夸脱'], factor: 0.946352946, label: 'qt' },
      { names: ['pt', 'pint', '品脱'], factor: 0.473176473, label: 'pt' },
      { names: ['floz', '液量盎司'], factor: 0.0295735295625, label: 'fl oz' },
      { names: ['cup', '杯'], factor: 0.2365882365, label: '杯' },
      { names: ['tsp', '茶匙'], factor: 0.00492892159375, label: 'tsp' },
      { names: ['tbsp', '汤匙', '大勺'], factor: 0.01478676478125, label: 'tbsp' }
    ]
  },
  {
    id: 'speed',
    name: '速度',
    units: [
      { names: ['m/s', '米每秒'], factor: 1, label: 'm/s' },
      { names: ['km/h', 'kmh', 'kph', '码', '公里每小时'], factor: 1 / 3.6, label: 'km/h', common: true },
      { names: ['mph', '英里每小时'], factor: 0.44704, label: 'mph', common: true },
      { names: ['knot', 'kn', '节'], factor: 0.514444444, label: '节' },
      { names: ['ft/s', 'fps'], factor: 0.3048, label: 'ft/s' },
      { names: ['mach', '马赫'], factor: 340.29, label: '马赫' }
    ]
  },
  {
    id: 'data',
    name: '数据存储',
    units: [
      { names: ['b', 'byte', '字节'], factor: 1, label: 'B' },
      { names: ['kb', '千字节'], factor: 1024, label: 'KB' },
      { names: ['mb', '兆', '兆字节'], factor: 1024 ** 2, label: 'MB', common: true },
      { names: ['gb', 'g', '吉字节'], factor: 1024 ** 3, label: 'GB', common: true },
      { names: ['tb', 't'], factor: 1024 ** 4, label: 'TB', common: true },
      { names: ['pb'], factor: 1024 ** 5, label: 'PB' },
      { names: ['bit', 'b'], factor: 1 / 8, label: 'bit' },
      { names: ['mbps', '兆比特每秒'], factor: 131072, label: 'Mb/s' }
    ]
  },
  {
    id: 'pressure',
    name: '压力',
    units: [
      { names: ['pa', '帕', '帕斯卡'], factor: 1, label: 'Pa' },
      { names: ['kpa', '千帕'], factor: 1000, label: 'kPa', common: true },
      { names: ['mpa', '兆帕'], factor: 1e6, label: 'MPa' },
      { names: ['bar', '巴'], factor: 100000, label: 'bar', common: true },
      { names: ['atm', '标准大气压'], factor: 101325, label: 'atm' },
      { names: ['psi'], factor: 6894.757293168, label: 'psi', common: true },
      { names: ['mmhg', '毫米汞柱'], factor: 133.322387415, label: 'mmHg' }
    ]
  },
  {
    id: 'energy',
    name: '能量',
    units: [
      { names: ['j', '焦', '焦耳'], factor: 1, label: 'J' },
      { names: ['kj', '千焦'], factor: 1000, label: 'kJ', common: true },
      { names: ['cal', '卡', '卡路里'], factor: 4.184, label: 'cal' },
      { names: ['kcal', '大卡', '千卡'], factor: 4184, label: 'kcal', common: true },
      { names: ['kwh', '度', '千瓦时'], factor: 3600000, label: 'kWh', common: true },
      { names: ['wh'], factor: 3600, label: 'Wh' }
    ]
  },
  {
    id: 'power',
    name: '功率',
    units: [
      { names: ['w', '瓦', '瓦特'], factor: 1, label: 'W', common: true },
      { names: ['kw', '千瓦'], factor: 1000, label: 'kW', common: true },
      { names: ['mw', '兆瓦'], factor: 1e6, label: 'MW' },
      { names: ['hp', '马力', '匹'], factor: 745.699872, label: '马力' }
    ]
  }
]

/* ------------------------------ 货币 ------------------------------ */

/** 内置汇率快照：以 USD 为基准。离线可用，可通过设置面板联网刷新 */
export const BUILTIN_FX: { updatedAt: number; base: string; rates: Record<string, number> } = {
  updatedAt: 0,
  base: 'USD',
  rates: {
    CNY: 7.1,
    USD: 1,
    EUR: 0.92,
    JPY: 151,
    GBP: 0.78,
    KRW: 1350,
    HKD: 7.8,
    TWD: 32,
    AUD: 1.53,
    CAD: 1.36,
    SGD: 1.34,
    CHF: 0.88,
    RUB: 92,
    INR: 84,
    THB: 35,
    MYR: 4.45,
    VND: 25400,
    NZD: 1.65,
    AED: 3.67,
    SAR: 3.75,
    TRY: 39
  }
}

const CURRENCY_NAMES: Record<string, string[]> = {
  USD: ['usd', '美元', '美金', '$', '刀'],
  CNY: ['cny', 'rmb', '元', '人民币', '块', '¥', '￥', '软妹币'],
  EUR: ['eur', '欧元', '€'],
  JPY: ['jpy', '日元', '日币'],
  GBP: ['gbp', '英镑', '£'],
  KRW: ['krw', '韩元', '韩币', '₩'],
  HKD: ['hkd', '港币', '港元'],
  TWD: ['twd', '台币', '新台币'],
  AUD: ['aud', '澳元', '澳币'],
  CAD: ['cad', '加元', '加币'],
  SGD: ['sgd', '新元', '新加坡元'],
  CHF: ['chf', '瑞郎', '瑞士法郎'],
  RUB: ['rub', '卢布', '₽'],
  INR: ['inr', '卢比', '印度卢比'],
  THB: ['thb', '泰铢'],
  MYR: ['myr', '林吉特', '马币'],
  VND: ['vnd', '越南盾'],
  NZD: ['nzd', '新西兰元'],
  AED: ['aed', '迪拉姆'],
  SAR: ['sar', '沙特里亚尔'],
  TRY: ['try', '土耳其里拉']
}

let fxRates: { updatedAt: number; base: string; rates: Record<string, number> } = BUILTIN_FX

/** 联网刷新后替换汇率表 */
export function applyFxRates(next: { updatedAt: number; base: string; rates: Record<string, number> }): void {
  if (next?.rates && Object.keys(next.rates).length > 1) fxRates = next
}

export function fxUpdatedAt(): number {
  return fxRates.updatedAt
}

export function fxIsFresh(): boolean {
  return Date.now() - fxRates.updatedAt < 12 * 3600_000
}

/* ------------------------------ 解析 ------------------------------ */

const CONNECTOR_RE = /(到|至|等于|换算成|换算为|换成|换为|换|折合|是多少|等于多少|多少|成|为|→|->|→|\bto\b|\bin\b|\binto\b|\bas\b)/gi

function findCategory(unitName: string, expecting?: Category): { category: Category; unit: AffineUnit | LinearCategory['units'][number] } | null {
  const key = unitName.toLowerCase().replace(/[\s°]/g, '')
  const categories = expecting ? [expecting] : CATEGORIES
  for (const category of categories) {
    if ('affine' in category) {
      for (const unit of category.units as AffineUnit[]) {
        if (unit.names.some((name) => name.replace(/[\s°]/g, '') === key)) return { category, unit }
      }
    } else {
      for (const unit of category.units) {
        if (unit.names.some((name) => name.replace(/[\s°]/g, '') === key)) return { category, unit }
      }
    }
  }
  return null
}

function findCurrency(token: string): string | null {
  const key = token.toLowerCase()
  for (const [code, names] of Object.entries(CURRENCY_NAMES)) {
    if (code.toLowerCase() === key || names.some((name) => name.toLowerCase() === key)) return code
  }
  return null
}

/** 判断一个词是不是已知单位或币种，用于决定「源单位」取自数字前还是数字后 */
function isUnitToken(token: string): boolean {
  return Boolean(findCurrency(token) || findCategory(token))
}

export interface UnitConversion {
  value: number
  fromLabel: string
  toLabel: string
  categoryName: string
  /** 结果文本，例如 10.79 */
  text: string
  /** 副标题，例如 "35.4 ft = 10.79 m" */
  subtitle: string
  extras: Array<[string, string]>
}

function format(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (value !== 0 && (Math.abs(value) >= 1e9 || Math.abs(value) < 1e-6)) return value.toExponential(6)
  const rounded = Number(value.toPrecision(10))
  return String(rounded).replace(/\.?0+$/, (match) => (match.includes('.') ? '' : match))
}

/**
 * 尝试把输入解析为一次单位/货币换算。
 * 支持写法：100km to mi ／ 1GB=?MB ／ 100°F 到 °C ／ $250 换 人民币 ／ 3尺是多少厘米
 */
export function convert(input: string): UnitConversion | null {
  const raw = input.trim()
  if (!raw || !/\d/.test(raw)) return null

  const cleaned = raw
    .replace(/\$\s*/g, ' usd ')
    .replace(/[¥￥]\s*/g, ' cny ')
    .replace(/€\s*/g, ' eur ')
    .replace(/£\s*/g, ' gbp ')
    .replace(/₩\s*/g, ' krw ')
    .replace(/₽\s*/g, ' rub ')
    .replace(/[?=？]/g, ' ')
    .replace(CONNECTOR_RE, ' ')

  const match = cleaned.match(/^([\s\S]*?)(-?\d[\d,]*(?:\.\d+)?)([\s\S]*)$/)
  if (!match) return null

  const value = Number(match[2].replace(/,/g, ''))
  if (!Number.isFinite(value)) return null

  const before = match[1].trim().split(/\s+/).filter(Boolean)
  const after = match[3].trim().split(/\s+/).filter(Boolean)

  /*
   * 单位可能在数字前（"$250 to cny" → usd），也可能在数字后（"100 km to mi" → km）。
   * 先判断数字前的最后一个词是不是合法单位/币种：是就用它（货币符号场景），
   * 否则说明它只是数字本身，退回取数字后的第一个词。
   */
  let source: string | undefined
  if (before.length) {
    const candidate = before[before.length - 1]
    if (isUnitToken(candidate)) source = candidate
  }
  if (!source) source = after.shift()
  const target = after.length ? after[after.length - 1] : null
  if (!source || !target) return null

  return resolveConversion(value, source, target)
}

function resolveConversion(value: number, source: string, target: string): UnitConversion | null {
  /* 货币优先 */
  const fromCurrency = findCurrency(source)
  const toCurrency = findCurrency(target)
  if (fromCurrency && toCurrency) {
    const result = (value / fxRates.rates[fromCurrency]) * fxRates.rates[toCurrency]
    return {
      value: result,
      fromLabel: fromCurrency,
      toLabel: toCurrency,
      categoryName: '货币',
      text: format(Number(result.toFixed(4))),
      subtitle: `${format(value)} ${fromCurrency} = ${format(Number(result.toFixed(4)))} ${toCurrency}`,
      extras: [
        ['汇率', `1 ${fromCurrency} = ${(fxRates.rates[toCurrency] / fxRates.rates[fromCurrency]).toFixed(6)} ${toCurrency}`],
        ['汇率日期', fxRates.updatedAt ? new Date(fxRates.updatedAt).toLocaleString('zh-CN') : '内置快照'],
        ['提示', '可在「设置 → 货币汇率」里联网刷新']
      ]
    }
  }

  const from = findCategory(source)
  if (!from) return null
  const to = findCategory(target, from.category)
  if (!to || to.category !== from.category) return null

  return fromCategory(value, from.category, from.unit, to.unit)
}

function fromCategory(
  value: number,
  category: Category,
  fromUnit: AffineUnit | LinearCategory['units'][number],
  toUnit: AffineUnit | LinearCategory['units'][number]
): UnitConversion | null {
  const categoryName = (category as LinearCategory).name
  let result: number

  if ('affine' in category) {
    const base = (fromUnit as AffineUnit).toBase(value)
    result = (toUnit as AffineUnit).fromBase(base)
  } else {
    const fromFactor = (fromUnit as LinearCategory['units'][number]).factor
    const toFactor = (toUnit as LinearCategory['units'][number]).factor
    result = (value * fromFactor) / toFactor
  }

  const extras: Array<[string, string]> = []
  const units = 'affine' in category ? (category.units as AffineUnit[]) : (category.units as LinearCategory['units'][number][])
  const base = 'affine' in category ? (fromUnit as AffineUnit).toBase(value) : value * (fromUnit as LinearCategory['units'][number]).factor

  for (const unit of units) {
    if (unit === toUnit || unit === fromUnit) continue
    if (!unit.common) continue
    const converted = 'affine' in category ? (unit as AffineUnit).fromBase(base) : base / (unit as LinearCategory['units'][number]).factor
    extras.push([unit.label, format(Number(converted.toPrecision(8)))])
  }

  return {
    value: result,
    fromLabel: ('label' in fromUnit ? fromUnit.label : ''),
    toLabel: ('label' in toUnit ? toUnit.label : ''),
    categoryName,
    text: format(Number(result.toPrecision(10))),
    subtitle: `${format(value)} ${('label' in fromUnit ? fromUnit.label : '')} = ${format(
      Number(result.toPrecision(10))
    )} ${('label' in toUnit ? toUnit.label : '')}`,
    extras: extras.slice(0, 5)
  }
}

/** 供 UI 展示的单位类别清单（帮助文案里用） */
export const UNIT_CATEGORY_NAMES = CATEGORIES.map((category) => (category as LinearCategory).name).join('、')
