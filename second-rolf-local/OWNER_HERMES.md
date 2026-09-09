# Full Hermes belongs to the authenticated owner, not the public chat

Status: **not activated on Rolf's PC in this session**. Existing local installations, model runtime, owner messaging ID and Docker/GPU readiness have not been verified. No private credentials or memories have been copied. This is an activation runbook, not a claim of completed setup.

## Capability boundary

The owner agent may code, run commands, manage a private workspace, use approved browser/research tools, remember owner-approved information and run explicitly authorized schedules. These capabilities must remain in a separate OS account and preferably a VM or dedicated sandbox. Public users get none of them. Model weights may be reused; credentials, sessions, memory and access to tools must not be shared.

Do not grant Windows administrator access, mount your normal home, employer drives or Docker socket, disable security software, use --privileged/host networking, or publish an owner-agent API. Keep Rolf's existing firewall policies. Permit GitHub writes only to the intended portfolio repository, using least-privilege credentials; no unattended merge to main. External messages, purchases, destructive edits, security changes and new external integrations require owner review. No new schedules are created by this package.

## Owner activation on the authorized workstation

1. Inspect the installed Hermes version, its selected profile, model/provider configuration, environment overrides and available toolsets. Use `inspect-local.ps1` for a read-only initial inventory; it does not read credentials. Keep detailed configuration output private.
2. Back up the existing private profile locally. Do not copy it to the public service or this repository. A fresh owner profile can be made with `hermes profile create rolf-owner` (no clone). This does not restore prior memories or configure providers automatically.
3. In the verified sandbox, enable the documented `hermes-cli` toolset for the installed version, rather than the restricted public persona. Use these security settings as a reviewed merge into that profile, not as a replacement for its full configuration:

```yaml
approvals:
  mode: manual
  cron_mode: deny
  single_query_mode: deny
  mcp_reload_confirm: true
  destructive_slash_confirm: true
```

`manual` means prompting for commands Hermes identifies as dangerous; it is NOT an approval gate for every possible tool action. Never set `HERMES_YOLO_MODE=1`. OS permissions and sandboxing are the primary boundaries. Do not inherit unreviewed MCP servers/skills, shell profiles, cloud credentials or environment passthrough.

4. Configure the actual installed local model explicitly, with no cloud fallbacks. Audit auxiliary models (summarization, vision, approval/routing helpers), provider auto-selection and inherited configuration as well. Tools requiring paid APIs stay unavailable without separate authorization; 'full functionality' does not create accounts or authorize expenditure.
5. Start private diagnostics with `hermes -p rolf-owner doctor`, then `hermes -p rolf-owner chat`. Verify tool execution occurs only inside the allowed sandbox and that workspace tests cannot access a deliberately placed canary outside it. Do not ask the agent to expose real secrets as a test.
6. For owner-only Telegram access, independently verify the owner's numeric ID and explicitly allow only it. Keep every allow-all switch disabled and public pairing disabled. Test a second unapproved account is denied. Keep the public site entirely outside this channel.

Test the effective permissions again after updates, skill changes and new integrations. Stop before activation if a control cannot be verified. No settings in this runbook have been applied remotely.

Official references (checked 2026-09-08):
https://hermes-agent.nousresearch.com/docs/user-guide/security
https://hermes-agent.nousresearch.com/docs/user-guide/profiles/
https://hermes-agent.nousresearch.com/docs/user-guide/tools/
