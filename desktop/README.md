# ПВ-Система Доступ — сборка десктоп-версии (Windows)

Готовая программа: `PVSDOST.exe`. Папка установки: `C:\PVSDOST`.
Внутри exe — интерфейс на WebView2 (тот же, что и в вебе), рядом папка `web` с файлами интерфейса.

## Что нужно установить на компьютере для сборки
1. **Node.js LTS** — https://nodejs.org
2. **.NET 8 SDK** (именно SDK, не только Runtime) — https://dotnet.microsoft.com/download/dotnet/8.0
3. Только для установщика: **Inno Setup 6** — https://jrsoftware.org/isdl.php

## Как собрать
Скопируйте **весь проект** на Windows-ПК (не только папку `desktop`) и запустите:

```
desktop\csharp\build.bat
```

Результат появится в `desktop\csharp\dist\`:
- `PVSDOST.exe` — сама программа
- `web\` — файлы интерфейса
- `app_version.txt`

### Варианты запуска
- `build.bat` — просто собрать
- `build.bat noobf` — собрать без обфускации (если нет интернета для загрузки Obfuscar)
- `build.bat install` — собрать и установить в `C:\PVSDOST` с ярлыками (запускать «от имени администратора»)
- `build.bat installer` — собрать один файл-установщик `PVSDOST-Setup-<версия>.exe`

## Версия
Меняется вручную в файле `desktop\APP_VERSION` (формат `1.0.0`). Авто-инкремента нет.

## Иконка
Скрипт берёт `public\favicon.ico`. Если файла нет — соберётся со стандартной иконкой.
Чтобы задать свою иконку, положите `favicon.ico` в папку `public`.
