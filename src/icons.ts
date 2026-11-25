const files = import.meta.glob<string>(
  '../node_modules/lucide-static/icons/{anchor,arrow-right,arrow-up-right,book-open,calendar-days,check,chevron-right,coins,compass,expand,flag,hammer,landmark,map,map-pin,package,scroll-text,scan-eye,settings-2,message-circle,sailboat,shield,ship-wheel,shopping-basket,shrink,sun,sunset,users,volume-2,volume-x,wind,x}.svg',
  { eager: true, import: 'default', query: '?raw' },
)

export function icon(name: string): string {
  const svg = files['../node_modules/lucide-static/icons/' + name + '.svg']
  return svg?.replace('<svg', '<svg aria-hidden="true" focusable="false" class="ui-icon"') ?? ''
}
