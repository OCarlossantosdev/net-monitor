import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as ping from 'ping';
import net from 'net';
import http from 'http';
import https from 'https';
import tls from 'tls';

// Ignora a interceptação de SSL do proxy da agência
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

  /**
   * TRACEROUTE INTELIGENTE: Analisa o gargalo da rede
   */
  static async runSmartTraceroute(target: string) {
    try {
      const isWin = process.platform === 'win32';
      const command = isWin ? `tracert -d -h 15 ${target}` : `traceroute -n -m 15 ${target}`;
      const { stdout } = await execPromise(command);

      // Módulo Analítico: Tenta achar onde a conexão "morreu" ou demorou mais de 100ms
      const lines = stdout.split('\n');
      let bottleneck = "Nenhum gargalo detectado";
      let failedHop = null;

      for (const line of lines) {
        if (line.includes('* * *') || line.includes('Request timed out')) {
          failedHop = line.trim();
          bottleneck = `Queda de pacote severa na rota externa.`;
          break;
        }
        // Extrai milissegundos usando Regex básica para achar lentidão na rota
        const msMatch = line.match(/(\d+)\s*ms/);
        if (msMatch && parseInt(msMatch[1]) > 150) {
          bottleneck = `Lentidão extrema (>150ms) no salto: ${line.trim().replace(/\s+/g, ' ')}`;
          break;
        }
      }

      return { rawOutput: stdout, bottleneck };
    } catch (error) { return { rawOutput: `Erro: ${error}`, bottleneck: "Falha ao mapear rota" }; }
  }

  /**
   * SMART PORT SCANNER: Tenta identificar qual serviço está rodando na porta (Banner Grabbing)
   */
  static async smartScanPorts(ip: string, ports: number[] = [22, 80, 443, 3306, 3389, 5432, 8080]): Promise<{ port: number, service: string }[]> {
    const activeServices: { port: number, service: string }[] = [];

    const checkPort = (port: number) => {
      return new Promise<void>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1500);

        socket.on('connect', () => {
          // Se for porta HTTP/HTTPS, nós sabemos o serviço. Se for SSH ou Banco, tentamos ler o banner.
          let serviceName = "Serviço Desconhecido";
          if (port === 80) serviceName = "HTTP Web Server";
          if (port === 443) serviceName = "HTTPS Secure Web";
          if (port === 3389) serviceName = "Remote Desktop (RDP)";

          socket.write("HEAD / HTTP/1.0\r\n\r\n"); // Envia um "oi" para ver se o serviço responde algo

          socket.on('data', (data) => {
            const banner = data.toString().trim();
            if (banner.includes('SSH')) serviceName = `SSH Server (${banner.split('-')[1] || 'Linux'})`;
            if (banner.includes('mysql') || banner.includes('MariaDB')) serviceName = "MySQL/MariaDB Database";
            if (banner.includes('PostgreSQL')) serviceName = "PostgreSQL Database";
            if (banner.includes('Server:')) {
              const match = banner.match(/Server:\s*(.*)/);
              if (match) serviceName = `Web Server (${match[1].trim()})`;
            }
          });

          // Aguarda um pouquinho para a resposta do banner chegar antes de fechar
          setTimeout(() => {
            activeServices.push({ port, service: serviceName });
            socket.destroy();
            resolve();
          }, 300);
        });

        socket.on('timeout', () => { socket.destroy(); resolve(); });
        socket.on('error', () => { socket.destroy(); resolve(); });
        socket.connect(port, ip);
      });
    };

    await Promise.all(ports.map(port => checkPort(port)));
    return activeServices.sort((a, b) => a.port - b.port);
  }

  /**
   * INSPEÇÃO WEB AVANÇADA: Mede TTFB e valida a saúde do Certificado SSL
   */
  static async inspectWebHealth(url: string, host: string): Promise<{ status: string, ms: number, sslValid: boolean, sslDays: number, sslIssuer: string }> {
    const start = Date.now();
    const client = url.startsWith('https') ? https : http;

    let sslValid = false;
    let sslDays = 0;
    let sslIssuer = "N/A";

    // Puxa os dados do Certificado SSL separadamente
    if (url.startsWith('https')) {
      try {
        await new Promise<void>((resolve) => {
          const socket = tls.connect(443, host, { servername: host }, () => {
            const cert = socket.getPeerCertificate();
            socket.end();
            if (cert && Object.keys(cert).length) {
              const validTo = new Date(cert.valid_to).getTime();
              sslDays = Math.round((validTo - Date.now()) / (1000 * 60 * 60 * 24));
              sslValid = sslDays > 0;
              const issuerO = Array.isArray(cert.issuer.O) ? cert.issuer.O[0] : cert.issuer.O;
              const issuerCN = Array.isArray(cert.issuer.CN) ? cert.issuer.CN[0] : cert.issuer.CN;
              sslIssuer = issuerO || issuerCN || 'Desconhecido';
            }
            resolve();
          });
          socket.on('error', () => resolve());
          socket.setTimeout(2000, () => { socket.destroy(); resolve(); });
        });
      } catch (e) { }
    }

    // Faz o teste de resposta HTTP (TTFB)
    return new Promise((resolve) => {
      const req = client.get(url, { timeout: 2000 }, (res) => {
        resolve({
          status: `${res.statusCode} ${res.statusMessage || ''}`,
          ms: Date.now() - start,
          sslValid, sslDays, sslIssuer
        });
      });
      req.on('timeout', () => { req.destroy(); resolve({ status: 'Timeout', ms: 2000, sslValid, sslDays, sslIssuer }); });
      req.on('error', () => { resolve({ status: 'Erro', ms: 0, sslValid, sslDays, sslIssuer }); });
    });
  }

  static async runSpeedTest() {
    try {
      const pingTest = await this.checkStatus('speed.cloudflare.com');
      const latency = pingTest.latency ? Math.round(pingTest.latency) : 0;

      const [downloadSpeed, uploadSpeed] = await Promise.all([
        this.runNativeDownload(),
        this.runNativeUpload()
      ]);

      return { download: downloadSpeed, upload: uploadSpeed, ping: latency, isp: "Cloudflare Edge (Agência)" };
    } catch (error: any) { throw new Error('Falha total ao medir a velocidade.'); }
  }

  private static async runNativeDownload(): Promise<string> {
    try {
      const start = Date.now();
      const response = await fetch('https://speed.cloudflare.com/__down?bytes=25000000', { cache: 'no-store' });
      if (!response.ok) return '0.00';
      const buffer = await response.arrayBuffer();
      const durationSeconds = (Date.now() - start) / 1000;
      if (durationSeconds <= 0) return '0.00';
      return (((buffer.byteLength * 8) / 1000000) / durationSeconds).toFixed(2);
    } catch (error) { return '0.00'; }
  }

  private static async runNativeUpload(): Promise<string> {
    try {
      const payloadSize = 10 * 1024 * 1024;
      const payload = new Uint8Array(payloadSize);
      const start = Date.now();
      const response = await fetch('https://speed.cloudflare.com/__up', {
        method: 'POST', body: payload, headers: { 'Content-Type': 'application/octet-stream' }
      });
      const durationSeconds = (Date.now() - start) / 1000;
      if (durationSeconds <= 0 || !response.ok) return '0.00';
      return (((payloadSize * 8) / 1000000) / durationSeconds).toFixed(2);
    } catch (error) { return '0.00'; }
  }

  static async getMacVendor(mac: string): Promise<string> {
    if (!mac || mac === '00:00:00:00:00:00' || mac.length < 17) return 'Desconhecido';
    try {
      const response = await fetch(`https://api.macvendors.com/${encodeURIComponent(mac)}`);
      if (response.ok) {
        const vendor = await response.text();
        return vendor.replace(/,?\s*(Inc\.|LLC|Corp\.|Corporation|Ltd\.|Co\.)/gi, '').trim();
      }
      return 'Desconhecido';
    } catch (error) { return 'Desconhecido'; }
  }

  /**
   * AUDITORIA GLOBAL V2 (Agora com SSL e Análise de Rota Inteligente)
   */
  static async runFullNetworkAudit(gatewayIp: string, localIp: string) {
    try {
      const pingPromises = Array.from({ length: 10 }).map(() => this.checkStatus('8.8.8.8'));

      const [samples, pGateway, pCloudflare, webAudit, ipInfoRes, traceroute] = await Promise.all([
        Promise.all(pingPromises),
        this.checkStatus(gatewayIp),
        this.checkStatus('1.1.1.1'),
        this.inspectWebHealth('https://google.com', 'google.com'),
        fetch('http://ip-api.com/json/').catch(() => null),
        this.runSmartTraceroute('8.8.8.8') // Traça a rota até o Google para achar gargalos
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
        diagnosis = 'Sem acesso externo. O roteador perdeu o link óptico.';
      } else if (packetLoss >= 20) {
        status = 'Crítica';
        diagnosis = `Perda de ${packetLoss}% dos pacotes. Indício de cabo danificado ou saturação extrema. Analisador de Rota diz: ${traceroute.bottleneck}`;
      } else if (!pGateway.alive || gatewayLatency > 80) {
        status = 'Crítica';
        diagnosis = `Gargalo Local! Resposta do roteador (${gatewayLatency}ms) está anormal.`;
      } else if (extLatency > 150 || jitter > 50) {
        status = 'Instável';
        diagnosis = `Oscilação de rede (Jitter: ${jitter}ms). Gargalo detectado em: ${traceroute.bottleneck}`;
      } else if (webAudit.ms > 1500) {
        status = 'Instável';
        diagnosis = `Navegação lenta (${webAudit.ms}ms). Possível bloqueio de Firewall ou falha de DNS.`;
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
          webResponse: webAudit.ms,
          routeBottleneck: traceroute.bottleneck, // Novo dado de IA de Rota
          ssl: {
            valid: webAudit.sslValid,
            daysRemaining: webAudit.sslDays,
            issuer: webAudit.sslIssuer
          }
        },
        network: {
          localIp, gatewayIp,
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
}