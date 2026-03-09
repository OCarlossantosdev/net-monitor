import "dotenv/config";
import os from "os";
import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { NetworkService } from "./services/NetworkService";
import { MonitorWorker } from "./services/MonitorWorker";
import { NetworkScanner } from "./services/NetworkScanner";
import cors from "@fastify/cors";
import PDFDocument from "pdfkit";

const fastify = Fastify({ logger: true });

fastify.register(cors, { origin: "*" });

if (!process.env.DATABASE_URL) {
  throw new Error("ERRO: Variável DATABASE_URL não encontrada no arquivo .env");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ==========================================
// UTILITÁRIO DE DESCOBERTA AUTOMÁTICA
// ==========================================

const getNetworkContext = () => {
  const nets = os.networkInterfaces();
  let localIp = "127.0.0.1";

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === "IPv4" && !net.internal) {
        localIp = net.address;
        break;
      }
    }
  }

  const parts = localIp.split(".");
  const gatewayIp = `${parts[0]}.${parts[1]}.${parts[2]}.1`;

  return { localIp, gatewayIp };
};

// ==========================================
// ROTAS DE MONITORAMENTO E HISTÓRICO
// ==========================================

fastify.get("/logs", async (request, reply) => {
  try {
    const logs = await prisma.networkLog.findMany({
      take: 100,
      orderBy: { timestamp: "desc" },
    });
    return { data: logs.reverse() };
  } catch (error) {
    return reply.status(500).send({ error: "Erro ao buscar histórico" });
  }
});

fastify.get("/test/simulate-drop", async (request, reply) => {
  try {
    const log = await prisma.networkLog.create({
      data: {
        host: "SIMULADOR-FLUXO",
        latency: 999,
        status: "offline",
        type: "manual_simulation",
        packetLoss: 100,
      },
    });
    return { message: "Simulação de queda enviada ao banco!", data: log };
  } catch (error) {
    return reply.status(500).send({ error: "Falha ao criar simulação" });
  }
});

// ==========================================
// ROTA DE SPEEDTEST E DIAGNÓSTICO GLOBAL
// ==========================================

fastify.get("/network/speedtest", async (request, reply) => {
  try {
    const results = await NetworkService.runSpeedTest();
    return { success: true, data: results };
  } catch (error) {
    console.error("Erro na rota de speedtest:", error);
    return reply.status(500).send({ error: "Erro ao executar o Speedtest" });
  }
});

// NOVA ROTA: AUDITORIA GLOBAL COM IA (LAUDO MÉDICO DA REDE)
fastify.get("/network/global-diagnostics", async (request, reply) => {
  try {
    const { localIp, gatewayIp } = getNetworkContext();
    
    // Executa a Auditoria Completa usando o novo método inteligente
    const results = await NetworkService.runFullNetworkAudit(gatewayIp, localIp);

    // REGRA APLICADA: Salva todo teste completo no histórico como mandatório
    await prisma.networkLog.create({
      data: {
        host: "AUDITORIA-GLOBAL",
        latency: results.metrics.extLatency,
        // Converte o status do laudo (Saudável, Instável, etc) para o padrão do banco
        status: results.status === 'Saudável' ? 'online' : (results.status === 'Offline' ? 'offline' : 'high_latency'),
        type: 'global_diagnostic',
        packetLoss: results.metrics.packetLoss,
      },
    });

    return { success: true, data: results };
  } catch (error) {
    console.error("Erro na rota de diagnóstico global:", error);
    return reply.status(500).send({ error: "Erro ao executar o diagnóstico completo da rede" });
  }
});

// ==========================================
// EXPORTAÇÃO GERAL (CSV, TXT, PDF)
// ==========================================

fastify.get("/logs/export/csv", async (request, reply) => {
  try {
    const logs = await prisma.networkLog.findMany({
      where: { OR: [{ status: { not: "online" } }, { latency: { gt: 150 } }] },
      orderBy: { timestamp: "desc" },
    });
    let csv = "ID,Data,Dispositivo,Latencia,Status,Tipo,Perda_Pacotes\n";
    logs.forEach((log) => {
      csv += `${log.id},${log.timestamp.toISOString()},${log.host},${log.latency}ms,${log.status},${log.type},${log.packetLoss}%\n`;
    });
    reply
      .header("Content-Type", "text/csv")
      .header(
        "Content-Disposition",
        "attachment; filename=relatorio_geral.csv",
      );
    return csv;
  } catch (error) {
    return reply.status(500).send({ error: "Erro ao exportar CSV" });
  }
});

fastify.get("/logs/export/txt", async (request, reply) => {
  try {
    const logs = await prisma.networkLog.findMany({
      where: { OR: [{ status: { not: "online" } }, { latency: { gt: 150 } }] },
      orderBy: { timestamp: "desc" },
    });
    let txt = "=== RELATÓRIO DE INCIDENTES - FLUXO DIGITAL ===\n\n";
    logs.forEach((log) => {
      txt += `[${log.timestamp.toLocaleString()}] HOST: ${log.host} | STATUS: ${log.status.toUpperCase()} | LATÊNCIA: ${log.latency}ms\n`;
    });
    reply
      .header("Content-Type", "text/plain")
      .header(
        "Content-Disposition",
        "attachment; filename=relatorio_geral.txt",
      );
    return txt;
  } catch (error) {
    return reply.status(500).send({ error: "Erro ao exportar TXT" });
  }
});

fastify.get("/logs/export/pdf", async (request, reply) => {
  try {
    const logs = await prisma.networkLog.findMany({
      where: { OR: [{ status: { not: "online" } }, { latency: { gt: 150 } }] },
      orderBy: { timestamp: "desc" },
    });
    const doc = new PDFDocument();
    reply
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        "attachment; filename=relatorio_geral.pdf",
      );
    doc.pipe(reply.raw);
    doc
      .fontSize(20)
      .text("FLUXO DIGITAL - HEALTH REPORT", { align: "center" })
      .moveDown();
    doc
      .fontSize(10)
      .text(`Gerado em: ${new Date().toLocaleString()}`)
      .moveDown();
    logs.forEach((log) => {
      doc.text(
        `[${log.timestamp.toLocaleString()}] ${log.host} - ${log.status.toUpperCase()} (${log.latency}ms)`,
      );
    });
    doc.end();
  } catch (error) {
    return reply.status(500).send({ error: "Erro ao exportar PDF" });
  }
});

// ==========================================
// ROTAS DE DISPOSITIVOS (AUTO-DETECÇÃO)
// ==========================================

fastify.get("/devices", async (request, reply) => {
  try {
    const { localIp } = getNetworkContext();
    const myHostname = os.hostname();

    const cachedDevices = await NetworkScanner.scanLocalNetwork();

    const verifiedDevices = await Promise.all(
      cachedDevices.map(async (dev) => {
        const check = await NetworkService.checkStatus(dev.ip);
        return {
          ...dev,
          status: check.alive ? "online" : "offline",
          lastSeen: check.alive ? new Date() : undefined,
        };
      }),
    );

    for (const dev of verifiedDevices) {
      await prisma.device.upsert({
        where: { ip: dev.ip },
        update: { status: dev.status, lastSeen: dev.lastSeen || undefined },
        create: {
          ip: dev.ip,
          hostname: dev.hostname || "Dispositivo Desconhecido",
          mac: dev.mac,
          status: dev.status,
          lastSeen: dev.lastSeen || new Date(),
        },
      });
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const activeDevices = await prisma.device.findMany({
      where: {
        OR: [{ status: "online" }, { lastSeen: { gte: tenMinutesAgo } }],
      },
      orderBy: { lastSeen: "desc" },
    });

    let finalDevices = [...activeDevices];
    if (!finalDevices.some((d) => d.ip === localIp) && localIp) {
      finalDevices.unshift({
        id: "self",
        ip: localIp,
        hostname: myHostname,
        status: "online",
        lastSeen: new Date(),
        mac: "00:00:00:00:00:00",
      } as any);
    }

    return { data: finalDevices, myIp: localIp };
  } catch (error) {
    return reply.status(500).send({ error: "Erro ao validar dispositivos" });
  }
});

// ==========================================
// DIAGNÓSTICO BÁSICO E AVANÇADO INDIVIDUAL
// ==========================================

fastify.get("/devices/:ip/test/basic", async (request, reply) => {
  const { ip } = request.params as { ip: string };
  const { gatewayIp } = getNetworkContext();

  try {
    const [pGateway, pCloudflare, pGoogle] = await Promise.all([
      NetworkService.checkStatus(gatewayIp),
      NetworkService.checkStatus("1.1.1.1"),
      NetworkService.checkStatus("8.8.8.8"),
    ]);

    const webTest = await NetworkService.measureHttp("https://google.com");
    const isNetworkUp = pGoogle.alive || pCloudflare.alive;

    await prisma.networkLog.create({
      data: {
        host: ip,
        latency: pGoogle.latency || pCloudflare.latency || 0,
        status: isNetworkUp ? "online" : "offline",
        type: "auto_test",
        packetLoss: isNetworkUp ? 0 : 100,
      },
    });

    return {
      success: true,
      detected_gateway: gatewayIp,
      result: {
        gateway: pGateway.latency ? `${pGateway.latency}ms` : "N/A",
        dns_resolution: isNetworkUp ? "OK (Resolvido)" : "Falha DNS",
        external_pings: {
          cloudflare: pCloudflare.latency,
          google: pGoogle.latency,
        },
        http_test: isNetworkUp ? `${webTest.status} (${webTest.ms}ms)` : "Offline",
        ip_info: { local: ip, type: "Dynamic Subnet" },
      },
    };
  } catch (error) {
    return reply.status(500).send({ error: "Erro no diagnóstico automático" });
  }
});

fastify.get("/devices/:ip/test/advanced", async (request, reply) => {
  const { ip } = request.params as { ip: string };
  try {
    const pingPromises = Array.from({ length: 10 }).map(() => NetworkService.checkStatus(ip));
    
    const [samples, openPorts] = await Promise.all([
      Promise.all(pingPromises),
      NetworkService.scanPorts(ip) 
    ]);

    const latencies = samples.filter((s) => s.alive).map((s) => Number(s.latency) || 0);
    const aliveCount = samples.filter((s) => s.alive).length;

    const packetLoss = ((10 - aliveCount) / 10) * 100;
    const jitter = latencies.length > 1 ? Math.round(Math.max(...latencies) - Math.min(...latencies)) : 0;
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

    await prisma.networkLog.create({
      data: {
        host: ip,
        latency: avgLatency,
        status: aliveCount > 0 ? "online" : "offline",
        type: "advanced_scan",
        packetLoss,
      },
    });

    return {
      success: true,
      details: {
        metrics: {
          jitter: `${jitter}ms`,
          packetLoss: `${packetLoss}%`,
          stability: packetLoss === 0 ? "Estável" : packetLoss <= 20 ? "Risco" : "Crítico",
        },
        traceroute_hops: [getNetworkContext().gatewayIp, "Switches_Locais", ip],
        active_ports: openPorts.length > 0 ? openPorts : ["Nenhuma Detectada"],
        oscillation_index: jitter > 30 ? "Alta" : "Baixa",
      },
    };
  } catch (error) {
    return reply.status(500).send({ error: "Erro no diagnóstico avançado" });
  }
});

// ==========================================
// OUTRAS ROTAS (PATCH, HISTORY, STATUS)
// ==========================================

fastify.patch("/devices/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { hostname } = request.body as { hostname: string };
  try {
    const updated = await prisma.device.update({
      where: { id },
      data: { hostname },
    });
    return updated;
  } catch (error) {
    return reply.status(500).send({ error: "Erro ao renomear" });
  }
});

fastify.get("/devices/:ip/history", async (request, reply) => {
  const { ip } = request.params as { ip: string };
  try {
    const history = await prisma.networkLog.findMany({
      where: { host: ip },
      take: 20,
      orderBy: { timestamp: "desc" },
    });
    return { data: history };
  } catch (error) {
    return reply.status(500).send({ error: "Erro no histórico" });
  }
});

fastify.get("/status/current", async (request, reply) => {
  try {
    const lastLog = await prisma.networkLog.findFirst({
      orderBy: { timestamp: "desc" },
    });
    return { data: lastLog };
  } catch (error) {
    return reply.status(500).send({ error: "Erro no status" });
  }
});

const start = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Conectado ao Supabase!");
    const worker = new MonitorWorker(prisma);
    worker.start(10000); 
    await fastify.listen({ port: 3333, host: "0.0.0.0" });
    console.log("🚀 NetMonitor (IA Local) na Fluxo Digital");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();