package __PACKAGE__;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

/** Disparado no fim do descanso: avisa (se iniciado pelo widget) e atualiza os widgets. */
public class RestAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        SharedPreferences p = FitWidgets.prefs(c);
        long end = p.getLong("restEnd", 0), now = System.currentTimeMillis();
        if (end == 0 || now < end - 2000) { FitWidgets.updateAll(c); return; } // alarme antigo/remarcado
        boolean fromWidget = p.getBoolean("restFromWidget", false);
        p.edit().putLong("restEnd", 0).putLong("restDoneAt", now).putBoolean("restFromWidget", false).apply();
        if (fromWidget) {
            RestTimerPlugin.cancel(c);
            FitWidgets.notifyRestDone(c);
        }
        FitWidgets.updateAll(c);
    }
}
