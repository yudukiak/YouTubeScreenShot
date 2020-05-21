window.onload = () => {
  // 読み込みが完了してないときがあるので…
  let timer = setInterval(() => {
    const path = location.pathname
    const trg = document.getElementById('player-theater-container')
    const ui = document.getElementById('screenshot-ui')
    if (path === '/watch' && trg != null && ui == null) clearInterval(timer), setCurrentTimeHtml()
  }, 1000)
}

const setCurrentTimeHtml = () => {
  const nextButton1000 = document.createElement('button')
  nextButton1000.id = 'currentTimeNext1000'
  nextButton1000.textContent = '>>'
  nextButton1000.title = '1秒進む'
  nextButton1000.dataset.current = '1000'
  const nextButton100 = document.createElement('button')
  nextButton100.id = 'currentTimeNext100'
  nextButton100.textContent = '>'
  nextButton100.title = '0.1秒進む'
  nextButton100.dataset.current = '100'
  const prevButton100 = document.createElement('button')
  prevButton100.id = 'currentTimePrev100'
  prevButton100.textContent = '<'
  prevButton100.title = '0.1秒戻る'
  prevButton100.dataset.current = '-100'
  const prevButton1000 = document.createElement('button')
  prevButton1000.id = 'currentTimePrev1000'
  prevButton1000.textContent = '<<'
  prevButton1000.title = '1秒戻る'
  prevButton1000.dataset.current = '-1000'
  const screenshotButton = document.createElement('button')
  screenshotButton.id = 'screenshot'
  screenshotButton.textContent = '📷'
  const outer = document.createElement('div')
  const inner = document.createElement('div')
  outer.id = 'screenshot-ui'
  inner.prepend(nextButton1000)
  inner.prepend(nextButton100)
  inner.prepend(prevButton100)
  inner.prepend(prevButton1000)
  inner.prepend(screenshotButton)
  outer.prepend(inner)
  document.querySelector('.ytp-right-controls').prepend(outer)
  document.getElementById('screenshot-ui').onselectstart = () => false
  document.getElementById('currentTimeNext1000').onclick = e => setCurrentTime(e)
  document.getElementById('currentTimeNext100').onclick = e => setCurrentTime(e)
  document.getElementById('currentTimePrev100').onclick = e => setCurrentTime(e)
  document.getElementById('currentTimePrev1000').onclick = e => setCurrentTime(e)
  document.getElementById('screenshot').onclick = () => getScreenshot()
}

const setCurrentTime = (e) => {
  const time = Number(e.target.dataset.current) / 1000
  const video = document.querySelector('.video-stream')
  const nowTime = video.currentTime
  video.currentTime = nowTime + time
}

const getScreenshot = () => {
  const zeroPadding = value => value < 10 ? String(`0${value}`) : String(value)
  const a = document.createElement('a')
  const c = document.createElement('canvas')
  const v = document.querySelector('.video-stream')
  const t = (() => {
    const e = document.querySelector('#container > h1')
    if (e !== null) return e.innerText
    return ''
  })()
  const sa = ((v.currentTime % 60) % 60).toFixed(2).split('.')
  const ms = zeroPadding(Number(sa[1]))
  const s = zeroPadding(Number(sa[0]))
  const m = zeroPadding(Math.floor((v.currentTime / 60) % 60))
  const h = zeroPadding(Math.floor(v.currentTime / 3600))
  a.download = `${t} ${h}-${m}-${s}.${ms}.png`
  c.width = v.videoWidth
  c.height = v.videoHeight
  c.getContext('2d').drawImage(v, 0, 0)
  c.toBlob((b) => {
    a.href = URL.createObjectURL(b)
    a.click()
  }, 'image/png')
}