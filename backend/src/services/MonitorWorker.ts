import { PrismaClient } from '@prisma/client';
import { NetworkService } from './NetworkService';

export class MonitorWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private prisma: PrismaClient;
  
  // Variáveis de controle de estado
  private consecutiveFailures = 0;
  private activeOutageId: string | null = null;
  private readonly FAILURE_THRESHOLD = 3; // Precisa falhar 3x para ser considerado "Queda"

  constructor(prismaInstance: PrismaClient) {
    this.prisma = prismaInstance;
  }

  public start(intervalMs: number = 60000) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`📡 Monitor de Conexão Ativo (Threshold: ${this.FAILURE_THRESHOLD} falhas)`);

    this.runCheck();
    this.intervalId = setInterval(() => this.runCheck(), intervalMs);
  }

  private async runCheck() {
    const target = '1.1.1.1'; 

    try {
      const result = await NetworkService.checkStatus(target);

      // 1. Salva o Log de Latência normalmente
      await this.prisma.networkLog.create({
        data: {
          host: result.host,
          latency: result.latency,
          status: result.alive ? (result.latency && result.latency > 150 ? 'high_latency' : 'online') : 'offline',
          type: 'auto',
          packetLoss: result.alive ? 0 : 100
        }
      });

      // 2. Lógica de Validação de Conexão (Outages)
      if (!result.alive) {
        this.consecutiveFailures++;
        console.log(`⚠️ Falha detectada (${this.consecutiveFailures}/${this.FAILURE_THRESHOLD})`);

        // Se atingir o limite de falhas e não tiver uma queda aberta, cria uma
        if (this.consecutiveFailures >= this.FAILURE_THRESHOLD && !this.activeOutageId) {
          const outage = await this.prisma.outage.create({
            data: {
              startTime: new Date(),
              probableCause: 'Perda total de resposta do alvo (Timeout)'
            }
          });
          this.activeOutageId = outage.id;
          console.log('🚨 QUEDA REGISTRADA NO SUPABASE!');
        }
      } else {
        // Se a internet voltou e tinha uma queda aberta, encerra ela
        if (this.activeOutageId) {
          const startTime = (await this.prisma.outage.findUnique({ where: { id: this.activeOutageId } }))?.startTime;
          
          if (startTime) {
            const endTime = new Date();
            const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

            await this.prisma.outage.update({
              where: { id: this.activeOutageId },
              data: { 
                endTime: endTime,
                duration: durationSeconds
              }
            });
            console.log(`✅ CONEXÃO RESTABELECIDA! Duração da queda: ${durationSeconds}s`);
          }
          this.activeOutageId = null;
        }
        this.consecutiveFailures = 0; // Reseta o contador de falhas
      }
    } catch (error) {
      console.error(`[ERRO-MONITOR]`, error);
    }
  }
}