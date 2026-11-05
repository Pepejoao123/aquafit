package __PACKAGE__;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

/** Widget de descanso: frase do dia, contagem regressiva ao vivo e botões 1:00 / 1:30 / 2:00 / parar. */
public class RestWidget extends AppWidgetProvider {

    static final String ACTION_START = "com.fitpro.widget.REST_START";
    static final String ACTION_STOP = "com.fitpro.widget.REST_STOP";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    @Override
    public void onReceive(Context c, Intent i) {
        super.onReceive(c, i);
        if (ACTION_START.equals(i.getAction())) FitWidgets.startRest(c, i.getIntExtra("sec", 90));
        else if (ACTION_STOP.equals(i.getAction())) FitWidgets.stopRest(c);
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_rest);
        SharedPreferences p = FitWidgets.prefs(c);
        long now = System.currentTimeMillis();
        long end = p.getLong("restEnd", 0), paused = p.getLong("restPausedMs", 0);
        v.setTextViewText(R.id.r_phrase, FitWidgets.phrase(c));
        if (end > now) {
            v.setViewVisibility(R.id.r_chrono, View.VISIBLE);
            v.setViewVisibility(R.id.r_idle, View.GONE);
            v.setChronometer(R.id.r_chrono, SystemClock.elapsedRealtime() + (end - now), null, true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) v.setChronometerCountDown(R.id.r_chrono, true);
            v.setTextViewText(R.id.r_label, "DESCANSANDO");
        } else {
            v.setChronometer(R.id.r_chrono, SystemClock.elapsedRealtime(), null, false);
            v.setViewVisibility(R.id.r_chrono, View.GONE);
            v.setViewVisibility(R.id.r_idle, View.VISIBLE);
            if (paused > 0) {
                v.setTextViewText(R.id.r_label, "DESCANSO PAUSADO");
                v.setTextViewText(R.id.r_idle, "⏸ " + FitWidgets.fmtSec(paused));
            } else {
                boolean justDone = now - p.getLong("restDoneAt", 0) < 60000;
                v.setTextViewText(R.id.r_label, "DESCANSO");
                v.setTextViewText(R.id.r_idle, justDone ? "Bora! 💪" : "Pronto para a série");
            }
        }
        if (FitWidgets.openApp(c) != null) v.setOnClickPendingIntent(R.id.r_root, FitWidgets.openApp(c));
        v.setOnClickPendingIntent(R.id.r_60, FitWidgets.broadcast(c, RestWidget.class, ACTION_START, 60, "sec", 60));
        v.setOnClickPendingIntent(R.id.r_90, FitWidgets.broadcast(c, RestWidget.class, ACTION_START, 90, "sec", 90));
        v.setOnClickPendingIntent(R.id.r_120, FitWidgets.broadcast(c, RestWidget.class, ACTION_START, 120, "sec", 120));
        v.setOnClickPendingIntent(R.id.r_stop, FitWidgets.broadcast(c, RestWidget.class, ACTION_STOP, 999, "sec", 0));
        return v;
    }
}
