## Contrato de sincronización (Outbox)

Endpoint: POST /api/sync/events

Request:
- deviceId: string
- events: [{ event_id, event_type, payload, createdAt }]

Response:
- accepted: event_id[]
- duplicated: event_id[]
- errored: event_id[]

Notas:
- event_id es idempotente. Duplicados deben ser ignorados por el servidor.
- En el MVP este endpoint es solo placeholder.
