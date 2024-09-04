$(document).ready(function () {
    // Инициализация Selectize
    $('#select-state').selectize({
        sortField: 'text'
    });

    // Загрузка данных из JSON файла
    $.getJSON('schedule.json', function(data) {
        var select = $('#select-state')[0].selectize;
        select.clearOptions(); // Очистить существующие опции
        select.addOption({ value: '', text: 'Выберите группу' });
        select.addOption({ value: '5', text: '5 подгруппа' });
        select.addOption({ value: '6', text: '6 подгруппа (пока недоступна)' });

        // Установить выбранное значение по умолчанию
        select.setValue('5');
    });

    // Устанавливаем текущую дату и определяем, какая неделя (верхняя или нижняя)
    function updateDateInfo() {
        const today = new Date();
        const dateInfo = formatDate(today);
        $('#today-date').text('Сегодня: ' + dateInfo);
    }

    // Форматирование даты в формате "Вторник, 03.09.2024. Верхняя неделя"
    function formatDate(date) {
        const daysOfWeek = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
        const dayNames = ["Верхняя", "Нижняя"];

        const day = date.getDate();
        const month = date.getMonth() + 1; // Месяцы с 0 до 11
        const year = date.getFullYear();
        const dayOfWeek = daysOfWeek[date.getDay()];

        // Определение недели (верхняя или нижняя)
        const weekOfMonth = Math.ceil(day / 7);
        const weekType = (weekOfMonth % 2 === 1) ? dayNames[0] : dayNames[1];

        // Форматирование даты
        const formattedDate = `${dayOfWeek}, ${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}. ${weekType} неделя`;
        return formattedDate;
    }

    updateDateInfo();

    function generateScheduleTable(scheduleItems) {
        let tableHtml = '<table class="table table-bordered"><thead><tr><th>#</th><th>Предмет</th><th>Препод</th><th>Кабинет</th></tr></thead><tbody>';
        scheduleItems.forEach((item, index) => {

            let subject_line = item.split('\n');
            let subject = subject_line[0] === undefined ? '&nbsp' : subject_line[0];
            let teacher = subject_line[1] === undefined ? '&nbsp' : subject_line[1];
            let room = subject_line[2] === undefined ? '&nbsp' : subject_line[2];

            if (item.toLowerCase().includes('онлайн')) {
                tableHtml += `<tr><td class="online-highlight">${index + 1}</td>
                                <td class="online-highlight">${subject}</td>
                                <td class="online-highlight">${teacher}</td>
                                <td class="online-highlight">${room}</td></tr>`;
            } else if (item.toLowerCase().includes('лекция')) {
                tableHtml += `<tr><td class="lecture-highlight">${index + 1}</td>
                                <td class="lecture-highlight">${subject}</td>
                                <td class="lecture-highlight">${teacher}</td>
                                <td class="lecture-highlight">${room}</td></tr>`;
            } else {
                tableHtml += `<tr><td>${index + 1}</td><td>${subject}</td><td>${teacher}</td><td>${room}</td></tr>`;
            }
        });
        tableHtml += '</tbody></table>';
        return tableHtml;
    }

    // Функция для загрузки расписания и отображения в модальном окне
    function loadSchedule(modalId, key) {
        $.getJSON('schedule.json', function(data) {
            if (data[key]) {
                var scheduleHtml = generateScheduleTable(data[key]);
                $(modalId + ' .modal-body').html(scheduleHtml);
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

    // Обновленная функция для загрузки расписания на неделю с вложенными таблицами
    function loadWeekSchedule(modalId) {
        $.getJSON('schedule.json', function(data) {
            let tableContent = '<table class="table table-bordered"><thead><tr><th>День недели</th><th>Расписание</th></tr></thead><tbody>';
            const daysOfWeek = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

            daysOfWeek.forEach(day => {
                if (data[day]) {
                    let miniTable = '<table class="table table-bordered table-sm mb-0"><tbody>';
                    data[day].forEach(item => {
                        if (item.trim() !== "") {
                            const parts = item.split('\n');
                            miniTable += `<tr>
                                <td>${parts[0] || ''}</td>
                                <td>${parts[1] || ''}</td>
                                <td>${parts[2] || ''}</td>
                                <td>${parts[3] || ''}</td>
                            </tr>`;
                        }
                    });
                    miniTable += '</tbody></table>';
                    tableContent += `<tr><td>${day}</td><td>${miniTable}</td></tr>`;
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

    $('#nextWeekModal').on('show.bs.modal', function () {
        const today = new Date();
        const nextWeekStart = getNextWeekStart(today);
        const weekStart = getWeekRange(nextWeekStart);
        const weekKey = `${weekStart.start} - ${weekStart.end}`;
        loadSchedule('#nextWeekModal', weekKey);
    });

    // Получение диапазона текущей недели
    function getWeekRange(date) {
        const start = new Date(date);
        start.setDate(date.getDate() - date.getDay() + 1); // Пн - начало недели

        const end = new Date(start);
        end.setDate(start.getDate() + 6); // Вс - конец недели

        return {
            start: start.toLocaleDateString('ru-RU'),
            end: end.toLocaleDateString('ru-RU')
        };
    }

    // Получение начала следующей недели
    function getNextWeekStart(date) {
        const nextWeek = new Date(date);
        nextWeek.setDate(date.getDate() + 7 - date.getDay() + 1); // Пн следующей недели
        return nextWeek;
    }
});
