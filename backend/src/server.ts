import 'dotenv/config';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg'; // Importa o driver nativo
import { PrismaPg } from '@prisma/adapter-pg'; // Importa o adaptador do Prisma 7
import { NetworkService } from './services/NetworkService';
import { MonitorWorker } from './services/MonitorWorker';
import cors from '@fastify/cors';
import { NetworkScanner } from './services/NetworkScanner';

const fastify = Fastify({ logger: true });
fastify.register(cors, {
  origin: '*', // Permite todas as origens (ajuste conforme necessário)
});

if (!process.env.DATABASE_URL) {
  throw new Error('ERRO: Variável DATABASE_URL não encontrada no arquivo .env');
}

// 1. Cria o Pool de conexão nativo usando a sua URL do Supabase (PostgreSQL) com SSL habilitado
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Esta linha é o "crachá VIP" para o Supabase
  }
});

// 2. Conecta o Pool ao Adaptador do Prisma
const adapter = new PrismaPg(pool);

// 3. Agora sim! O Prisma 7 aceita a propriedade 'adapter' sem reclamar
const prisma = new PrismaClient({ adapter });

// ==========================================
// Rota de Teste Manual 
// ==========================================
fastify.get('/test-ping', async (request, reply) => {
  const target = '1.1.1.1';
  
  try {
    const result = await NetworkService.checkStatus(target);

    const log = await prisma.networkLog.create({
      data: {
        host: result.host,
        latency: result.latency,
        status: result.alive ? (result.latency && result.latency > 150 ? 'high_latency' : 'online') : 'offline',
        type: 'manual',
        packetLoss: 0
      }
    });

    return { message: 'Teste concluído!', data: log };
  } catch (error) {
    return reply.status(500).send({ error: 'Falha ao salvar no banco', details: error });
  }
});

// ==========================================
// Rota: Buscar o histórico de rede (Para os gráficos)
// ==========================================
fastify.get('/logs', async (request, reply) => {
  try {
    // Busca os últimos 60 registros (equivalente a 1 hora se for 1 ping por min)
    const logs = await prisma.networkLog.findMany({
      take: 60,
      orderBy: {
        timestamp: 'desc', // Traz os mais recentes primeiro
      },
    });

    // Inverte a ordem para o gráfico desenhar da esquerda (antigo) para a direita (novo)
    return { data: logs.reverse() }; 
  } catch (error) {
    return reply.status(500).send({ error: 'Erro ao buscar histórico de rede' });
  }
});

// ==========================================
// Rota: Buscar o status atual (Para os cards do topo)
// ==========================================
fastify.get('/status/current', async (request, reply) => {
  try {
    const lastLog = await prisma.networkLog.findFirst({
      orderBy: {
        timestamp: 'desc',
      },
    });

    return { data: lastLog };
  } catch (error) {
    return reply.status(500).send({ error: 'Erro ao buscar status atual' });
  }
});

// ==========================================
// Rota: Escanear e listar dispositivos locais
// ==========================================
fastify.get('/devices', async (request, reply) => {
  try {
    // 1. Roda o Scanner para ver quem está na rede AGORA
    const foundDevices = await NetworkScanner.scanLocalNetwork();

    // 2. Atualiza ou cria cada aparelho no Supabase
   for (const dev of foundDevices) {
      await prisma.device.upsert({
        where: { ip: dev.ip }, // Continua buscando pelo IP
        update: { 
          hostname: dev.hostname,
          mac: dev.mac, // <--- ADICIONE ESTA LINHA
          lastSeen: new Date(),
          status: 'online'
        },
        create: {
          ip: dev.ip,
          hostname: dev.hostname,
          mac: dev.mac, // <--- ADICIONE ESTA LINHA
        }
      });
    }

    fastify.get('/status/stability', async (request, reply) => {
  try {
    const totalLogs = await prisma.networkLog.count();
    const onlineLogs = await prisma.networkLog.count({ where: { status: 'online' } });
    const activeOutages = await prisma.outage.count({ where: { endTime: null } });
    
    // Cálculo de Uptime (Disponibilidade) em %
    const uptimePercent = totalLogs > 0 ? (onlineLogs / totalLogs) * 100 : 100;

    return { 
      uptime: uptimePercent.toFixed(2),
      isDown: activeOutages > 0,
      totalLogs 
    };
  } catch (error) {
    return reply.status(500).send({ error: 'Erro ao calcular estabilidade' });
  }
});

    // 3. Busca todos os aparelhos salvos para devolver ao Frontend
    const allDevices = await prisma.device.findMany({
      orderBy: { lastSeen: 'desc' }
    });

    return { data: allDevices };
  } catch (error) {
    console.error('Erro na rota /devices:', error);
    return reply.status(500).send({ error: 'Erro ao escanear dispositivos' });
  }
});

const start = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Conectado ao Supabase com sucesso via Prisma 7 Adapter!');

    // LIGA O WORKER AQUI PASSANDO O PRISMA CONECTADO
    const worker = new MonitorWorker(prisma);
    worker.start(60000); // 60000 ms = 1 minuto

    await fastify.listen({ port: 3333, host: '0.0.0.0' });
    console.log('🚀 Servidor rodando em http://localhost:3333');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();