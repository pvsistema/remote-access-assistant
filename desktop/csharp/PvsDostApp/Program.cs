using System;
using System.IO;
using System.Threading;
using System.Windows.Forms;

namespace PvsDost;

// Entry point for "ПВ-Система Доступ" desktop host (PVSDOST.exe).
// Hosts the web interface (packed in the "web" folder next to the exe)
// inside a WebView2 window. All app logic lives in the web bundle.
internal static class Program
{
    private const string AppName = "ПВ-Система Доступ";

    [STAThread]
    private static void Main()
    {
        // Only one running copy at a time.
        using var mutex = new Mutex(true, "PVSDOST_SingleInstance", out bool createdNew);
        if (!createdNew)
        {
            MessageBox.Show("Программа уже запущена.", AppName,
                MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);

        try
        {
            Application.Run(new MainForm());
        }
        catch (Exception ex)
        {
            var log = Path.Combine(AppContext.BaseDirectory, "crash.log");
            try { File.AppendAllText(log, $"{DateTime.Now:O}\t{ex}\n"); } catch { /* ignore */ }
            MessageBox.Show(
                "Не удалось запустить программу.\n\n" + ex.Message +
                "\n\nВозможно, не установлен компонент Microsoft WebView2.",
                AppName, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
