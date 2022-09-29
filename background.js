document.addEventListener('DOMContentLoaded', () => {
  const parsePagesDataButton = document.querySelector('.parsePagesDataButton')

  parsePagesDataButton.addEventListener('click', () => {
    chrome.storage.local.get(['tektorgParsedData'], function (result) {
      console.log('data', result.tektorgParsedData)
      if (result.tektorgParsedData !== undefined) {
        let formData = new FormData()
        formData.append('TabId', '12324')
        formData.append('info', JSON.stringify(result.tektorgParsedData))
        fetch(
          'http://94.124.194.60:8485/index.php/FileController/UploadFileForm',
          {
            method: 'POST',
            body: formData
          }
        )
          .then((response) => {
            if (response.ok) {
              alert('Данные отправлены успешно.')
              chrome.storage.local.set({ needReload: 'true' })
              // window.location.reload()
            } else {
              alert('Что-то пошло не так. Попробуйте еще раз.')
            }
          })
          .catch((error) => {
            console.log(error)
          })
      } else {
        alert('Данных для отправки нет. Запустите считывание данных.')
      }
    })
    chrome.storage.local.remove(['tektorgParsedData'])
  })

  // const openLinkButton = document.querySelector('.openLinkButton')
  // openLinkButton.addEventListener('click', () => {
  //   const newPage = window.open(
  //     'https://www.tektorg.ru/rosnefttkp/procedures?sort=datestart&limit=25&page=1'
  //   )

  //   newPage.addEventListener('DOMContentLoaded', () => {
  //     chrome.storage.local.set({ forParsing: 'true' })
  //     alert('HIIIIIIII')
  //   })
  // })
})
