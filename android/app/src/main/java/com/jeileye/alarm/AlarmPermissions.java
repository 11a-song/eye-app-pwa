package com.jeileye.alarm;

import android.Manifest;
import android.app.*;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.os.Build;
import org.json.JSONObject;

final class AlarmPermissions {
    static JSONObject status(Context c){
        JSONObject result=new JSONObject();try{
            AlarmService.channel(c);NotificationManager notifications=c.getSystemService(NotificationManager.class);
            boolean notified=notifications.areNotificationsEnabled()&&(Build.VERSION.SDK_INT<33||c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED);
            NotificationChannel channel=notifications.getNotificationChannel(AlarmStore.CHANNEL);notified=notified&&channel!=null&&channel.getImportance()>=NotificationManager.IMPORTANCE_HIGH;
            boolean exact=Build.VERSION.SDK_INT<31||c.getSystemService(AlarmManager.class).canScheduleExactAlarms();
            boolean full=Build.VERSION.SDK_INT<34||notifications.canUseFullScreenIntent();
            boolean sound=c.getSystemService(AudioManager.class).getStreamVolume(AudioManager.STREAM_ALARM)>0;
            String reason=!notified?"앱 알림과 안약 알람의 팝업 표시를 허용해 주세요.":!exact?"알람 및 리마인더 권한을 허용해 주세요.":!full?"전체 화면 알림 권한을 허용해 주세요.":!sound?"휴대폰 알람 음량을 높여 주세요.":"";
            result.put("ready",notified&&exact&&full&&sound).put("notifications",notified).put("exact",exact).put("fullscreen",full).put("sound",sound).put("reason",reason);
        }catch(Exception ignored){}return result;
    }
}
