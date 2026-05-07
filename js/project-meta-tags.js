// Auto-transform project metadata+tags on yandex.html.
// Turns: p.project-date "№97, 20.01.2025, Казахстан, Концепция, KV, ..." into:
//   p.project-meta (first 3 comma-separated parts)
//   div.project-tag-row (remaining parts as chips)
(function () {
  'use strict';

  var COUNTRY_RULES = [
    { re: /Казахстан/i, value: 'Казахстан' },
    { re: /Узбекистан/i, value: 'Узбекистан' },
    { re: /Таджикистан/i, value: 'Таджикистан' },
    { re: /Кыргызстан/i, value: 'Кыргызстан' },
    { re: /Беларус/i, value: 'Беларусь' },
    { re: /Груз/i, value: 'Грузия' },
    { re: /Армен/i, value: 'Армения' },
    { re: /Болив/i, value: 'Боливия' }
  ];

  // CSV-backed data for remaining Yandex projects.
  // Used to convert old split-format blocks (date + <code>№..</code> text) into new structure.
  var PROJECT_DATA_BY_NUMBER = {
    '117': { date: '04.2026', country: 'Армения', tags: ['DOOH', 'OLV', 'Генерация', 'Кей-вижуал'], title: '*NDA*' },
    '116': { date: '04.2026', country: 'Беларусь', tags: ['DOOH', 'Генерация', 'Кей-вижуал'], title: '*NDA*' },
    '115': { date: '04.2026', country: 'Беларусь', tags: ['Озвучка'], title: '*NDA*' },
    '114': { date: '04.2026', country: 'Казахстан', tags: ['OOH', 'Генерация', 'Концепция'], title: '*NDA*' },
    '113': { date: '04.2026', country: 'Непал', tags: ['Генерация', 'Кей-вижуал', 'Концепция'], title: '*NDA*' },
    '112': { date: '04.2026', country: 'Беларусь', tags: ['Digital', 'OLV', 'Генерация', 'Кей-вижуал'], title: '*NDA*' },
    '111': { date: '04.2026', country: 'Кот-д\'Ивуар', tags: ['Генерация'], title: '*NDA*' },
    '110': { date: '04.2026', country: 'Кыргызстан', tags: ['OOH', 'Генерация', 'Иллюстрация'], title: 'Иллюстрации для баннеров в автобусы' },
    '109': { date: '04.2026', country: 'Узбекистан', tags: ['OOH', 'Кей-вижуал'], title: 'Автобусные остановки. Часть 2' },
    '108': { date: '04.2026', country: 'Казахстан', tags: ['Digital', 'OLV', 'Генерация', 'Кей-вижуал'], title: 'Партнерское промо доставки еды в Linkedin' },
    '107': { date: '04.2026', country: 'Казахстан', tags: ['DOOH'], title: 'Анимация бортов на футбольный стадион' },
    '106': { date: '03.2026', country: 'Армения, Беларусь, Грузия, Казахстан, Кыргызстан, Узбекистан', tags: ['OLV'], title: 'Шаблон-конструктор для OLV' },
    '105': { date: '04.2026', country: 'Узбекистан', tags: ['Презентация'], title: 'Презентации спикеров для конференцию Brand Love' },
    '104': { date: '03.2026', country: 'Кыргызстан', tags: ['Генерация', 'Ивент', 'Кей-вижуал'], title: 'Брендирование для футбольного стадиона и марафона' },
    '103': { date: '03.2026', country: 'Казахстан', tags: ['InApp', 'Генерация', 'Кей-вижуал'], title: 'Советы по безопасности в Такси' },
    '102': { date: '03.2026', country: 'Армения', tags: [], title: 'Новичковый перф с KFC и дженерик офером' },
    '101': { date: '03.2026', country: 'Беларусь', tags: ['Digital', 'OLV', 'Кей-вижуал', 'Озвучка'], title: 'Перф с Санта и Подружка' },
    '100': { date: '03.2026', country: 'Беларусь', tags: ['Digital', 'OLV', 'Кей-вижуал', 'Озвучка'], title: 'Перф с Burger King' },
    '99': { date: '03.2026', country: 'Беларусь', tags: ['DOOH'], title: 'Ролик в курьерский хаб' },
    '98': { date: '02.2026', country: 'Казахстан', tags: [], title: '*NDA*' },
    '97': { date: '02.2026', country: 'Кыргызстан', tags: ['OOH', 'Генерация', 'Кей-вижуал', 'Концепция'], title: 'Промо доставки еды на автобусных остановках', description: 'Дизайн для промо доставки из ресторанов и магазинов на остановках в Кыргызстане. Сгенерили 3 сцены в нейронках для Еды, Продуктов и Плюса и растиражировали на 2 города' },
    '96': { date: '02.2026', country: 'Казахстан', tags: ['OOH', 'Генерация', 'Концепция'], title: 'Брендирование машин Еды', description: 'Задизайнили концепции оформления курьерских машин для доставки Еды в Казахстане' },
    '95': { date: '02.2026', country: 'Беларусь', tags: ['Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Промо на первый заказа в Евроопт' },
    '94': { date: '02.2026', country: 'Замбия', tags: ['Digital', 'InApp', 'OLV', 'Генерация', 'Кей-вижуал', 'Концепция'], title: 'Промо-кампания с розыгрышем iPhone для Yango', description: 'Разработали концепцию кей-вижуала, сгенерили ai-сцену, разложили на in-app форматы и собрали анимацию для партнерской трансляции' },
    '93': { date: '01.2026', country: 'Узбекистан', tags: ['OOH', 'Генерация', 'Ивент', 'Кей-вижуал'], title: 'Кей-вижуал и носители для ивента в пиццерии Belissimo Pizza' },
    '92': { date: '01.2026', country: 'Узбекистан', tags: ['DOOH', 'Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Промо для прерамадана с EVOS', description: 'Заанимировали olv и dooh ролик. Перегенерили партнерский фуд и заанимировали его в нейронках' },
    '91': { date: '12.2025', country: 'Узбекистан', tags: [], title: '*NDA*', description: 'Промо ролик в зону выдачи багажа в Ташкентский аэропорт' },
    '90': { date: '12.2025', country: 'Беларусь', tags: ['3D', 'Digital', 'InApp', 'Генерация', 'Кей-вижуал', 'Концепция'], title: 'Бургер-фест', description: 'Разработали кей-вижуал для Бургер-феста в Беларуси. Придумали визуальное направление, сгенерили фуд, леттеринг и 3д-персонажа. Растиражили все на форматы in-app и SMM' },
    '89': { date: '12.2025', country: 'Казахстан', tags: ['Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'OLV и кей-вижуал для промо Новичкового оффера Bahandi' },
    '88': { date: '11.2025', country: 'Казахстан', tags: ['Digital', 'OLV', 'Генерация'], title: 'Апдейт новогодней промо-кампании' },
    '87': { date: '12.2025', country: 'Беларусь', tags: [], title: '*NDA*' },
    '86': { date: '11.2025', country: 'Беларусь', tags: [], title: '*NDA*' },
    '85': { date: '12.2025', country: 'Кыргызстан', tags: ['DOOH', 'Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Новогоднее промо для Азии Ритейл в Кыргызстане' },
    '84': { date: '12.2025', country: 'Казахстан', tags: [], title: '*NDA*' },
    '83': { date: '11.2025', country: 'Казахстан', tags: ['DOOH', 'Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Новогодняя промо-кампания', description: 'Подготовили материалы для новогодней промо-кампании Яндекса в Казахстане. Сгенерили партнерские и дженерик фуды в новогодней атмосфере, собрали olv и dooh анимацию и растиражировали на 300+ роликов.' },
    '82': { date: '12.2025', country: 'Узбекистан', tags: ['DOOH', 'Генерация', 'Кей-вижуал'], title: 'Промо доставки из аптек', description: 'Разработали визуал для промо доставки из аптек в Узбекистане и заанимировали dooh-ролик' },
    '81': { date: '12.2025', country: 'Узбекистан', tags: ['Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Промо с Oqtepa Lavach' },
    '80': { date: '11.2025', country: 'Узбекистан', tags: ['Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Кейвижуал для новогодней промо-кампании' },
    '79': { date: '11.2025', country: 'Узбекистан', tags: [], title: '*NDA*' },
    '78': { date: '12.2025', country: 'Узбекистан', tags: ['DOOH'], title: 'Наружка для партнеров в ритейле' },
    '77': { date: '11.2025', country: 'Армения', tags: [], title: '*NDA*' },
    '76': { date: '11.2025', country: 'Казахстан', tags: [], title: '*NDA*' },
    '75': { date: '11.2025', country: 'Казахстан', tags: ['OLV', 'Озвучка'], title: 'Ролик в курьерский хаб' },
    '74': { date: '09.2025', country: 'Узбекистан', tags: ['DOOH', 'Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Промо-кампания Черной пятницы', description: 'Один из самых объемных проектов. Тут делали раскатку креативной рамки Черной пятницы на нескольких партнеров. Собрали мастеры раскадровок, сгенерили фуды и растиражили на сотни носителей в наружке и диджитале' },
    '73': { date: '09.2025', country: 'Беларусь', tags: ['DOOH', 'OLV'], title: 'Промо доставки продуктов из супермаркетов' },
    '72': { date: '10.2025', country: 'Беларусь', tags: ['Digital', 'InApp', 'Генерация', 'Иллюстрация', 'Кей-вижуал', 'Концепция'], title: 'Пицца-фест', description: 'Разработали кей-визуал для промо в приложении. Сгенерили сцену и нарисовали стикеры' },
    '71': { date: '09.2025', country: 'Казахстан', tags: ['DOOH', 'Генерация', 'Кей-вижуал'], title: 'Промо-кампания «Уютный октябрь» с Okadzaki' },
    '70': { date: '10.2025', country: 'Казахстан', tags: ['Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Промо первого заказа из I’m' },
    '69': { date: '09.2025', country: 'Узбекистан', tags: [], title: '*NDA*' },
    '68': { date: '10.2025', country: 'Узбекистан', tags: ['Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Промо доставки еды из супермаркетов' },
    '67': { date: '09.2025', country: 'Казахстан, Узбекистан', tags: ['OOH'], title: 'Статичная наружка для промо в регионах' },
    '66': { date: '07.2025', country: 'Беларусь, Казахстан, Кыргызстан, Узбекистан', tags: ['3D', 'OLV'], title: 'Обновление 3D телефончика для OLV роликов' },
    '65': { date: '09.2025', country: 'Беларусь', tags: ['DOOH', 'Озвучка'], title: 'Ролик на Минский полумарафон' },
    '64': { date: '07.2025', country: 'Беларусь', tags: ['DOOH', 'Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Промо доставки продуктов из супермаркетов', description: 'Собрали olv и dooh ролики для промо доставки из магазинов в Беларуси. Сгенерили и заанимировали корзины с фудами' },
    '63': { date: '09.2025', country: 'Кыргызстан', tags: ['Озвучка'], title: 'ГЗК для промо компании' },
    '62': { date: '08.2025', country: 'Грузия', tags: ['DOOH', 'OOH'], title: 'Наружка для охватки «Скидки больше и больше»' },
    '61': { date: '09.2025', country: 'Казахстан', tags: ['DOOH'], title: 'Наружка с оффером Mastercard', description: 'Заанимировали и собрали тираж наружки для промо с Mastercard в Казахстане.' },
    '60': { date: '09.2025', country: 'Беларусь, Казахстан, Кыргызстан, Узбекистан', tags: [], title: 'Онбординг письма' },
    '59': { date: '08.2025', country: 'Узбекистан', tags: ['OOH', 'Генерация', 'Кей-вижуал'], title: 'Промо-кампейн «Марафон Еды» в метро' },
    '58': { date: '09.2025', country: 'Узбекистан', tags: [], title: '*NDA*' },
    '57': { date: '09.2025', country: 'Узбекистан', tags: ['Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Партнерское промо с Yaponamama' },
    '56': { date: '09.2025', country: 'Узбекистан', tags: [], title: '*NDA*' },
    '55': { date: '08.2025', country: 'Грузия', tags: ['Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Промо для подключения ресторанов к доставке', description: 'Разработали кей-вижуал для b2b рекламной кампании нацеленной на подключение новых ресторанов в Грузии. Сгенерили сцену и заанимировали olv ролик на английском и грузинском с озвучкой.' },
    '54': { date: '07.2025', country: 'Кыргызстан', tags: ['Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Промо доставки из супермаркетов' },
    '53': { date: '07.2025', country: 'Казахстан', tags: [], title: 'Рассылка для проекта с эквайрингом + баннер в вендор кабинет' },
    '52': { date: '07.2025', country: 'Грузия', tags: ['OOH', 'Кей-вижуал'], title: 'Концепция билборда для партнерки с Pizza Hut' },
    '51': { date: '07.2025', country: 'Казахстан', tags: [], title: '*NDA*' },
    '50': { date: '07.2025', country: 'Грузия', tags: ['DOOH', 'Digital', 'OLV', 'OOH', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Рекламная кампания «Скидки больше и больше»', description: 'Один из самых объемных проектов. Сделали рекламную кампанию с 8 партнерами в Грузии. Заанимировали dooh и olv ролики, отретушировали партнерские фуды и сделали тираж на сотни носителей: анимированная наружка, автобусы, остановки, метро и диджитал.' },
    '49': { date: '08.2025', country: 'Казахстан', tags: ['OOH'], title: 'Оформление промо-зоны для проекта «Раздача воды курьерам»' },
    '48': { date: '07.2025', country: 'Казахстан', tags: [], title: '*NDA*' },
    '47': { date: '07.2025', country: 'Казахстан', tags: ['Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Промо первого заказа в Lavash Food' },
    '46': { date: '07.2025', country: 'Казахстан', tags: [], title: 'Шапки для рассылок о СРА' },
    '45': { date: '07.2025', country: 'Беларусь', tags: [], title: '*NDA*' },
    '44': { date: '07.2025', country: 'Казахстан', tags: ['DOOH', 'Генерация'], title: 'Наружка «Жара из-за скидок»' },
    '43': { date: '07.2025', country: 'Армения', tags: [], title: '*NDA*' },
    '42': { date: '06.2025', country: 'Казахстан', tags: ['3D', 'Digital', 'OLV', 'Генерация', 'Кей-вижуал', 'Озвучка'], title: 'Промо Плюса через доставку «Еда в Плюсе»' },
    '41': { date: '06.2025', country: 'Казахстан', tags: [], title: '*NDA*' },
    '40': { date: '07.2025', country: 'Казахстан', tags: ['DOOH', 'OOH'], title: 'Наружка для промо-кампании «Вкусно быть собой»' },
    '39': { date: '07.2025', country: 'Казахстан', tags: [], title: '*NDA*' },
    '38': { date: '06.2025', country: 'Беларусь', tags: ['OLV', 'Иллюстрация'], title: 'Ролики в курьерский хаб' },
    '37': { date: '07.2025', country: 'Беларусь', tags: [], title: '*NDA*' },
    '36': { date: '06.2025', country: 'Беларусь', tags: [], title: '*NDA*' },
    '35': { date: '04.2025', country: 'Узбекистан', tags: ['Digital', 'OLV', 'Озвучка'], title: 'Промо для Korzinka Go' },
    '34': { date: '05.2025', country: 'Казахстан', tags: ['Digital', 'OLV', 'Кей-вижуал', 'Озвучка'], title: 'Партнерское промо «до -50% на пиццы» с Papa John\'s' },
    '33': { date: '03.2026', country: 'Казахстан', tags: ['DOOH'], title: 'Наружка для промо «-15% на новые блюда»' },
    '32': { date: '05.2025', country: 'Казахстан', tags: ['Digital', 'OLV', 'Кей-вижуал', 'Озвучка'], title: 'Партнерское промо с PikaPika' },
    '31': { date: '05.2025', country: 'Казахстан', tags: ['Digital', 'OLV', 'Озвучка'], title: 'Промо вело-курьеров' },
    '30': { date: '06.2025', country: 'Грузия', tags: ['Digital', 'OLV', 'Озвучка'], title: 'Промо вело-курьеров' },
    '29': { date: '05.2025', country: 'Казахстан', tags: ['Digital', 'OLV', 'Кей-вижуал', 'Озвучка'], title: 'Партнерское промо на первый заказ в Doner na Satpaeva' },
    '28': { date: '05.2025', country: 'Казахстан, Кыргызстан, Узбекистан', tags: ['Digital', 'OLV', 'Озвучка'], title: 'Промо для велосипедизации курьеров' },
    '27': { date: '06.2025', country: 'Беларусь', tags: [], title: '*NDA*' },
    '26': { date: '05.2025', country: 'Узбекистан', tags: [], title: '*NDA*' },
    '25': { date: '04.2025', country: 'Армения', tags: ['OLV', 'Озвучка'], title: 'Апдейт видео-ролика про доставку Еды' },
    '24': { date: '05.2025', country: 'Беларусь', tags: ['OLV', 'Озвучка'], title: 'Промо для велосипедизации курьеров' },
    '23': { date: '04.2025', country: 'Узбекистан', tags: ['Ивент', 'Озвучка'], title: 'Ролик на фестиваль' },
    '22': { date: '05.2025', country: 'Казахстан', tags: ['Digital', 'OLV', 'Озвучка'], title: 'Промо бесплатной доставки из I’m' },
    '21': { date: '05.2025', country: 'Казахстан', tags: [], title: '*NDA*' },
    '20': { date: '05.2025', country: 'Беларусь', tags: [], title: '*NDA*' },
    '19': { date: '04.2025', country: 'Боливия', tags: ['OOH', 'Генерация'], title: 'Билборд с El Solar для Yango', description: 'Сгенерили 3d биллборд для партнерки Yango и местного ресторана в Боливии' },
    '18': { date: '05.2025', country: 'Казахстан', tags: ['DOOH'], title: 'Анимация диджитал наружки с KFC' },
    '17': { date: '06.2025', country: 'Казахстан, Кыргызстан, Узбекистан', tags: ['Digital', 'OLV', 'Озвучка'], title: 'Курьерские креативы про доход' },
    '16': { date: '04.2025', country: 'Казахстан', tags: ['DOOH'], title: 'Диджитал наружка с Burger King для промо «Пост-Рамадан»' },
    '15': { date: '05.2025', country: 'Армения', tags: ['OLV'], title: 'Дизайн и анимация лайнов в промо-видео для Kinodaran' },
    '14': { date: '04.2025', country: 'Казахстан', tags: ['DOOH'], title: 'Диджитал наружка с CoffeeBoom для промо «Пост-Рамадан»' },
    '13': { date: '03.2025', country: 'Казахстан', tags: ['Digital', 'OLV', 'Озвучка'], title: 'Дополнительный тираж для промо I’m' },
    '12': { date: '04.2025', country: 'Узбекистан', tags: ['Digital', 'OLV', 'Генерация', 'Озвучка'], title: 'Промо для Korzinka Go в Самарканде' },
    '11': { date: '04.2025', country: 'Казахстан', tags: ['Digital', 'OLV', 'Кей-вижуал', 'Озвучка'], title: 'Продвижение бесплатной доставки из I’m' },
    '10': { date: '04.2025', country: 'Казахстан', tags: [], title: '*NDA*' },
    '9': { date: '04.2025', country: 'Узбекистан', tags: [], title: '*NDA*' },
    '8': { date: '04.2025', country: 'Казахстан', tags: ['Digital', 'OLV', 'Озвучка'], title: 'Промо доставки из «Плов в коробочке»' },
    '7': { date: '04.2025', country: 'Казахстан', tags: ['DOOH', 'Кей-вижуал'], title: 'Диджитал наружка с Okadzaki для промо «Пост-Рамадан»' },
    '6': { date: '03.2025', country: 'Казахстан', tags: ['DOOH', 'Кей-вижуал'], title: 'Промо i’m в Рамадан' },
    '5': { date: '04.2025', country: 'Армения', tags: [], title: 'Стикеры для Армении' },
    '4': { date: '04.2025', country: 'Казахстан', tags: ['Генерация'], title: '*NDA* для Ultima' },
    '3': { date: '04.2025', country: 'Казахстан', tags: ['Генерация'], title: '*NDA*' },
    '2': { date: '04.2025', country: 'Узбекистан', tags: ['DOOH'], title: 'Анимация баннера в торговый центр Seoul Mun' },
    '1': { date: '03.2025', country: 'Казахстан', tags: ['Digital', 'OLV', 'Кей-вижуал', 'Озвучка'], title: 'Промо первого заказа из I’m' }
  };

  function buildMetaParagraph(tokens) {
    var p = document.createElement('p');
    p.className = 'project-meta';

    tokens.forEach(function (t) {
      var span = document.createElement('span');
      span.textContent = t;
      p.appendChild(span);
    });

    return p;
  }

  function buildTagRow(tokens) {
    var row = document.createElement('div');
    row.className = 'project-tag-row';
    row.setAttribute('aria-label', 'Project tags');

    tokens.forEach(function (t) {
      var chip = document.createElement('span');
      chip.className = 'project-tag-chip';
      chip.textContent = t;
      row.appendChild(chip);
    });

    return row;
  }

  function extractCountryFromText(text) {
    if (!text) return '';
    for (var i = 0; i < COUNTRY_RULES.length; i++) {
      var rule = COUNTRY_RULES[i];
      if (rule.re.test(text)) return rule.value;
    }
    return '';
  }

  function toMonthYear(dateText) {
    var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec((dateText || '').trim());
    if (!m) return dateText;
    return m[2] + '.' + m[3];
  }

  function normalizeNdaTitle(title) {
    return (title || '').replace(/\*+\s*NDA\s*\*+/gi, 'NDA').trim();
  }

  function buildTitleAndDescriptionBlock(title, description) {
    var fragment = document.createDocumentFragment();
    var h3 = document.createElement('h3');
    h3.textContent = normalizeNdaTitle(title);
    fragment.appendChild(h3);

    if (description) {
      var p = document.createElement('p');
      p.textContent = description;
      fragment.appendChild(p);
    }

    return fragment;
  }

  function buildTitleWithDescriptionParagraph(title, description) {
    var p = document.createElement('p');
    var span = document.createElement('span');
    span.className = 'project-text-emphasis';
    span.textContent = normalizeNdaTitle(title);
    p.appendChild(span);
    if (description) {
      p.appendChild(document.createTextNode(' ' + description));
    }
    return p;
  }

  function splitTitleAndDescription(text) {
    var clean = (text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return { title: '', description: '' };
    var dotIdx = clean.indexOf('. ');
    if (dotIdx === -1) return { title: clean, description: '' };
    return {
      title: clean.slice(0, dotIdx + 1).trim(),
      description: clean.slice(dotIdx + 2).trim()
    };
  }

  function detectProjectContent(startNode) {
    var cur = startNode ? startNode.nextElementSibling : null;
    while (cur && !(cur.classList && cur.classList.contains('project-meta'))) {
      if (
        (cur.classList && cur.classList.contains('project-gallery')) ||
        cur.querySelector('img, video, iframe')
      ) {
        return true;
      }
      cur = cur.nextElementSibling;
    }
    return false;
  }

  function detectProjectContentInRawBlock(dateEl) {
    var cur = dateEl ? dateEl.nextElementSibling : null;
    while (cur) {
      if (cur.matches && cur.matches('p.project-date')) return false;
      if (
        (cur.classList && cur.classList.contains('project-gallery')) ||
        cur.querySelector('img, video, iframe')
      ) {
        return true;
      }
      cur = cur.nextElementSibling;
    }
    return false;
  }

  function normalizeProjectSpacingAndType() {
    var metas = Array.prototype.slice.call(document.querySelectorAll('p.project-meta'));
    if (!metas.length) return;

    metas.forEach(function (metaEl, idx) {
      var hasContent = detectProjectContent(metaEl);
      metaEl.classList.add(hasContent ? 'project-meta--content' : 'project-meta--compact');
      if (!hasContent) return;

      // Insert one base spacer before content projects (except the very first).
      if (idx > 0) {
        var beforeSpacer = document.createElement('div');
        beforeSpacer.className = 'ids__space';
        metaEl.parentNode.insertBefore(beforeSpacer, metaEl);
      }

      // Insert one base spacer after content projects.
      var scan = metaEl.nextElementSibling;
      var nextMeta = null;
      while (scan) {
        if (scan.matches && scan.matches('p.project-meta')) {
          nextMeta = scan;
          break;
        }
        scan = scan.nextElementSibling;
      }
      var afterSpacer = document.createElement('div');
      afterSpacer.className = 'ids__space';
      if (nextMeta) {
        metaEl.parentNode.insertBefore(afterSpacer, nextMeta);
      } else {
        metaEl.parentNode.appendChild(afterSpacer);
      }
    });
  }

  function transformCombinedFormat(dateEl) {
    // Transform p.project-date when it already contains:
    // "№xx, дата, страна, тег1, тег2, ..."
    var raw = (dateEl && dateEl.textContent ? dateEl.textContent : '').trim();
    if (!raw) return false;
    if (!raw.startsWith('№')) return false;
    if (raw.indexOf(',') === -1) return false;

    var parts = raw
      .split(',')
      .map(function (s) {
        return (s || '').trim();
      })
      .filter(Boolean);

    // Need at least number + date + country.
    if (parts.length < 3) return false;

    var metaTokens = parts.slice(0, 3);
    var tagTokens = parts.slice(3);
    if (!metaTokens.length) return false;

    var parent = dateEl.parentNode;
    if (!parent) return false;

    var metaEl = buildMetaParagraph(metaTokens);

    parent.insertBefore(metaEl, dateEl);
    // Render chip row only when extra tags exist (4th token and beyond).
    if (tagTokens.length) {
      var tagRowEl = buildTagRow(tagTokens);
      parent.insertBefore(tagRowEl, dateEl);
    }
    dateEl.remove();
    return true;
  }

  function transformSplitFormat(dateEl) {
    // Fallback:
    // dateEl is p.project-date with only date (e.g. "20.01.2025")
    // and number+title are in the next <p> as:
    // <code class="project-number">№xx</code> ...text...
    var raw = (dateEl && dateEl.textContent ? dateEl.textContent : '').trim();
    if (!raw) return false;
    if (raw.indexOf(',') !== -1) return false;
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(raw)) return false;

    // Avoid re-processing already converted blocks.
    var prev = dateEl.previousElementSibling;
    if (prev && prev.classList && prev.classList.contains('project-meta')) return false;

    var nextP = dateEl.nextElementSibling;
    if (!nextP || nextP.tagName !== 'P') return false;

    var codeEl = nextP.querySelector('code.project-number');
    if (!codeEl) return false;

    var numberText = (codeEl.textContent || '').trim();
    if (!numberText) return false;

    var containerText = nextP.textContent || '';
    var country = extractCountryFromText(containerText);

    var parent = dateEl.parentNode;
    if (!parent) return false;

    // Remove number from source text (it becomes part of project-meta).
    codeEl.remove();
    var sourceText = (nextP.textContent || '').replace(/\s+/g, ' ').trim();
    var numberOnly = numberText.replace(/[^\d]/g, '');
    var csvData = PROJECT_DATA_BY_NUMBER[numberOnly];
    var parsed = splitTitleAndDescription(sourceText);

    var metaDate = csvData && csvData.date ? csvData.date : toMonthYear(raw);
    var metaCountry = csvData && csvData.country ? csvData.country : (country || '—');
    var metaTokens = [numberText, metaDate, metaCountry];
    var tags = (csvData && csvData.tags) ? csvData.tags : [];
    var title = (csvData && csvData.title) ? csvData.title : (parsed.title || sourceText);
    var description = (csvData && csvData.description) ? csvData.description : parsed.description;

    var metaEl = buildMetaParagraph(metaTokens);
    var hasContent = detectProjectContentInRawBlock(dateEl);
    var useHeadingLayout = hasContent;
    var titleBlock = useHeadingLayout
      ? buildTitleAndDescriptionBlock(title, description)
      : buildTitleWithDescriptionParagraph(title, description);

    parent.insertBefore(metaEl, dateEl);
    if (tags.length) parent.insertBefore(buildTagRow(tags), dateEl);
    parent.insertBefore(titleBlock, dateEl);
    nextP.remove();
    dateEl.remove();
    return true;
  }

  function init() {
    var items = document.querySelectorAll('p.project-date');
    if (!items || !items.length) return;

    items.forEach(function (p) {
      // 1) If date line is already in combined "№, date, country, tags..." format -> convert.
      if (transformCombinedFormat(p)) return;
      // 2) Otherwise try split fallback: date-only + next <p> with code.project-number.
      transformSplitFormat(p);
    });

    normalizeProjectSpacingAndType();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

