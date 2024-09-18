
chrome.commands.onCommand.addListener((command) => {
  console.log('👘 - chrome.commands.onCommand.addListener - command:', command)
  // アクティブなタブにメッセージを送信
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, command).catch((error) => {
        // 読み込み完了前はエラーになるので注意
        console.log('👘 - chrome.tabs.query - error:', error)
      })
    }
  })
})