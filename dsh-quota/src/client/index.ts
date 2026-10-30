/**
 * 「公司额度」插件浏览器半：注册 `company-quota` 词典，并把「公司额度」分区
 * 注册进设置面板（settings.section）。
 *
 * 分区自身向宿主半的 `api/company-quota/overview` 取数，浏览器不做计价，
 * MIDEA_API_KEY 始终留在宿主进程。
 * @module dsh-plugin-company-quota/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// 仅类型：拉取 locale 插件的 Context 合并（ctx.locale）。
import type {} from '@deepseek-ai/dsh-client-locale/client'
// 仅类型：拉取 renderer 的 Context 合并（ctx.slots）。
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// 仅类型：拉取 ui-settings 的 SlotMap 合并（settings.section 座位）。
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { CompanyQuotaSection } from './CompanyQuotaSection.tsx'
import { NS, en, zh, type CompanyQuotaKey } from './locales.ts'

export type { CompanyQuotaKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** 「公司额度」分区的文案。 */
    'company-quota': CompanyQuotaKey
  }
}

/** 所需服务：插槽注册表与词典注册表。 */
export const inject = ['slots', 'locale']

/** 一级分区位置：紧跟在「使用统计」之后。 */
const SECTION_ORDER = 152

/**
 * 客户端插件主体：注册词典并挂载「公司额度」分区。
 * @param ctx - 客户端根上下文。
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-plugin-company-quota: dictionaries')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'company-quota',
    order: SECTION_ORDER,
    label: () => ctx.locale.bind(NS)('nav'),
    locale: NS,
    inject: () => ({}),
  }, CompanyQuotaSection))
}
