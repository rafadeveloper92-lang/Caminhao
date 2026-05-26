# RotaCam

App **offline** para **motoristas e obras**: regista viagens (limpeza / entrega), localizações, **lojas onde compras materiais**, relatórios e cópias de segurança. Os dados ficam em **SQLite** no telemóvel (Android via Capacitor) e no **navegador** com jeep-sqlite para desenvolvimento.

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

## Lojas

Em **Definições → Lojas e fornecedores** cadastras lojas, podes adicionar **notas**, **gravar a localização** e abrir **navegação** (como para armazém/casa).

## Cópia de segurança

Em **Definições**, exporta ou importa um ficheiro **JSON** com obras, viagens, **lojas** e definições (fica só no dispositivo). Backups antigos (`schemaVersion: 1`) continuam a ser aceites.

## Licenças / notas

O plugin `@capacitor-community/sqlite` usa SQLCipher na stack nativa; mantivemos a base **sem encriptação** na configuração por simplicidade. Consulta a documentação do plugin se precisares de encriptação.
