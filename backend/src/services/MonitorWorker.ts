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

  // Mudei o padrão para 10000ms (10 segundos) para bater com o "Live Feed" do Dashboard
  public start(intervalMs: number = 10000) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`📡 Monitor de Conexão Ativo (Threshold: ${this.FAILURE_THRESHOLD} falhas | Intervalo: ${intervalMs}ms)`);

    this.runCheck();
    this.intervalId = setInterval(() => this.runCheck(), intervalMs);
  }

  private async runCheck() {
    // Alvo global e estável para definir a saúde geral da agência
    const target = '8.8.8.8';

    try {
      const result = await NetworkService.checkStatus(target);
      
      // TRAVA DE SEGURANÇA: Se a latência for undefined/null (queda), registra como 0. 
      // Isso evita que o Prisma dê crash e pare de salvar os logs.
      const safeLatency = result.latency ? Math.round(result.latency) : 0;

      // 1. Salva o Log de Latência normalmente
      await this.prisma.networkLog.create({
        data: {
          host: result.host || target,
          latency: safeLatency,
          status: result.alive ? (safeLatency > 150 ? 'high_latency' : 'online') : 'offline',
          type: 'auto_worker', // Identificador específico para diferenciar dos testes manuais
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
              probableCause: 'Perda total de resposta do alvo (Timeout DNS)'
            }
          });
          this.activeOutageId = outage.id;
          console.log('🚨 QUEDA REGISTRADA NO SUPABASE!');
        }
      } else {
        // Se a internet voltou e tinha uma queda aberta, encerra ela
        if (this.activeOutageId) {
          const outageData = await this.prisma.outage.findUnique({ where: { id: this.activeOutageId } });
          const startTime = outageData?.startTime;
          
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
      console.error(`[ERRO-MONITOR-WORKER] Falha grave no loop de verificação:`, error);
    }
  }
}