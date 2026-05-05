# Croatia Trip HQ

Small Node app for the Korčula / Croatia friend trip hub.

## Local run

```bash
npm install
npm start
```

Then open:

```text
http://127.0.0.1:8787/
```

## Production deploy

Render web service settings:

```text
Build command: npm install
Start command: npm start
DATA_PATH=/var/data/trip-data.json
Persistent disk mount path: /var/data
```

The included `render.yaml` captures the same settings for Render blueprint deploys.

## Privacy

The app is intentionally trust-based for a small friend group. Anyone with the link can choose a name and update that person’s flight info.

Do not commit private invite token files or secrets.
