import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { AGENT_URL, AUTH_URL, getToken } from '@/lib/api';

const endpoints = [
  ['POST', `${AUTH_URL}?action=login`, 'Вход, возвращает token для заголовка X-Auth-Token'],
  ['POST', `${AGENT_URL}?action=register_device`, 'Регистрация компьютера, выдаёт постоянный ID доступа'],
  ['POST', `${AGENT_URL}?action=heartbeat`, 'Раз в 20 сек: статус «в сети» + ожидающий сеанс'],
  ['POST', `${AGENT_URL}?action=create_session`, 'Создать сеанс: код, одноразовый пароль, адрес канала'],
  ['POST', `${AGENT_URL}?action=update_session`, 'Статус сеанса: active / closed / rejected'],
  ['POST', `${AGENT_URL}?action=set_offline`, 'Клиент закрывается — пометить устройство офлайн'],
  ['POST', `${AGENT_URL}?action=send_message`, 'Сообщение в чат сеанса (сторона operator или client)'],
  ['GET', `${AGENT_URL}?action=messages&session_id=1`, 'История чата по сеансу'],
  ['POST', `${AGENT_URL}?action=log_transfer`, 'Отметить переданный файл в истории'],
  ['POST', `${AGENT_URL}?action=update_device`, 'Имя, заметка, группа, избранное, режим без подтверждения'],
  ['POST', `${AGENT_URL}?action=wake_device`, 'Wake-on-LAN: включить компьютер по сети'],
  ['GET', `${AGENT_URL}?action=overview`, 'Устройства, сеансы, журнал и сводка для консоли'],
];

const csharp = `using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

public class PvAccessClient
{
    private const string AuthUrl  = "${AUTH_URL}";
    private const string AgentUrl = "${AGENT_URL}";

    private readonly HttpClient _http = new HttpClient();
    private string _token = "";

    public async Task LoginAsync(string email, string password)
    {
        var body = JsonSerializer.Serialize(new { email, password });
        var res  = await _http.PostAsync($"{AuthUrl}?action=login",
                       new StringContent(body, Encoding.UTF8, "application/json"));
        var json = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        _token   = json.RootElement.GetProperty("token").GetString()!;
        _http.DefaultRequestHeaders.Remove("X-Auth-Token");
        _http.DefaultRequestHeaders.Add("X-Auth-Token", _token);
    }

    public async Task<string> RegisterDeviceAsync()
    {
        var payload = new
        {
            device_uid  = GetMachineUid(),
            name        = Environment.MachineName,
            os          = "Windows",
            os_version  = Environment.OSVersion.VersionString,
            app_version = "1.0.0",
            local_ip    = GetLocalIp(),
            unattended  = true
        };
        var res = await PostAsync("register_device", payload);
        return res.RootElement.GetProperty("device").GetProperty("access_id").GetString()!;
    }

    public async Task HeartbeatLoopAsync(string deviceUid, CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            var res = await PostAsync("heartbeat", new { device_uid = deviceUid });
            if (res.RootElement.TryGetProperty("pending_session", out var s) &&
                s.ValueKind == JsonValueKind.Object)
            {
                ShowIncomingRequest(s.GetProperty("session_code").GetString()!,
                                    s.GetProperty("operator_name").GetString()!);
            }
            await Task.Delay(TimeSpan.FromSeconds(20), ct);
        }
    }

    private async Task<JsonDocument> PostAsync(string action, object payload)
    {
        var body = JsonSerializer.Serialize(payload);
        var res  = await _http.PostAsync($"{AgentUrl}?action={action}",
                       new StringContent(body, Encoding.UTF8, "application/json"));
        return JsonDocument.Parse(await res.Content.ReadAsStringAsync());
    }
}`;

const ApiTab = () => {
  const [copied, setCopied] = useState('');
  const token = getToken();

  const copy = (value: string, key: string) => {
    navigator.clipboard?.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 1600);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[22px] border border-border bg-background p-7">
        <h2 className="text-[1.2rem] font-bold">Серверный API для клиента на C#</h2>
        <p className="mt-2 max-w-[760px] text-[0.94rem] text-muted-foreground">
          Десктоп-клиент (WPF или WinForms) работает с этим API: авторизуется, регистрирует компьютер,
          шлёт heartbeat и получает входящие запросы на сеанс. Передача экрана идёт напрямую через канал
          из ответа сервера.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-secondary px-5 py-4">
          <span className="text-[0.85rem] font-medium text-muted-foreground">Ваш токен доступа</span>
          <code className="max-w-full flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[0.85rem] text-foreground">
            {token ? `${token.slice(0, 24)}…` : '—'}
          </code>
          <button
            type="button"
            onClick={() => copy(token, 'token')}
            className="inline-flex items-center gap-2 rounded-pill border border-border bg-background px-4 py-2.5 text-[0.85rem] font-semibold leading-none hover:border-primary hover:text-primary"
          >
            <Icon name={copied === 'token' ? 'Check' : 'Copy'} size={15} /> Скопировать
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-border bg-background">
        <header className="border-b border-border px-6 py-5">
          <h3 className="text-[1.1rem] font-bold">Точки входа</h3>
        </header>
        <ul className="divide-y divide-border">
          {endpoints.map(([method, url, desc]) => (
            <li key={url as string} className="flex flex-wrap items-center gap-4 px-6 py-4">
              <span
                className={`rounded-lg px-2.5 py-1.5 font-mono text-[0.75rem] font-bold ${
                  method === 'GET' ? 'bg-secondary text-foreground' : 'bg-primary/10 text-primary'
                }`}
              >
                {method}
              </span>
              <code className="min-w-[240px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[0.83rem] text-foreground">
                {url}
              </code>
              <span className="w-full text-[0.86rem] text-muted-foreground lg:w-auto lg:max-w-[340px]">{desc}</span>
              <button
                type="button"
                onClick={() => copy(url as string, url as string)}
                className="text-muted-foreground transition-colors hover:text-primary"
                aria-label="Скопировать адрес"
              >
                <Icon name={copied === url ? 'Check' : 'Copy'} size={16} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-border bg-background">
        <header className="flex items-center gap-3 border-b border-border px-6 py-5">
          <h3 className="text-[1.1rem] font-bold">Заготовка клиента на C#</h3>
          <button
            type="button"
            onClick={() => copy(csharp, 'code')}
            className="ml-auto inline-flex items-center gap-2 rounded-pill border border-border px-4 py-2.5 text-[0.85rem] font-semibold leading-none hover:border-primary hover:text-primary"
          >
            <Icon name={copied === 'code' ? 'Check' : 'Copy'} size={15} /> Скопировать код
          </button>
        </header>
        <pre className="max-h-[520px] overflow-auto bg-foreground/[0.03] p-6 font-mono text-[0.8rem] leading-[1.65] text-foreground">
          {csharp}
        </pre>
      </section>
    </div>
  );
};

export default ApiTab;