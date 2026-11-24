package com.jeileye.alarm;

import android.app.*;
import android.content.*;
import org.json.*;
import java.text.SimpleDateFormat;
import java.util.*;

/** Quiet reservation status, separate from the ringing alarm notification. */
final class AlarmStatusNotification {
    static final int ID=101;
    static final String CHANNEL="eye_drop_schedule_status_v1";
    static void update(Context context,JSONArray jobs){
        NotificationManager manager=context.getSystemService(NotificationManager.class);
        JSONObject next=null;int count=0;long now=System.currentTimeMillis();
        for(int i=0;i<jobs.length();i++){
            JSONObject job=jobs.optJSONObject(i);if(job==null||AlarmStore.time(job)<=now)continue;
            count++;if(next==null||AlarmStore.time(job)<AlarmStore.time(next))next=job;
        }
        if(next==null){manager.cancel(ID);return;}
        if(android.os.Build.VERSION.SDK_INT>=33&&context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)return;
        NotificationChannel channel=new NotificationChannel(CHANNEL,"안약 알림 설정 상태",NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("저장한 안약 알림과 다음 알림 시간을 표시합니다.");channel.setShowBadge(false);channel.setSound(null,null);
        manager.createNotificationChannel(channel);
        String when=new SimpleDateFormat("M월 d일 a h:mm",Locale.KOREAN).format(new Date(AlarmStore.time(next)));
        Intent intent=new Intent(context,MainActivity.class).putExtra("plan",next.optString("plan_id")).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent open=PendingIntent.getActivity(context,ID,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification notification=new Notification.Builder(context,CHANNEL).setSmallIcon(com.jeileye.alarm.R.drawable.ic_alarm)
            .setContentTitle("안약 알림이 설정되었습니다")
            .setContentText("다음 알림: "+when+" · 남은 알림 "+count+"회")
            .setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true).setShowWhen(false)
            .setCategory(Notification.CATEGORY_REMINDER).setVisibility(Notification.VISIBILITY_PRIVATE).build();
        try{manager.notify(ID,notification);}catch(SecurityException ignored){/* Respect notification permission. */}
    }
}
