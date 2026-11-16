package com.jeileye.alarm;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.media.*;
import android.net.Uri;
import android.os.*;

public class AlarmService extends Service {
    static final int ID=100;static final String STOP="stop";
    private MediaPlayer player;private Vibrator vibrator;private PowerManager.WakeLock wake;
    private final Handler handler=new Handler(Looper.getMainLooper());
    static void channel(Context c){
        NotificationChannel channel=new NotificationChannel(AlarmStore.CHANNEL,"안약 시간 알람",NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("예약한 안약 시간에 화면과 소리로 알려줍니다.");channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        // The foreground service plays the alarm stream until stopped, avoiding a double sound.
        channel.setSound(null,null);channel.enableVibration(false);
        c.getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }
    static PendingIntent screen(Context c,Intent intent,int id){
        ActivityOptions options=ActivityOptions.makeBasic();
        if(Build.VERSION.SDK_INT>=36)options.setPendingIntentCreatorBackgroundActivityStartMode(ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOW_ALWAYS);
        else if(Build.VERSION.SDK_INT>=35)options.setPendingIntentCreatorBackgroundActivityStartMode(ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED);
        return PendingIntent.getActivity(c,id,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE,options.toBundle());
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent==null||STOP.equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
        String plan=intent.getStringExtra("plan");boolean test=intent.getBooleanExtra("test",false);
        channel(this);Intent activity=new Intent(this,AlarmActivity.class).putExtra("plan",plan).putExtra("test",test).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent full=screen(this,activity,1),stop=PendingIntent.getService(this,2,new Intent(this,AlarmService.class).setAction(STOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification notification=new Notification.Builder(this,AlarmStore.CHANNEL).setSmallIcon(com.jeileye.alarm.R.drawable.ic_alarm)
            .setContentTitle(test?"안약 알람 테스트":"안약을 넣을 시간입니다")
            .setContentText("안약을 사용한 뒤 앱에서 체크해 주세요.").setCategory(Notification.CATEGORY_ALARM)
            .setVisibility(Notification.VISIBILITY_PUBLIC).setOngoing(true).setContentIntent(full).setFullScreenIntent(full,true)
            .addAction(new Notification.Action.Builder(null,"알람 끄기",stop).build()).build();
        if(Build.VERSION.SDK_INT>=29)startForeground(ID,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);else startForeground(ID,notification);
        AlarmStore.prefs(this).edit().putString("ringing",plan==null?"test":plan).apply();
        stopAudio();wake=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"jeileye:alarm");wake.acquire(130000);
        try{
            Uri sound=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);if(sound==null)sound=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            player=new MediaPlayer();player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            player.setDataSource(this,sound);player.setLooping(true);player.prepare();player.start();
        }catch(Exception ignored){/* The notification remains visible if the device has no alarm sound. */}
        vibrator=getSystemService(Vibrator.class);if(vibrator!=null)vibrator.vibrate(VibrationEffect.createWaveform(new long[]{0,600,300,600,900},0));
        handler.removeCallbacksAndMessages(null);handler.postDelayed(this::stopSelf,120000);
        return START_NOT_STICKY;
    }
    private void stopAudio(){if(player!=null){try{player.stop();}catch(Exception ignored){}player.release();player=null;}if(vibrator!=null)vibrator.cancel();if(wake!=null&&wake.isHeld())wake.release();}
    @Override public void onDestroy(){handler.removeCallbacksAndMessages(null);stopAudio();AlarmStore.prefs(this).edit().remove("ringing").apply();AlarmActivity.finishActive();stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();}
    @Override public IBinder onBind(Intent intent){return null;}
}
