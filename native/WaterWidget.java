package __PACKAGE__;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/** Widget de hidratação: frase do dia, total de hoje com barra e botões +250/+500 ml. */
public class WaterWidget extends AppWidgetProvider {

    static final String ACTION_ADD = "com.fitpro.widget.ADD_WATER";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    @Override
    public void onReceive(Context c, Intent i) {
        super.onReceive(c, i);
        if (ACTION_ADD.equals(i.getAction())) {
            FitWidgets.addWater(c, i.getIntExtra("ml", 250));
            FitWidgets.updateAll(c);
        }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_water);
        int ml = FitWidgets.waterToday(c);
        int goal = Math.max(1, FitWidgets.prefs(c).getInt("goalMl", 2500));
        int pct = Math.min(100, Math.round(ml * 100f / goal));
        v.setTextViewText(R.id.w_phrase, FitWidgets.phrase(c));
        v.setTextViewText(R.id.w_value, FitWidgets.fmtMl(ml) + " de " + FitWidgets.fmtMl(goal));
        v.setTextViewText(R.id.w_pct, (ml >= goal ? "✓ " : "") + pct + "%");
        v.setProgressBar(R.id.w_bar, 100, pct, false);
        if (FitWidgets.openApp(c) != null) v.setOnClickPendingIntent(R.id.w_root, FitWidgets.openApp(c));
        v.setOnClickPendingIntent(R.id.w_add250, FitWidgets.broadcast(c, WaterWidget.class, ACTION_ADD, 250, "ml", 250));
        v.setOnClickPendingIntent(R.id.w_add500, FitWidgets.broadcast(c, WaterWidget.class, ACTION_ADD, 500, "ml", 500));
        return v;
    }
}
