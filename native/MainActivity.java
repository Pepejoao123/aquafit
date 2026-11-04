package __PACKAGE__;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RestTimerPlugin.class); // plugin local (notificação com contagem regressiva)
        super.onCreate(savedInstanceState);
    }
}
