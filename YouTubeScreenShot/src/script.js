const extensionApi = globalThis.browser ?? globalThis.chrome

const FALLBACK_FPS = 30

// フレームレートを計測
// https://g6g6g6g6g6.tumblr.com/post/62808017343/
let fps = 0
let isFrameRateStarted = false

/**
 * 再生 FPS を継続計測する。多重起動しない。
 */
const setFrameRate = () => {
  if (isFrameRateStarted) return
  isFrameRateStarted = true

  let startTime
  let endTime
  let duration
  let count = 0
  const sampleCount = 30

  const counter = () => {
    count++
    if (count === 1) startTime = Date.now()
    if (count === sampleCount) {
      endTime = Date.now()
      duration = endTime - startTime
      fps = count / duration * 1000
      count = 0
    }
    requestAnimationFrame(counter)
  }
  requestAnimationFrame(counter)
}

/**
 * /watch・/live で既存の #ydk-title-slot 内にスクショバーを追加する。
 * slot 未作成・追加済み・対象外ページの場合は何もしない。
 */
const setupScreenshotUi = () => {
  if (!/^\/(live|watch)/.test(location.pathname)) return

  // 追加済みなら何もしない（多重追加防止）
  if (document.getElementById('ydk-screenshot-bar')) return

  // title-slot.js が用意する共有ラッパー。無ければ待つ
  const slotElm = document.getElementById('ydk-title-slot')
  if (!slotElm) return

  const uiElm = document.createElement('div')
  uiElm.id = 'ydk-screenshot-bar'

  // スクショ・シーク用ボタン
  const captureBtn = document.createElement('button')
  captureBtn.id = 'ydk-screenshot-capture'
  captureBtn.title = extensionApi.i18n.getMessage('screenshot')
  captureBtn.textContent = '📷'

  const seekButtons = [
    { titleKey: 'seekBack1s', currentMs: '-1000', label: '<<' },
    { titleKey: 'seekBack01s', currentMs: '-100', label: '<' },
    { titleKey: 'seekBack1f', frame: '-1', label: '-f' },
    { titleKey: 'seekForward1f', frame: '1', label: '+f' },
    { titleKey: 'seekForward01s', currentMs: '100', label: '>' },
    { titleKey: 'seekForward1s', currentMs: '1000', label: '>>' },
  ]

  const buttonElms = seekButtons.map(({ titleKey, currentMs, frame, label }) => {
    const buttonElm = document.createElement('button')
    buttonElm.title = extensionApi.i18n.getMessage(titleKey)
    buttonElm.textContent = label
    if (currentMs != null) buttonElm.dataset.current = currentMs
    if (frame != null) buttonElm.dataset.currentFrame = frame
    return buttonElm
  })

  uiElm.append(captureBtn, ...buttonElms)

  setFrameRate()
  slotElm.append(uiElm)
  uiElm.onselectstart = () => false

  // UI 内のボタンだけにイベントを紐付ける
  uiElm.querySelectorAll('[data-current]').forEach(elm => {
    elm.onclick = () => seekBySeconds(Number(elm.dataset.current) / 1000)
  })
  uiElm.querySelectorAll('[data-current-frame]').forEach(elm => {
    elm.onclick = () => seekByFrames(Number(elm.dataset.currentFrame))
  })
  captureBtn.onclick = () => getScreenshot()
}

/**
 * 再生中の video 要素を返す。見つからなければ null。
 */
const getVideoElement = () => {
  // 全てのビデオから、サイズがある要素のみ返す
  const videos = document.querySelectorAll('.video-stream')
  const video = Array.from(videos).find(elm => elm.videoWidth > 0)
  return video ?? null
}

/**
 * 指定秒数だけ再生位置をずらす。
 */
const seekBySeconds = seconds => {
  const video = getVideoElement()
  if (!video) return // 取得できないときは何もしない

  video.currentTime = video.currentTime + seconds
}

/**
 * 指定フレーム数だけ再生位置をずらす。
 * FPS 未計測時は FALLBACK_FPS を使う。
 */
const seekByFrames = frameCount => {
  const currentFps = fps > 0 ? fps : FALLBACK_FPS
  const seconds = (1 / currentFps) * frameCount
  seekBySeconds(seconds)
}

/**
 * 現在フレームを PNG としてダウンロードする。
 */
const getScreenshot = () => {
  const zeroPadding = value => value < 10 ? `0${value}` : String(value)
  const videoElm = getVideoElement()
  if (!videoElm) return // 取得できないときは何もしない

  const linkElm = document.createElement('a')
  const canvasElm = document.createElement('canvas')
  // デスクトップ / モバイルのタイトルを1件だけ取得
  const titleElm = document.querySelector('ytd-watch-metadata #title h1, ytm-slim-video-information-renderer h2, #container > h1')
  const titleText = titleElm == null ? '' : titleElm.innerText
  const currentTime = videoElm.currentTime
  const secondParts = (currentTime % 60).toFixed(2).split('.')
  const ms = zeroPadding(Number(secondParts[1]))
  const s = zeroPadding(Number(secondParts[0]))
  const m = zeroPadding(Math.floor((currentTime / 60) % 60))
  const h = zeroPadding(Math.floor(currentTime / 3600))

  linkElm.download = `${titleText} ${h}-${m}-${s}.${ms}.png`
  canvasElm.width = videoElm.videoWidth
  canvasElm.height = videoElm.videoHeight
  canvasElm.getContext('2d').drawImage(videoElm, 0, 0)
  canvasElm.toBlob(blob => {
    linkElm.href = URL.createObjectURL(blob)
    linkElm.click()
  }, 'image/png')
}

// ショートカットコマンドを受け取り、スクショ / シークを実行する
extensionApi.runtime.onMessage.addListener(message => {
  if (message === 'screenshot') {
    getScreenshot()
    return
  }

  // 形式: direction-amount（例: backward-1000, forward-1f）
  const parts = String(message).split('-')
  const direction = parts[0]
  const amount = parts[1]
  if (!amount || (direction !== 'backward' && direction !== 'forward')) return

  const isFrame = /f/.test(amount)
  const num = Number(amount.replace(/f/, ''))
  const signedValue = direction === 'backward' ? num * -1 : num

  if (isFrame) {
    seekByFrames(signedValue)
  } else {
    // amount はミリ秒
    seekBySeconds(signedValue / 1000)
  }
})

// YouTube は SPA のため、slot 出現後にバーを付け直す
let updateScheduled = false

const observer = new MutationObserver(() => {
  if (updateScheduled) return

  updateScheduled = true

  requestAnimationFrame(() => {
    updateScheduled = false
    setupScreenshotUi()
  })
})

setupScreenshotUi()

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
})
