// フレームレートを計測
// https://g6g6g6g6g6.tumblr.com/post/62808017343/
let fps = 0
const setFrameRate = _ => {
  const requestAnimationFrame =  window.webkitRequestAnimationFrame
  let st, et, d, count = 0, max = 30
  const counter = _ => {
    count++
    if (count === 1) st = new Date().getTime()
    if (count === max) {
      et = new Date().getTime()
      d = et - st
      fps = count / d * 1000
      count = 0
    }
    requestAnimationFrame(counter)
  }
  requestAnimationFrame(counter)
}

// 読み込みが完了してないときがあるので…
let timer = setInterval(_ => {
  const path = location.pathname
  const trg = document.getElementById('player')
  const ui = document.getElementById('screenshot-ui')
  if (!/^\/(live|watch)/.test(path)) return
  if (trg != null && ui == null) clearInterval(timer), setCurrentTimeHtml()
}, 1000)

const setCurrentTimeHtml = _ => {
  let html = '<button id="screenshot">📷</button>'
  html += '<button title="1秒戻る" data-current="-1000">&lt;&lt;</button>'
  html += '<button title="0.1秒戻る" data-current="-100">&lt;</button>'
  html += '<button title="1フレーム戻る" data-current-frame="-1">-f</button>'
  html += '<button title="1フレーム進む" data-current-frame="1">+f</button>'
  html += '<button title="0.1秒進む" data-current="100">&gt;</button>'
  html += '<button title="1秒進む" data-current="1000">&gt;&gt;</button>'
  const innerElement = document.createElement('div')
  innerElement.id = 'screenshot-ui'
  innerElement.innerHTML = html
  const targetElement = document.getElementById('below')
  if (targetElement == null) {
    setTimeout(_ => setCurrentTimeHtml(), 1000) // 取得できない時はやり直す
  } else {
    setEvent(targetElement, innerElement)
  }
}

const setEvent = (targetElement, innerElement) => {
  setFrameRate()
  targetElement.before(innerElement)
  document.getElementById('screenshot-ui').onselectstart = _ => false
  document.querySelectorAll('[data-current]').forEach(elm => elm.onclick = e => setCurrentTime(e))
  document.querySelectorAll('[data-current-frame]').forEach(elm => elm.onclick = e => setCurrentFrame(e))
  document.getElementById('screenshot').onclick = _ => getScreenshot()
}

const getVideoElement = _ => {
  const videos = document.querySelectorAll('.video-stream') // 全てのビデオを取得
  const video = Array.from(videos).filter(e => e.videoWidth > 0)[0] // サイズがある要素のみ返す
  if (video.length || video == null) setTimeout(_ => getVideoElement(), 100) // 取得できない時はやり直す
  return video
}

const setCurrentTime = e => {
  const time = Number(e.target.dataset.current) / 1000
  const video = getVideoElement()
  const nowTime = video.currentTime
  video.currentTime = nowTime + time
}

const setCurrentFrame = e => {
  const frame = Number(e.target.dataset.currentFrame)
  const time = 1000 / fps / 1000 * frame
  const video = getVideoElement()
  const nowTime = video.currentTime
  video.currentTime = nowTime + time
}

const getScreenshot = _ => {
  const zeroPadding = value => value < 10 ? String(`0${value}`) : String(value)
  const a = document.createElement('a')
  const c = document.createElement('canvas')
  const v = getVideoElement()
  const e = document.querySelector('#container > h1')
  const t = (e == null) ? '' : e.innerText
  const sa = ((v.currentTime % 60) % 60).toFixed(2).split('.')
  const ms = zeroPadding(Number(sa[1]))
  const s = zeroPadding(Number(sa[0]))
  const m = zeroPadding(Math.floor((v.currentTime / 60) % 60))
  const h = zeroPadding(Math.floor(v.currentTime / 3600))
  a.download = `${t} ${h}-${m}-${s}.${ms}.png`
  c.width = v.videoWidth
  c.height = v.videoHeight
  c.getContext('2d').drawImage(v, 0, 0)
  c.toBlob(b => {
    a.href = URL.createObjectURL(b)
    a.click()
  }, 'image/png')
}