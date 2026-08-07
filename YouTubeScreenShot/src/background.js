const extensionApi = globalThis.browser ?? globalThis.chrome

extensionApi.commands.onCommand.addListener(async (command) => {
  console.log('[YouTubeScreenShot] background.js - command:', command)

  // アクティブなタブにメッセージを送信
  const tabs = await extensionApi.tabs.query({ active: true, currentWindow: true })
  if (tabs.length === 0) return

  try {
    await extensionApi.tabs.sendMessage(tabs[0].id, command)
  } catch (error) {
    // 読み込み完了前はエラーになるので注意
    console.log('[YouTubeScreenShot] background.js - error:', error)
  }
})
