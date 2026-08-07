const SCREENSHOT_BAR_ID = 'ydk-screenshot-bar'
const SCREENSHOT_CAPTURE_ID = 'ydk-screenshot-capture'
const BELOW_SLOT_ID = 'ydk-below-slot'
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
 * /watch・/live で #ydk-below-slot 内にスクショバーを追加する。
 * slot が無ければ #below の直前に生成し、あれば再利用して append する。
 * 追加済み・対象外ページ・#below 未取得の場合は何もしない。
 */
const setupScreenshotUi = () => {
  if (!/^\/(live|watch)/.test(location.pathname)) return

  const belowElm = document.getElementById('below')
  if (!belowElm) return

  // 追加済みなら何もしない
  if (document.getElementById(SCREENSHOT_BAR_ID)) return

  // 他拡張と共有するラッパー。既にあれば生成しない
  let slotElm = document.getElementById(BELOW_SLOT_ID)
  if (!slotElm) {
    slotElm = document.createElement('div')
    slotElm.id = BELOW_SLOT_ID
    belowElm.before(slotElm)
  }

  // スクショ・シーク用ボタン
  let html = `<button id="${SCREENSHOT_CAPTURE_ID}">📷</button>`
  html += '<button title="1秒戻る" data-current="-1000">&lt;&lt;</button>'
  html += '<button title="0.1秒戻る" data-current="-100">&lt;</button>'
  html += '<button title="1フレーム戻る" data-current-frame="-1">-f</button>'
  html += '<button title="1フレーム進む" data-current-frame="1">+f</button>'
  html += '<button title="0.1秒進む" data-current="100">&gt;</button>'
  html += '<button title="1秒進む" data-current="1000">&gt;&gt;</button>'

  const uiElm = document.createElement('div')
  uiElm.id = SCREENSHOT_BAR_ID
  uiElm.innerHTML = html

  setFrameRate()
  slotElm.append(uiElm)
  uiElm.onselectstart = () => false

  // UI 内のボタンだけにイベントを紐付ける
  uiElm.querySelectorAll('[data-current]').forEach(elm => {
    elm.onclick = e => setCurrentTime(e)
  })
  uiElm.querySelectorAll('[data-current-frame]').forEach(elm => {
    elm.onclick = e => setCurrentFrame(e)
  })
  uiElm.querySelector(`#${SCREENSHOT_CAPTURE_ID}`).onclick = () => getScreenshot()
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
 * data-current（ミリ秒）分だけ再生位置をずらす。
 */
const setCurrentTime = e => {
  const time = Number(e.target.dataset.current) / 1000
  const video = getVideoElement()
  if (!video) return // 取得できないときは何もしない

  video.currentTime = video.currentTime + time
}

/**
 * data-current-frame 分だけ再生位置をずらす。
 * FPS 未計測時は FALLBACK_FPS を使う。
 */
const setCurrentFrame = e => {
  const frame = Number(e.target.dataset.currentFrame)
  const currentFps = fps > 0 ? fps : FALLBACK_FPS
  const time = (1 / currentFps) * frame
  const video = getVideoElement()
  if (!video) return // 取得できないときは何もしない

  video.currentTime = video.currentTime + time
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
  const titleElm = document.querySelector('#container > h1')
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
  const num = amount.replace(/f/, '')
  const current = direction === 'backward' ? num * -1 : num
  const e = {
    target: {
      dataset: {
        current: current,
        currentFrame: current,
      }
    }
  }

  if (isFrame) {
    setCurrentFrame(e)
  } else {
    setCurrentTime(e)
  }
})

// YouTube は SPA のため、#below / slot の追加を監視する
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
