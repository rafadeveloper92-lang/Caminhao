# RotaCam

App **offline** para **motoristas e obras**: regista viagens (limpeza / entrega), localizações, relatórios e cópias de segurança. Os dados ficam em **SQLite** no telemóvel (Android via Capacitor) e no **navegador** com jeep-sqlite para desenvolvimento.

## Marca e identidade

- Nome: **RotaCam** (rotas + camião).
- Ícones gerados a partir de `public/brand/rota-cam.svg` (`npm run gen:icons`).
- Sons: confirmação ao registar uma viagem (Web Audio); pode desativar em **Definições**.

## Desenvolvimento web

```bash
npm install
npm run dev
```

## Build Android (APK)

```bash
npm run build
npm run android:build
npm run android:open
```

No Android Studio: **Build → Build APK(s)**.

## Cópia de segurança

Em **Definições**, exporta ou importa um ficheiro **JSON** com obras, viagens e definições (fica só no dispositivo).

## Licenças / notas

O plugin `@capacitor-community/sqlite` usa SQLCipher na stack nativa; mantivemos a base **sem encriptação** na configuração por simplicidade. Consulta a documentação do plugin se precisares de encriptação.
