package com.jeileye.alarm;

import android.content.*;
import org.json.JSONObject;

public class AlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent){
        if(!AlarmStore.FIRE.equals(intent.getAction())){AlarmStore.restore(context);return;}
        try{
            if(intent.getData()==null)return;
            JSONObject job=AlarmStore.consume(context,intent.getData().getLastPathSegment());
            if(job==null||System.currentTimeMillis()-AlarmStore.time(job)>600000)return;
            if(!AlarmPermissions.status(context).optBoolean("ready"))return;
            context.startForegroundService(new Intent(context,AlarmService.class).putExtra("plan",job.getString("plan_id")).putExtra("test",job.optBoolean("test")));
        }catch(Exception ignored){/* Revoked permissions are reported next time the app opens. */}
    }
}
