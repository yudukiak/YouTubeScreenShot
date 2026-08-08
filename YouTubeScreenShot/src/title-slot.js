/**
 * 差し込み先を1件だけ返す。見つからなければ null。
 * 他拡張へコピペするときは #ydk-title-slot 用 CSS も別途用意する。
 */
const findTitleSlotAnchor = () => {
  // 先頭ヒット1件だけ使う
  const selectors = [
    '#primary-inner > #player',
    '.player-size.player-placeholder',
  ]
  for (const selector of selectors) {
    const elm = document.querySelector(selector)
    if (elm) return elm
  }
  return null
}

/**
 * /watch・/live で #ydk-title-slot を確保する。
 * 既にあれば再利用し、無ければタイトル上部アンカーの直前に生成する。
 * 対象外ページ・アンカー未取得の場合は null。
 */
const ensureTitleSlot = () => {
  if (!/^\/(live|watch)/.test(location.pathname)) return null

  // 他拡張と共有するラッパー。既にあれば生成しない
  let slotElm = document.getElementById('ydk-title-slot')
  if (slotElm) return slotElm

  const anchorElm = findTitleSlotAnchor()
  if (!anchorElm) return null

  slotElm = document.createElement('div')
  slotElm.id = 'ydk-title-slot'
  anchorElm.after(slotElm)
  return slotElm
}

// YouTube は SPA のため、タイトル周辺 / slot の追加を監視する
let titleSlotUpdateScheduled = false

const titleSlotObserver = new MutationObserver(() => {
  if (titleSlotUpdateScheduled) return

  titleSlotUpdateScheduled = true

  requestAnimationFrame(() => {
    titleSlotUpdateScheduled = false
    ensureTitleSlot()
  })
})

ensureTitleSlot()

titleSlotObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
})
