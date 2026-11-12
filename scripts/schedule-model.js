// 기존 홈페이지 home.js의 일정 우선순위와 격주 토요일 규칙을 유지합니다.
(function () {
  'use strict';
  function closuresOn(data, date, doctorId = '') {
    return data.closures.filter(row => (!doctorId || row.doctorId === doctorId) && row.startDate <= date && row.endDate >= date);
  }
  function entries(data, date, doctorId = '') {
    const parts = date.split('-').map(Number);
    const weekday = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
    const specific = data.schedules.filter(row => row.date === date);
    const weekly = data.doctors.filter(doctor => {
      const rule = (doctor.weeklySchedules || []).find(row => Number(row.weekday) === weekday);
      const week = Math.floor((parts[2] - 1) / 7) + 1;
      const matchesWeek = weekday !== 6 || !rule || !rule.saturday_weeks || rule.saturday_weeks === 'all' ||
        (rule.saturday_weeks === 'first_third' && [1, 3].includes(week)) ||
        (rule.saturday_weeks === 'second_fourth' && [2, 4].includes(week));
      return doctor.weekdays.includes(weekday) && matchesWeek && !specific.some(row => row.doctorId === doctor.id);
    }).map(doctor => {
      const rule = doctor.weeklySchedules.find(row => Number(row.weekday) === weekday);
      return { doctorId: doctor.id, date, period: rule.period, endTime: rule.end_time };
    });
    return weekly.concat(specific).filter(row => (!doctorId || row.doctorId === doctorId) && !closuresOn(data, date, row.doctorId).length);
  }
  function workHours(entry, date) {
    const holiday = (window.holidayData?.dates || {})[date] || '';
    const substitute = holiday.includes('대체공휴일');
    const morning = !substitute && (Boolean(holiday) || entry.period === 'morning');
    const saturday = new Date(date + 'T12:00:00').getDay() === 6;
    const end = substitute ? '19:00' : entry.endTime || (saturday ? '17:00' : '19:00');
    return { label: morning ? '오전' : '종일', hours: morning ? '08:30 ~ 13:00' : end.slice(0, 5) === '17:00' ? '08:30 ~ 17:00' : '08:30 ~ 19:00' };
  }
  window.ClinicSchedule = { entries, closuresOn, workHours };
}());
