import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { GatewayError } from "./auth.mjs";
const execute = promisify(execFile);
export async function docker(args) {
  try { const result = await execute("docker", args, { timeout: 60000, maxBuffer: 1024 * 1024, windowsHide: true }); return result.stdout.trim(); }
  catch { throw new GatewayError("RUNTIME_UNAVAILABLE"); }
}
const privateOptions = ["--opt", "com.docker.network.bridge.enable_icc=true", "--opt", "com.docker.network.bridge.gateway_mode_ipv4=isolated", "--opt", "com.docker.network.bridge.gateway_mode_ipv6=isolated"];
function labels(config, tenant, kind) {
  return ["--label", "ans.easel.namespace=" + config.namespace, "--label", "ans.easel.tenant=" + tenant, "--label", "ans.easel.kind=" + kind];
}
function owned(state, config, tenant, kind) {
  return state?.["ans.easel.namespace"] === config.namespace && state?.["ans.easel.tenant"] === tenant && state?.["ans.easel.kind"] === kind;
}
export function runtimeArgs(config, tenant) {
  const name = config.namespace + "-" + tenant;
  return ["run", "--pull", "never", "--detach", "--name", name, ...labels(config, tenant, "worker"),
    "--network", name, "--network-alias", "worker", "--read-only", "--init", "--user", "10001:10001",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true", "--pids-limit", "256",
    "--log-opt", "max-size=10m", "--log-opt", "max-file=3", "--memory", "4g", "--memory-swap", "4g", "--cpus", "1.5", "--restart", "no",
    "--tmpfs", "/tmp:rw,nosuid,nodev,size=512m,mode=1777", "--shm-size", "256m",
    "--mount", "type=volume,src=" + name + "-workspace,dst=/workspace",
    "--mount", "type=volume,src=" + name + "-home,dst=/home/easel",
    "--env", "EASEL_PORT=7860", "--env", "EASEL_EXTRA_HOSTS=127.0.0.1,localhost",
    "--env", "EASEL_EXTRA_ORIGINS=" + config.publicOrigin,
    "--env", "HTTP_PROXY=http://egress:8090", "--env", "HTTPS_PROXY=http://egress:8090",
    "--env", "http_proxy=http://egress:8090", "--env", "https_proxy=http://egress:8090",
    "--env", "NO_PROXY=127.0.0.1,localhost", "--env", "no_proxy=127.0.0.1,localhost",
    "--env", "NODE_USE_ENV_PROXY=1", "--env", "EASEL_PROXY=http://egress:8090", config.image];
}
export function validateWorker(config, tenant, state) {
  const name = config.namespace + "-" + tenant;
  const networks = Object.keys(state.NetworkSettings?.Networks ?? {});
  const host = state.HostConfig;
  const mounts = (state.Mounts ?? []).filter(m => m.Type !== "tmpfs");
  if (!host?.ReadonlyRootfs || host.Privileged || host.NetworkMode !== name || state.Config.User !== "10001:10001" ||
      networks.length !== 1 || networks[0] !== name || Object.keys(host.PortBindings ?? {}).length ||
      host.CapAdd?.length || !host.CapDrop?.includes("ALL") || !host.SecurityOpt?.includes("no-new-privileges:true") ||
      mounts.length !== 2 || ["workspace", "home"].some(kind => !mounts.some(m => m.Type === "volume" && m.Name === name + "-" + kind && m.Destination === (kind === "workspace" ? "/workspace" : "/home/easel"))))
    throw new GatewayError("UNSAFE_EXISTING_WORKER");
}
export class Containers {
  constructor(config, run = docker) {
    this.config = config; this.run = run; this.touched = new Map(); this.queue = Promise.resolve();
    this.pending = new Map(); this.leases = new Map(); this.engineChecked = false;
  }
  resolve(tenant) {
    if (!/^[a-f0-9]{64}$/.test(tenant)) return Promise.reject(new GatewayError("INVALID_TENANT", 401));
    this.touched.set(tenant, Date.now());
    if (this.pending.has(tenant)) return this.pending.get(tenant);
    const request = this.queue.then(() => this.provision(tenant));
    this.queue = request.catch(() => {}); this.pending.set(tenant, request);
    return request.finally(() => this.pending.delete(tenant));
  }
  async checkEngine() {
    if (this.engineChecked) return;
    const version = await this.run(["version", "--format", "{{.Server.Version}}"]);
    if (!/^\d+\./.test(version) || Number(version.split(".")[0]) < 28) throw new GatewayError("UNSUPPORTED_DOCKER_VERSION");
    this.engineChecked = true;
  }
  async ensureResources(tenant) {
    const config = this.config; const name = config.namespace + "-" + tenant;
    if (!await this.run(["network", "ls", "--filter", "name=^" + name + "$", "--format", "{{.Name}}"]))
      await this.run(["network", "create", "--driver", "bridge", "--internal", ...privateOptions, ...labels(config, tenant, "private-network"), name]);
    const state = JSON.parse(await this.run(["network", "inspect", name]))[0];
    if (state.Driver !== "bridge" || !state.Internal || state.EnableIPv6 || !owned(state.Labels, config, tenant, "private-network") ||
        state.Options?.["com.docker.network.bridge.gateway_mode_ipv4"] !== "isolated" || state.Options?.["com.docker.network.bridge.gateway_mode_ipv6"] !== "isolated")
      throw new GatewayError("UNSAFE_RUNTIME_NETWORK");
    for (const kind of ["workspace", "home"]) {
      const volume = name + "-" + kind;
      if (!await this.run(["volume", "ls", "--filter", "name=^" + volume + "$", "--format", "{{.Name}}"]))
        await this.run(["volume", "create", ...labels(config, tenant, kind), volume]);
      const metadata = JSON.parse(await this.run(["volume", "inspect", volume]))[0];
      if (metadata.Driver !== "local" || metadata.Options && Object.keys(metadata.Options).length || !owned(metadata.Labels, config, tenant, kind))
        throw new GatewayError("VOLUME_OWNERSHIP_CONFLICT");
    }
  }
  async provision(tenant) {
    await this.checkEngine();
    const config = this.config; const name = config.namespace + "-" + tenant;
    const existing = await this.run(["ps", "-a", "--filter", "name=^/" + name + "$", "--format", "{{.Names}}"]);
    if (existing) {
      const state = JSON.parse(await this.run(["inspect", name]))[0];
      if (!owned(state.Config.Labels, config, tenant, "worker")) throw new GatewayError("RUNTIME_OWNERSHIP_CONFLICT");
      validateWorker(config, tenant, state); await this.ensureResources(tenant);
      await this.ensureEgress(tenant);
      if (!state.State.Running) { await this.capacity(); await this.run(["start", name]); }
    } else {
      await this.capacity();
      const count = (await this.run(["volume", "ls", "--filter", "label=ans.easel.namespace=" + config.namespace, "--filter", "label=ans.easel.kind=workspace", "--format", "{{.Name}}"])).split("\n").filter(Boolean).length;
      const ownVolume = await this.run(["volume", "ls", "--filter", "name=^" + name + "-workspace$", "--format", "{{.Name}}"]);
      if (!ownVolume && count >= config.maxUsers) throw new GatewayError("USER_CAPACITY", 429);
      await this.ensureResources(tenant); await this.ensureEgress(tenant);
      await this.run(runtimeArgs(config, tenant));
    }
    const state = JSON.parse(await this.run(["inspect", name + "-egress"]))[0];
    const bindings = state.NetworkSettings?.Ports?.["8091/tcp"];
    if (bindings?.length !== 1 || bindings[0].HostIp !== "127.0.0.1" || !/^\d+$/.test(bindings[0].HostPort)) throw new GatewayError("UNSAFE_RUNTIME_PORT");
    const port = Number(bindings[0].HostPort); if (port < 1 || port > 65535) throw new GatewayError("UNSAFE_RUNTIME_PORT");
    const address = "http://127.0.0.1:" + port;
    for (let attempt = 0; attempt < 60; attempt++) {
      try { const result = await fetch(address + "/", { signal: AbortSignal.timeout(2000), redirect: "error" }); await result.body?.cancel(); if (result.ok) return address; } catch { /* Cold worker startup. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new GatewayError("RUNTIME_STARTING");
  }
  async ensureEgress(tenant) {
    const config = this.config; const name = config.namespace + "-" + tenant; const proxy = name + "-egress";
    const publicNetwork = config.namespace + "-outbound";
    if (!await this.run(["network", "ls", "--filter", "name=^" + publicNetwork + "$", "--format", "{{.Name}}"]))
      await this.run(["network", "create", "--driver", "bridge", "--opt", "com.docker.network.bridge.enable_icc=false", "--label", "ans.easel.namespace=" + config.namespace, publicNetwork]);
    const network = JSON.parse(await this.run(["network", "inspect", publicNetwork]))[0];
    if (network.Driver !== "bridge" || network.Internal || network.EnableIPv6 || network.Labels?.["ans.easel.namespace"] !== config.namespace || network.Options?.["com.docker.network.bridge.enable_icc"] !== "false")
      throw new GatewayError("UNSAFE_EGRESS_NETWORK");
    const found = await this.run(["ps", "-a", "--filter", "name=^/" + proxy + "$", "--format", "{{.Names}}"]);
    if (found) {
      const state = JSON.parse(await this.run(["inspect", proxy]))[0];
      if (!owned(state.Config.Labels, config, tenant, "egress")) throw new GatewayError("EGRESS_OWNERSHIP_CONFLICT");
      const host = state.HostConfig; const networks = Object.keys(state.NetworkSettings?.Networks ?? {});
      if (!host?.ReadonlyRootfs || host.Privileged || host.Sysctls?.["net.ipv4.ip_forward"] !== "0" || state.Config.User !== "1000:1000" ||
          state.Mounts?.length || host.CapAdd?.length || !host.CapDrop?.includes("ALL") || !host.SecurityOpt?.includes("no-new-privileges:true") ||
          networks.some(item => item !== name && item !== publicNetwork) || !networks.includes(publicNetwork) ||
          Object.keys(host.PortBindings ?? {}).join() !== "8091/tcp" || host.PortBindings["8091/tcp"]?.[0]?.HostIp !== "127.0.0.1")
        throw new GatewayError("UNSAFE_EXISTING_EGRESS");
      if (!networks.includes(name)) await this.run(["network", "connect", "--alias", "egress", name, proxy]);
      if (!state.State.Running) await this.run(["start", proxy]);
    } else {
      await this.run(["run", "--pull", "never", "--detach", "--name", proxy, ...labels(config, tenant, "egress"), "--network", publicNetwork, "--publish", "127.0.0.1::8091",
        "--log-opt", "max-size=10m", "--log-opt", "max-file=3", "--read-only", "--init", "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true",
        "--sysctl", "net.ipv4.ip_forward=0", "--user", "1000:1000", "--memory", "128m", "--pids-limit", "32", "--cpus", "0.25", config.egressImage]);
      await this.run(["network", "connect", "--alias", "egress", name, proxy]);
    }
  }
  lease(tenant) {
    this.leases.set(tenant, (this.leases.get(tenant) ?? 0) + 1);
    return () => { this.leases.set(tenant, Math.max(0, (this.leases.get(tenant) ?? 1) - 1)); this.touched.set(tenant, Date.now()); };
  }
  async capacity() {
    const names = (await this.run(["ps", "--filter", "label=ans.easel.namespace=" + this.config.namespace, "--filter", "label=ans.easel.kind=worker", "--format", "{{.Names}}"])).split("\n").filter(Boolean);
    if (names.length >= this.config.maxActive) throw new GatewayError("ACTIVE_CAPACITY", 429);
  }
  stopIdle() {
    const request = this.queue.then(() => this.sweepIdle()); this.queue = request.catch(() => {}); return request;
  }
  async sweepIdle() {
    // After restart, labelled containers receive a full idle interval before being stopped.
    const names = (await this.run(["ps", "--filter", "label=ans.easel.namespace=" + this.config.namespace, "--filter", "label=ans.easel.kind=worker", "--format", "{{.Names}}"])).split("\n").filter(Boolean);
    for (const name of names) {
      const tenant = name.slice(this.config.namespace.length + 1);
      if (!/^[a-f0-9]{64}$/.test(tenant) || name !== this.config.namespace + "-" + tenant) continue;
      if (!this.touched.has(tenant)) this.touched.set(tenant, Date.now());
      if (!this.pending.has(tenant) && !this.leases.get(tenant) && Date.now() - this.touched.get(tenant) > this.config.idleMs) {
        await this.run(["stop", "--time", "20", name]); await this.run(["stop", "--time", "5", name + "-egress"]);
      }
    }
  }
}
