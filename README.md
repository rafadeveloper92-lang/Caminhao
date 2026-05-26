# Controle de Viagens

Aplicativo **100% offline** para registrar obras, viagens (limpeza/entrega), conclusões e locais favoritos (armazém/casa). Os dados ficam no dispositivo com **SQLite nativo** no Android (via Capacitor) e com **SQLite no navegador** (jeep-sqlite + sql.js) para desenvolvimento web.

Não há integração com Gemini, Supabase ou outras APIs na aplicação.

## Desenvolvimento web

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal. Na primeira execução o `postinstall` copia `sql-wasm.wasm` para `public/assets/`.

## Build Android (APK)

Pré-requisitos: **Node.js**, **Android Studio** (SDK + JDK que o Studio gerenciar).

```bash
npm install
npm run build
npx cap add android   # só na primeira vez
npm run android:build
```

Depois abra o projeto Android e gere o APK:

```bash
npm run android:open
```

No Android Studio use **Build → Build Bundle(s) / APK(s) → Build APK(s)**. O APK de debug costuma ficar em `android/app/build/outputs/apk/debug/`.

### Permissões úteis

- **Localização**: o app usa `navigator.geolocation` / APIs nativas para gravar coordenadas. No Android, conceda permissão de localização ao app nas configurações do sistema.

## Estrutura de dados (SQLite)

Tabelas: `works`, `trips`, `completions`, `settings`. O ficheiro da base no Android é gerido pelo plugin `@capacitor-community/sqlite` (sem envio para a nuvem).
