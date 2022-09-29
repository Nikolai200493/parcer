// Функция остановки кода
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Функция получения рандомного числа для функции sleep
function randomInteger(min, max) {
  let rand = min - 0.5 + Math.random() * (max - min + 1)
  return Math.round(rand)
}

// Функция получения таймштампа из дат просматриваемых страниц
function getTimestamp(dateString) {
  const updatedDate =
    dateString.split(' ')[0].split('.').reverse().join('-') +
    ' ' +
    dateString.split(' ')[1]
  return new Date(updatedDate).getTime()
}

// Создаем кнопку для контентного окна
const getDataButton = document.createElement('button')
getDataButton.textContent = 'Запустить считывание данных'
getDataButton.style.cssText = `
      outline: none !important;
      position: fixed;
      z-index: 9999;
      color: #fff;
      border: 1px solid #6c757d;
      border-bottom-right-radius: 4px;
      gradient: none;
      padding: 0.5rem 0.375rem;
      font-size: 12px;
      background-color: #6c757d;
      cursor: pointer;
    `

// Получаем дату последней сохраненной процедуры на сервере
let previousDataFromServer = null
chrome.storage.local.get(['previousDate'], function (result) {
  previousDataFromServer = result.previousDate
})

// Парсинг сайта Текторг
if (window.location.href.indexOf('tektorg') > 0) {
  const tektorgProcedureSearch = document.querySelector(
    '.section-procurement__title'
  )
  if (tektorgProcedureSearch.textContent === 'Поиск процедур') {
    document.body.prepend(getDataButton)
  }

  function getData() {
    // Получаем ссылки для перехода на страницы
    const allLinks = Array.from(
      document.querySelectorAll('.section-procurement__item-title')
    )
    const tektorgLinksArray = []
    allLinks.forEach((link) => {
      tektorgLinksArray.push(link.href)
    })

    // Получаем даты процедуры для проверки на актуальность
    const allPublicationDate = Array.from(
      document.querySelectorAll(
        '.section-procurement__item-date > div:first-child > b'
      )
    )
    const tektorgPublicationArray = []
    allPublicationDate.forEach((date) => {
      tektorgPublicationArray.push(
        getTimestamp(date.nextSibling.textContent.trim())
      )
    })
    tektorgPublicationArray.sort((a, b) => b - a)
    const latestDate = tektorgPublicationArray[0]

    chrome.storage.local.set({ tektorgLinksArray: tektorgLinksArray })

    let dataToSend = []

    async function startCollectData() {
      let newPage
      let oldData = []
      chrome.storage.local.get(['tektorgParsedData'], function (result) {
        if (result.tektorgParsedData !== undefined) {
          oldData = [...result.tektorgParsedData]
        }
      })
      // Получаем отсортированный массив дат (таймштамп) из прошлых данных
      const oldDataDates = oldData
        .map((item) => {
          return getTimestamp(item['Дата публикации процедуры'])
        })
        .sort((a, b) => {
          b - a
        })

      if (latestDate > oldDataDates[0] || oldDataDates[0] === undefined) {
        function openAndParsePage(link) {
          // Проверка, если самая большая дата из данных сервера меньше новых дат, делать парсинг страницы
          if (
            oldDataDates[0] /*< tektorgPublicationArray[i]*/ ||
            oldDataDates[0] === undefined
          ) {
            newPage = window.open(link)
            newPage.addEventListener('DOMContentLoaded', async () => {
              const procedureTitle = newPage.document.querySelector(
                '.section-procurement__title'
              )
              if (procedureTitle) {
                // Формирование объекта данных

                // Наименование продукции
                const productDescription = newPage.document.querySelector(
                  '#commonInfo .procedure__item-name'
                ).textContent

                const productNameObject = {}
                const purchaseName = newPage.document.querySelectorAll(
                  '#commonInfo .procedure__item-table > tbody tr'
                )
                purchaseName.forEach((item) => {
                  if (
                    item.children[0].textContent.trim() === 'Номер закупки:' ||
                    item.children[0].textContent.trim() === 'Номер процедуры:'
                  ) {
                    productNameObject.id = `tektorg-${item.children[1].textContent.trim()}`
                    productNameObject.number =
                      item.children[1].textContent.trim()
                  } else if (
                    item.children[0].textContent.trim() === 'Способ закупки:' ||
                    item.children[0].textContent.trim() === 'Тип процедуры:'
                  ) {
                    productNameObject['type-of-sold'] =
                      item.children[1].textContent.trim()
                  } else if (
                    item.children[0].textContent.trim() === 'Текущая стадия:'
                  ) {
                    productNameObject['type-of-sold'] =
                      item.children[1].textContent.trim()
                  } /*else {
                    productNameObject[item.children[0].textContent] =
                      item.children[1].textContent.trim()
                  } */
                })

                // Дата публикации
                const timingObject = {}
                const timing = newPage.document.querySelectorAll(
                  '.procedure__item--timing > .procedure__item-table > tbody tr'
                )
                timing.forEach((item) => {
                  if (
                    item.children[0].textContent.trim() ===
                    'Дата публикации процедуры:'
                  ) {
                    timingObject['date-publication'] =
                      item.children[1].textContent.trim()
                  } else if (
                    item.children[0].textContent.trim() ===
                    'Дата окончания срока подачи технико-коммерческих частей:'
                  ) {
                    timingObject['date-deadline'] =
                      item.children[1].textContent.trim()
                  } else if (
                    item.children[0].textContent.trim() ===
                    'Подведение итогов не позднее:'
                  ) {
                    timingObject['date-of-results'] =
                      item.children[1].textContent.trim()
                  }
                  // timingObject[
                  //   item.children[0].textContent
                  //     .trim()
                  //     .substring(
                  //       0,
                  //       item.children[0].textContent.trim().length - 1
                  //     )
                  // ] = `${item.children[1].textContent.trim()}`
                })

                // Сведения об организаторе
                const organizerObject = {}
                const organizer = newPage.document.querySelectorAll(
                  '#orgInfo .procedure__item-table > tbody tr'
                )
                organizer.forEach((item) => {
                  if (
                    item.children[0].textContent.trim() ===
                    'Наименование организатора:'
                  ) {
                    organizerObject.organizer =
                      item.children[1].textContent.trim()
                  }
                  // organizerObject[
                  //   item.children[0].textContent
                  //     .trim()
                  //     .substring(
                  //       0,
                  //       item.children[0].textContent.trim().length - 1
                  //     )
                  // ] = `${item.children[1].textContent.trim()}`
                })

                // Остальная информация
                const otherObject = {}
                const other = newPage.document.querySelectorAll(
                  '#lot1 .procedure__lot-item .procedure__item-table > tbody tr'
                )
                other.forEach((item) => {
                  if (
                    item.children[0].textContent.trim() === 'Начальная цена:'
                  ) {
                    otherObject.price = item.children[1]?.textContent?.trim()
                  }
                  // otherObject[
                  //   item.children[0].textContent
                  //     .trim()
                  //     .substring(
                  //       0,
                  //       item.children[0].textContent.trim().length - 1
                  //     )
                  // ] = `${item.children[1]?.textContent?.trim()}`
                })

                const procedureObject = {
                  ...productNameObject,
                  ...timingObject,
                  ...organizerObject,
                  ...otherObject,
                  link: newPage.location.href,
                  title: productDescription
                }

                const isDublicate = oldData.find(
                  (item) => item.number === procedureObject.number
                )
                if (!isDublicate) {
                  dataToSend.push(procedureObject)
                }
              }

              counter++
              console.log('counter', counter)
              newPage.close()
              if (tektorgLinksArray[counter] !== undefined) {
                await sleep(randomInteger(500, 1500))
                openAndParsePage(tektorgLinksArray[counter])
                if (counter === tektorgLinksArray.length - 1) {
                  console.log('data to send', dataToSend)
                  setTimeout(() => {
                    console.log('dataToSend', dataToSend)
                    alert('Данные собраны и готовы к отправке')
                  }, 1000)
                }
              }
              chrome.storage.local.set({ tektorgParsedData: dataToSend })
            })
          }
        }

        let counter = 0
        openAndParsePage(tektorgLinksArray[counter])
      }
    }
    startCollectData(tektorgLinksArray)
  }

  getDataButton.addEventListener('click', getData)
  // End of Tektorg parsing
} else if (window.location.href.indexOf('b2b-center') > 0) {
  // // b2p-center parsing
  // const b2bCenterProcedureSearch = document.querySelector('#content h1')
  // console.log('b2bCenterProcedureSearch', b2bCenterProcedureSearch)
  // if (b2bCenterProcedureSearch.textContent === 'Торговая площадка') {
  //   document.body.prepend(getDataButton)
  // }
  // function getData() {
  //   const allLinks = Array.from(
  //     document.querySelectorAll('.search-results-title')
  //   ).slice(0, 3)
  //   const b2bLinksArray = []
  //   allLinks.forEach((link) => {
  //     b2bLinksArray.push(link.href)
  //   })
  //   console.log('list items', b2bLinksArray)
  //   chrome.storage.local.set({ b2bLinksArray: b2bLinksArray })
  //   let dataToSend = []
  //   async function startCollectData(links) {
  //     let newPage
  //     let oldData = []
  //     chrome.storage.local.get(['b2bParsedData'], function (result) {
  //       if (result.b2bParsedData !== undefined) {
  //         oldData = [...result.b2bParsedData]
  //         console.log('oldData', oldData)
  //       }
  //     })
  //     for (let i = 0; i < links.length; i++) {
  //       newPage = window.open(links[i])
  //       newPage.addEventListener('DOMContentLoaded', () => {
  //         const procedureTitle = newPage.document.querySelector('#content h1')
  //         if (procedureTitle) {
  //           // Формирование объекта данных
  //           // Наименование продукции
  //           const productName = newPage.document.querySelector(
  //             '#auction_info_td span'
  //           ).textContent
  //           console.log('productName', productName)
  //           // Номер процедуры
  //           const procedureNumber =
  //             newPage.document.querySelector('#content h1').textContent
  //           console.log('procedureNumber', procedureNumber)
  //         }
  //       })
  //     }
  //   }
  //   startCollectData(b2bLinksArray)
  // }
  // getDataButton.addEventListener('click', getData)
  // End of b2b-center parsing
}
