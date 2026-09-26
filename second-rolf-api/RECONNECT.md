# Connection isolation and recovery

`local/connection.mjs` owns the relay connection lifecycle. Each socket has its own heartbeat, readiness, acknowledgement deadline, cancellation signal and timer. Results are accepted only by the socket that initiated them. The production wrapper still uses `ws` and the existing pinned Bonsai model client.

Late probes, close events and replies from a disconnected socket cannot change its replacement. A hung probe no longer disables the transport watchdog. A slow warmup keeps the relay connection alive while explicitly reporting that inference is unavailable. Warmup and visitor inference share one global GPU slot. An old inference retains that slot until it settles, even after cancellation; this deliberately fails closed if a runner ignores cancellation.

No change to the fixed loopback ports, saved process identity, GPU evidence, exact model/profile checks, API credentials, local-only routing, public/private separation, or Windows supervisor configuration. No automatic cloud fallback. Logs contain status only, not conversations or credentials.

Verification: `node --test tests/reconnect.node.mjs` covers stale health, old close/cancel events, warmup contention, hung-probe watchdog, shutdown/malformed messages, and a disconnected job that ignores cancellation. The full `npm test` suite retains the existing model, privacy, relay and UI checks. These are synthetic network/runtime tests, not evidence of live Windows/GPU readiness. The Windows connector must be updated and restarted before these source changes affect the public application.
