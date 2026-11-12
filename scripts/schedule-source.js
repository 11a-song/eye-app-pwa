// 원장 일정에 필요한 공개 테이블만 조회합니다. 환자 정보는 조회하지 않습니다.
(function () {
  'use strict';
  window.loadDoctorScheduleData = async function () {
    if(!window.clinicBackend?.url||!window.clinicBackend?.publishableKey)throw new Error('새 프로젝트의 공개 연결 설정을 확인해 주세요.');
    var projectUrl = window.clinicBackend.url;
    // 새 PWA 프로젝트의 공개용 키입니다. 인증 및 환자 정보는 사용하지 않습니다.
    var publishableKey = window.clinicBackend.publishableKey;

    // 날짜별 일정이 늘어나도 기본 조회 건수 제한으로 누락되지 않게 나눠 읽습니다.
    async function readRows(table, columns) {
      var rows = [];
      var size = 1000;
      while (true) {
        var query = new URLSearchParams({ select: columns, order: 'id.asc', offset: String(rows.length), limit: String(size) });
        var response = await fetch(projectUrl + '/rest/v1/' + table + '?' + query, {
          headers: { apikey: publishableKey }, cache: 'no-store', signal: AbortSignal.timeout(15000)
        });
        var payload = await response.json();
        var result = response.ok ? { data: payload } : { error: payload };
        // 종료 시간 SQL 적용 전에도 기존 일정은 계속 표시합니다.
        if (result.error && ['42703', 'PGRST204'].includes(result.error.code) && columns.includes(',end_time')) {
          columns = columns.replace(',end_time', '');
          continue;
        }
        if (result.error && ['42703', 'PGRST204'].includes(result.error.code) && columns.includes(',photo_url')) {
          columns = columns.replace(',photo_url', '');
          continue;
        }
        if (result.error && ['42703', 'PGRST204'].includes(result.error.code) && columns.includes(',saturday_weeks')) {
          columns = columns.replace(',saturday_weeks', '');
          continue;
        }
        if (result.error) throw result.error;
        if (!Array.isArray(result.data)) throw new Error('일정 조회 결과를 확인할 수 없습니다.');
        rows = rows.concat(result.data);
        if (result.data.length < size) return rows;
      }
    }
    var result = await Promise.all([
      readRows('doctors', 'id,name,initial,color,photo_url'),
      readRows('doctor_weekly_schedules', 'id,doctor_id,weekday,period,end_time,saturday_weeks'),
      readRows('doctor_date_schedules', 'id,doctor_id,schedule_date,period,end_time'),
      readRows('doctor_closures', 'id,doctor_id,start_date,end_date'),
      // 진료시간 테이블이 아직 없는 환경에서도 원장별 일정 조회는 유지합니다.
      readRows('clinic_hours', 'id,start_time,end_time').catch(function () { return []; })
    ]);
    // 기존 달력의 표시 형태로 변환하여 디자인과 근무 구분을 유지합니다.
    var doctors = result[0].map(function (doctor) {
      var weekly = result[1].filter(function (row) { return String(row.doctor_id) === String(doctor.id); });
      return {
        id: String(doctor.id), name: doctor.name, initial: doctor.initial, color: doctor.color, photoUrl: doctor.photo_url,
        weeklySchedules: weekly, weekdays: weekly.map(function (row) { return Number(row.weekday); }),
        morningOnly: weekly.filter(function (row) { return row.period === 'morning'; })
          .map(function (row) { return Number(row.weekday); })
      };
    });
    var schedules = result[2].filter(function (row) {
      return doctors.some(function (doctor) { return doctor.id === String(row.doctor_id); });
    }).map(function (row) {
      return {
        doctorId: String(row.doctor_id), date: row.schedule_date, period: row.period, endTime: row.end_time,
        time: row.period === 'morning' ? '오전 진료' : '종일 진료'
      };
    });
    var closures = result[3].map(function (row) {
      var doctor = doctors.find(function (item) { return item.id === String(row.doctor_id); });
      return doctor ? { doctorId: doctor.id, doctorName: doctor.name, startDate: row.start_date, endDate: row.end_date } : null;
    }).filter(Boolean);
    return { doctors: doctors, schedules: schedules, closures: closures, clinicHours: result[4] };
  };
}());
