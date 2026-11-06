package __PACKAGE__;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;
import android.widget.RemoteViews;

/**
 * Widget de refeição: calorias e macros (proteína, carbo, gordura) já ingeridos hoje,
 * com botões para fotografar o prato (abre o app direto na câmera) e registrar refeição.
 */
public class MealWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c, m, id));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o) {
        m.updateAppWidget(id, build(c, m, id));
    }

    static RemoteViews build(Context c, AppWidgetManager m, int id) {
        return FitWidgets.responsive(c, m, id, "meal", MealWidget::fill);
    }

    static void fill(Context c, RemoteViews v, boolean small) {
        float kcal = FitWidgets.today(c, "kcal");
        float goal = FitWidgets.prefs(c).getFloat("goalKcal", 0f);
        int pct = FitWidgets.pct(kcal, goal);
        if (small) {
            v.setTextViewText(R.id.m_kcal, FitWidgets.fmtInt(kcal));
            v.setTextViewText(R.id.m_goal, goal > 0 ? "/ " + FitWidgets.fmtInt(goal) + " kcal" : "kcal");
        } else {
            v.setTextViewText(R.id.m_phrase, FitWidgets.phrase(c));
            v.setTextViewText(R.id.m_value, FitWidgets.fmtInt(kcal) + (goal > 0 ? " de " + FitWidgets.fmtInt(goal) : "") + " kcal");
        }
        v.setTextViewText(R.id.m_pct, goal > 0 ? (kcal > goal ? "↑ " : "") + Math.round(kcal * 100f / goal) + "%" : "");
        v.setProgressBar(R.id.m_bar, 100, pct, false);
        macro(c, v, small, "p", "Prot", R.id.m_p, R.id.m_pbar);
        macro(c, v, small, "c", "Carbo", R.id.m_c, R.id.m_cbar);
        macro(c, v, small, "f", "Gord", R.id.m_f, R.id.m_fbar);

        PendingIntent open = FitWidgets.openApp(c);
        if (open != null) v.setOnClickPendingIntent(R.id.m_root, open);
        PendingIntent photo = FitWidgets.openAction(c, "meal_photo", 3401);
        PendingIntent add = FitWidgets.openAction(c, "meal_add", 3402);
        if (photo != null) v.setOnClickPendingIntent(R.id.m_photo, photo);
        if (add != null) v.setOnClickPendingIntent(R.id.m_add, add);
    }

    private static void macro(Context c, RemoteViews v, boolean small, String key, String name, int textId, int barId) {
        float val = FitWidgets.today(c, key);
        float goal = FitWidgets.prefs(c).getFloat("goal_" + key, 0f);
        String g = FitWidgets.fmtInt(val);
        if (small) {
            v.setTextViewText(textId, key.toUpperCase() + " " + g + "g");
        } else {
            v.setTextViewText(textId, name + " " + g + (goal > 0 ? "/" + FitWidgets.fmtInt(goal) : "") + "g");
            v.setProgressBar(barId, 100, FitWidgets.pct(val, goal), false);
        }
    }
}
