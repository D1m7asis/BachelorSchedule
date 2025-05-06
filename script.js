const lecture_time = [
    "⏩ 8:30<br>⏪10:00",
    "⏩10:10<br>⏪11:40",
    "⏩11:50<br>⏪13:20",
    "⏩13:50<br>⏪15:20",
    "⏩15:30<br>⏪17:00",
    "⏩17:10<br>⏪18:40",
    "⏩18:50<br>⏪20:20"
];

let weekType = '-1'

$(document).ready(function () {
    $('#select-state').selectize({
        sortField: 'text'
    });

    $.getJSON('schedule.json', function (data) {
        const select = $('#select-state')[0].selectize;
        select.clearOptions(); // Очистить существующие опции
        select.addOption({value: '5', text: '5 подгруппа'});
        select.setValue('5', false);
    });

    // Устанавливаем текущую дату и определяем, какая неделя (верхняя или нижняя)
    function updateDateInfo() {
        const today = new Date();
        const dateInfo = formatDate(today);
        $('#today-date').text('Сегодня: ' + dateInfo);
    }

    function updateCurrentClassInfo() {
        const now = new Date();
        const currentDay = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"][now.getDay()];
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Текущее время в минутах

        // Время начала и окончания пар в минутах
        const classTimes = lecture_time.map(time => {
            const times = time.split('<br>');
            const start = times[0].split('⏩')[1].split(':');
            const end = times[1].split('⏪')[1].split(':');
            return {
                start: parseInt(start[0]) * 60 + parseInt(start[1]),
                end: parseInt(end[0]) * 60 + parseInt(end[1])
            };
        });

        let currentClass = null;
        let timeLeft = 0;

        // Проверяем, какая пара сейчас идет
        for (let i = 0; i < classTimes.length; i++) {
            if (currentTime >= classTimes[i].start && currentTime < classTimes[i].end) {
                currentClass = i
                timeLeft = classTimes[i].end - currentTime;
                break;
            }
        }

        // Загружаем расписание и находим название текущей пары
        $.getJSON('schedule.json', function (data) {
            if (data[currentDay] && currentClass !== null) {
                const scheduleItem = data[currentDay][currentClass];
                const scheduleIsNotEmpty = scheduleItem !== '&nbsp'

                if (scheduleItem && scheduleIsNotEmpty && timeLeft > 0) {
                    $('#current-class').text(`Текущая пара закончится через ${timeLeft} мин`);
                } else {
                    $('#current-class').text('Сейчас нет пары');
                }
            }
        });

        // Обновляем информацию каждую минуту
        setTimeout(updateCurrentClassInfo, 60000);
    }

    // Форматирование даты в формате "Вторник, 03.09.2024. Верхняя неделя"
    function formatDate(date) {
        const daysOfWeek = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
        const weekTypes = ["Верхняя", "Нижняя"];

        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const dayOfWeek = daysOfWeek[date.getDay()];

        // Начальная дата верхней недели
        const startDate = new Date(2025, 0, 20); // 02.09.2024 (сентябрь = 8, потому что месяцы считаются с 0)

        // Рассчитываем количество недель, прошедших с начала периода
        const diffInDays = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
        const weekIndex = Math.floor(diffInDays / 7);

        // Определяем тип недели
        weekType = weekTypes[weekIndex % 2]; // Чередование верхней и нижней недели

        return `${dayOfWeek}, ${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}. ${weekType} неделя`;
    }

    updateDateInfo();
    updateCurrentClassInfo();

    function generateDailyScheduleTable(scheduleItems) {
        let tableHtml = '<table class="table table-bordered"><thead><tr><th>#</th><th>Предмет</th><th>Препод</th><th>Кабинет</th></tr></thead><tbody>';
        scheduleItems.forEach((item, index) => {

            let subject_line = item.split('\n');
            let subject = subject_line[0] === undefined ? '&nbsp' : subject_line[0];
            let teacher = subject_line[1] === undefined ? '&nbsp' : subject_line[1];
            let room = subject_line[2] === undefined ? '&nbsp' : subject_line[2];

            let highlighter = '';
            if (item.toLowerCase().includes('онлайн')) {
                highlighter = 'class="online-highlight"';
            } else if (item.toLowerCase().includes('лекция')) {
                highlighter = 'class="lecture-highlight"';
            }

            let current_week_type = (weekType.charAt(0).toLowerCase() === 'в') ? "В/Н" : "Н/Н";
            let lineIsEmpty = subject === '&nbsp' && teacher === '&nbsp' && room === '&nbsp';
            let subjectIsRare = subject_line[subject_line.length - 1].includes("Н/Н") || subject_line[subject_line.length - 1].includes("В/Н")
            let rareSubjectIsOnThisWeek = subject_line[subject_line.length - 1] === current_week_type

            let subjectIsToday = subjectIsRare === rareSubjectIsOnThisWeek;

            if (subjectIsToday && !lineIsEmpty) {
                tableHtml += `<tr><td ${highlighter}>№${index + 1} <br>${lecture_time[index]}</br></td><td ${highlighter}>${subject}</td><td ${highlighter}>${teacher}</td><td ${highlighter}>${room}</td></tr>`;
            } else {
                tableHtml += `<tr><td>№${index + 1} <br>${lecture_time[index]}</br></td><td colspan="3">&nbsp;</td></tr>`;
            }
        });
        tableHtml += '</tbody></table>';
        return tableHtml;
    }

    function loadSchedule(modalId, key) {
        $.getJSON('schedule.json', function (data) {
            if (data[key]) {
                const scheduleHtml = generateDailyScheduleTable(data[key]);
                $(modalId + ' .modal-body').html(scheduleHtml);
            } else if (key === 'Воскресенье') {
                $(modalId + ' .modal-body').html('Сегодня выходной 🎉');
            } else {
                $(modalId + ' .modal-body').html('Расписание не доступно');
            }
        });
    }

    function loadTodayOrTomorrow(dateKey) {
        const today = new Date();
        let targetDate = new Date(today);

        const daysOfWeek = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

        if (dateKey === 'tomorrow') {
            targetDate.setDate(today.getDate() + 1);
            loadSchedule('#nextDayModal', daysOfWeek[targetDate.getDay()]);

        } else {
            loadSchedule('#todayModal', daysOfWeek[targetDate.getDay()]);
        }
    }

    function loadWeekSchedule(modalId) {
        $.getJSON('schedule.json', function (data) {
            const highlighter = 'class="today-highlight"';
            let tableContent = '<table class="table table-bordered"><thead><tr><th>День недели</th><th>Расписание</th></tr></thead><tbody>';
            const daysOfWeek = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

            daysOfWeek.forEach(day => {
                if (data[day]) {
                    let miniTable = '<table class="table table-bordered table-sm mb-0"><tbody>';
                    let index = 1
                    data[day].forEach(item => {
                        if (item.trim() !== "") {
                            const parts = item.split('\n');
                            miniTable += `<tr>
                                <td>№${index++}</td>
                                <td>${parts[0] || ''}</td>
                                <td>${parts[1] || ''}</td>
                                <td>${parts[2] || ''}</td>
                                <td>${parts[3] || ''}</td>
                            </tr>`;
                        }
                    });
                    miniTable += '</tbody></table>';

                    const todayDate = formatDate(new Date()).split(',')[0];
                    tableContent += `<tr ${day === todayDate ? highlighter : ''}><td>${day}</td><td>${miniTable}</td></tr>`;
                } else {
                    tableContent += `<tr><td>${day}</td><td>Нет расписания</td></tr>`;
                }
            });

            tableContent += '</tbody></table>';
            $(modalId + ' .modal-body').html(tableContent);
        });
    }

    // Обработчики событий для модальных окон
    $('#todayModal').on('show.bs.modal', function () {
        loadTodayOrTomorrow('today');
    });

    $('#nextDayModal').on('show.bs.modal', function () {
        loadTodayOrTomorrow('tomorrow');
    });

    $('#weekModal').on('show.bs.modal', function () {
        loadWeekSchedule('#weekModal');
    });

    $('#customModal').on('show.bs.modal', function () {
        // showCustomMessage('#customModal', 'Конец сессии!');
        showCustomImage('#customModal', 'weeks.jpg');
        //loadCustomSchedule('#customModal');
    });

    function showCustomMessage(modalId, content) {
        const modal = $(modalId);
        const textElement = $('<p>', {
            alt: 'Custom Text',
            class: 'centered-image',
            text: content
        });

        modal.find('.modal-body').empty().append(textElement);
    }

    function showCustomImage(modalId, imageSrc) {
        const modal = $(modalId);
        const imgElement = $('<img>', {
            src: imageSrc,
            alt: 'Custom Schedule',
            class: 'centered-image'
        });

        modal.find('.modal-body').empty().append(imgElement);
    }

    function loadCustomSchedule(modalId) {
        $.getJSON('army-schedule.json', function (data) {
            let tableContent = '<table class="table table-bordered"><thead><tr><th>Дата</th><th>Время</th><th>Расписание</th></tr></thead><tbody>';
            const highlighter = 'class="today-highlight"';

            Object.keys(data).forEach(day => {
                if (data[day]) {
                    let miniTable = '<table class="table table-bordered table-sm mb-0"><tbody>';
                    let index = 0;
                    data[day].forEach((item) => {
                        if (item.trim() !== "") {
                            miniTable += `<tr>
                                <td>${lecture_time[index] || ''}</td>
                                <td>№${++index}</td>
                                <td>${item}</td>
                            </tr>`;
                        }
                    });
                    miniTable += '</tbody></table>';
                    const scheduleDate = day.split(' ')[1].split('.')[0];
                    const todayDate = formatDate(new Date()).split(' ')[1].split('.')[0];
                    console.log(todayDate)

                    tableContent += `<tr ${scheduleDate === todayDate ? highlighter : ''}><td>${day}</td><td colspan="2">${miniTable}</td></tr>`;
                } else {
                    tableContent += `<tr><td>${day}</td><td colspan="2">Нет расписания</td></tr>`;
                }
            });

            tableContent += '</tbody></table>';
            $(modalId + ' .modal-body').html(tableContent);
        });
    }
});
