import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as ping from 'ping';
import net from 'net';
import http from 'http';
import https from 'https';
import speedTest from 'speedtest-net';

const execPromise = promisify(exec);

export class NetworkService {
  static async checkStatus(target: string) {
    const res = await (ping as any).promise.probe(target, { timeout: 2 });
    return {
      host: target,
      alive: res.alive,
      latency: res.avg !== 'unknown' ? parseFloat(res.avg) : null,
      timestamp: new Date()
    };
  }

  static async runTraceroute(target: string) {
    try {
      const isWin = process.platform === 'win32';
      const command = isWin ? `tracert -d -h 10 ${target}` : `traceroute -n -m 10 ${target}`;
      const { stdout } = await execPromise(command);
      return stdout;
    } catch (error) { return `Erro ao executar traceroute: ${error}`; }
  }

  static async scanPorts(ip: string, ports: number[] = [22, 80, 443, 3306, 3389, 8080]): Promise<number[]> {
    const openPorts: number[] = [];
    const checkPort = (port: number) => {
      return new Promise<void>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000); 
        socket.on('connect', () => { openPorts.push(port); socket.destroy(); resolve(); });
        socket.on('timeout', () => { socket.destroy(); resolve(); });
        socket.on('error', () => { socket.destroy(); resolve(); });
        socket.connect(port, ip);
      });
    };
    await Promise.all(ports.map(port => checkPort(port)));
    return openPorts.sort((a, b) => a - b);
  }

  static async measureHttp(url: string): Promise<{ status: number | string, ms: number }> {
    const start = Date.now();
    const client = url.startsWith('https') ? https : http;
    return new Promise((resolve) => {
      const req = client.get(url, { timeout: 2000 }, (res) => {
        resolve({ status: res.statusCode || 'OK', ms: Date.now() - start });
      });
      req.on('timeout', () => { req.destroy(); resolve({ status: 'Timeout', ms: 2000 }); });
      req.on('error', () => { resolve({ status: 'Erro', ms: 0 }); });
    });
  }

  /**
   * SPEEDTEST OFICIAL (COM FALLBACK PARA CLOUDFLARE)
   */
  static async runSpeedTest() {
    try {
      console.log('📡 Iniciando Speedtest Oficial (Ookla)...');
      const result = await speedTest({ acceptLicense: true, acceptGdpr: true });
      
      return {
        download: (result.download.bandwidth / 125000).toFixed(2),
        upload: (result.upload.bandwidth / 125000).toFixed(2),
        ping: Math.round(result.ping.latency),
        isp: result.isp
      };
    } catch (error: any) {
      console.error('⚠️ Ookla bloqueado pelo sistema. Acionando Fallback nativo...');
      
      try {
        const fallbackDownload = await this.runFallbackDownload();
        return {
          download: fallbackDownload,
          upload: "N/A", // Fallback mede apenas download para ser rápido e não bloquear o Node
          ping: 0,
          isp: "Cloudflare Net (Fallback)"
        };
      } catch (fallbackError) {
        throw new Error('Falha total ao medir a velocidade.');
      }
    }
  }

  /**
   * NOVA: Consulta de Fabricante via MAC Address (Módulo de Inventário Base)
   */
  static async getMacVendor(mac: string): Promise<string> {
    if (!mac || mac === '00:00:00:00:00:00' || mac.length < 17) return 'Desconhecido';
    
    try {
      const response = await fetch(`https://api.macvendors.com/${encodeURIComponent(mac)}`);
      
      if (response.ok) {
        const vendor = await response.text();
        return vendor.replace(/,?\s*(Inc\.|LLC|Corp\.|Corporation|Ltd\.|Co\.)/gi, '').trim(); 
      }
      return 'Desconhecido';
    } catch (error) {
      return 'Desconhecido';
    }
  }

  /**
   * O NOVO CÉREBRO: Auditoria Completa e Diagnóstico Inteligente
   */
  static async runFullNetworkAudit(gatewayIp: string, localIp: string) {
    try {
      const pingPromises = Array.from({ length: 10 }).map(() => this.checkStatus('8.8.8.8'));
      
      const [samples, pGateway, pCloudflare, webTest, ipInfoRes] = await Promise.all([
        Promise.all(pingPromises), 
        this.checkStatus(gatewayIp), 
        this.checkStatus('1.1.1.1'), 
        this.measureHttp('https://google.com'), 
        fetch('http://ip-api.com/json/').catch(() => null) 
      ]);

      const ipInfo = ipInfoRes && ipInfoRes.ok ? await ipInfoRes.json() : {};

      const latencies = samples.filter(s => s.alive).map(s => Number(s.latency) || 0);
      const aliveCount = samples.filter(s => s.alive).length;
      
      const packetLoss = ((10 - aliveCount) / 10) * 100;
      const jitter = latencies.length > 1 ? Math.round(Math.max(...latencies) - Math.min(...latencies)) : 0;
      const extLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
      const gatewayLatency = Number(pGateway.latency) || 0;

      let status: 'Saudável' | 'Instável' | 'Crítica' | 'Offline' = 'Saudável';
      let diagnosis = 'A conexão da Fluxo Digital está em perfeito estado. Latência, Jitter e rotas operando com eficiência máxima.';

      if (packetLoss === 100) {
        status = 'Offline';
        diagnosis = 'Sem acesso externo. O provedor parou de responder ou o roteador principal perdeu o link óptico (Sinal cortado).';
      } else if (packetLoss >= 20) {
        status = 'Crítica';
        diagnosis = `Perda severa de ${packetLoss}% dos pacotes. Indício de cabo de rede danificado, interferência pesada no Wi-Fi ou saturação extrema na infraestrutura da operadora.`;
      } else if (!pGateway.alive || gatewayLatency > 80) {
        status = 'Crítica';
        diagnosis = `Gargalo na Rede Local! O tempo de resposta até o seu roteador (${gatewayLatency}ms) está anormal. O equipamento pode estar travando ou o Wi-Fi está muito congestionado.`;
      } else if (extLatency > 150 || jitter > 50) {
        status = 'Instável';
        diagnosis = `Conexão oscilando muito (Jitter: ${jitter}ms). Risco alto de travamentos em reuniões de vídeo e VoIP. O problema provável é na rota da operadora ${ipInfo.isp || ''}.`;
      } else if (webTest.ms > 1500) {
        status = 'Instável';
        diagnosis = `Ping normal, mas a navegação está lenta (Resposta Web: ${webTest.ms}ms). Sinal claro de problema nos servidores DNS da operadora ou bloqueio de Firewall.`;
      }

      return {
        status,
        diagnosis,
        metrics: {
          packetLoss,
          jitter,
          extLatency,
          gatewayLatency,
          cloudflareLatency: Number(pCloudflare.latency) || 0,
          webResponse: webTest.ms,
        },
        network: {
          localIp,
          gatewayIp,
          publicIp: ipInfo.query || 'Não detectado',
          isp: ipInfo.isp || 'Desconhecido',
          location: ipInfo.city || 'Desconhecido'
        },
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Falha na Auditoria Global:', error);
      throw new Error('Falha ao executar auditoria completa.');
    }
  }

  /**
   * FUNÇÃO PRIVADA: PLANO B DO SPEEDTEST (Download HTTPS nativo)
   */
  private static runFallbackDownload(): Promise<string> {
    return new Promise((resolve) => {
      const start = Date.now();
      
      // Baixa um payload de teste puro de 15MB da Cloudflare (não bloqueável por AV)
      const req = https.get('https://speed.cloudflare.com/__down?bytes=15000000', (res) => {
        let downloadedBytes = 0;
        
        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
        });
        
        res.on('end', () => {
          const durationSeconds = (Date.now() - start) / 1000;
          const megabits = (downloadedBytes * 8) / 1000000;
          const mbps = (megabits / durationSeconds).toFixed(2);
          resolve(mbps);
        });
      });

      req.on('timeout', () => { req.destroy(); resolve('0.00'); });
      req.on('error', () => { resolve('0.00'); });
    });
  }
}