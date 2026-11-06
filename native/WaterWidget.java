package __PACKAGE__;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.RemoteViews;

/** Widget de hidratação: frase do dia, total de hoje com barra e botões +250/+500 ml (2x2 ou maior). */
public class WaterWidget extends AppWidgetProvider {

    static final String ACTION_ADD = "com.fitpro.widget.ADD_WATER";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c, m, id));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o) {
        m.updateAppWidget(id, build(c, m, id)); // redimensionado: troca entre compacto e largo
    }

    @Override
    public void onReceive(Context c, Intent i) {
        super.onReceive(c, i);
        if (ACTION_ADD.equals(i.getAction())) {
            FitWidgets.addWater(c, i.getIntExtra("ml", 250));
            FitWidgets.updateAll(c);
        }
    }

    static RemoteViews build(Context c, AppWidgetManager m, int id) {
        return FitWidgets.responsive(c, m, id, "water", WaterWidget::fill);
    }

    static void fill(Context c, RemoteViews v, boolean small) {
        int ml = FitWidgets.waterToday(c);
        int goal = Math.max(1, FitWidgets.prefs(c).getInt("goalMl", 2500));
        int pct = Math.min(100, Math.round(ml * 100f / goal));
        if (small) {
            v.setTextViewText(R.id.w_value, FitWidgets.fmtMl(ml));
            v.setTextViewText(R.id.w_goal, "de " + FitWidgets.fmtMl(goal));
        } else {
            v.setTextViewText(R.id.w_phrase, FitWidgets.phrase(c));
            v.setTextViewText(R.id.w_value, FitWidgets.fmtMl(ml) + " de " + FitWidgets.fmtMl(goal));
        }
        v.setTextViewText(R.id.w_pct, (ml >= goal ? "✓ " : "") + pct + "%");
        v.setProgressBar(R.id.w_bar, 100, pct, false);
        if (FitWidgets.openApp(c) != null) v.setOnClickPendingIntent(R.id.w_root, FitWidgets.openApp(c));
        v.setOnClickPendingIntent(R.id.w_add250, FitWidgets.broadcast(c, WaterWidget.class, ACTION_ADD, 250, "ml", 250));
        v.setOnClickPendingIntent(R.id.w_add500, FitWidgets.broadcast(c, WaterWidget.class, ACTION_ADD, 500, "ml", 500));
    }
}
