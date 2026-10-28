import { TokenCalendarService } from '../token-calendar/lib/service.js'
import { tokenCalendarTool } from '../token-calendar/lib/tools.js'

const tool = tokenCalendarTool(new TokenCalendarService())
for (const args of [{ action: 'summary' }, { action: 'day', date: '2026-10-27' }, { action: 'sources' }]) {
  const out = await tool.execute(args)
  console.log(`===== ${args.action} =====`)
  console.log(out.text)
}
