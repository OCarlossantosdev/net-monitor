import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import dns from 'node:dns/promises';

const execAsync = promisify(exec);

export class NetworkScanner {
  public static async scanLocalNetwork() {
    console.log('🔍 Iniciando varredura profunda na rede local...');
    try {
      const { stdout } = await execAsync('arp -a');
      const devices = [];

      // Divide o resultado do terminal do Windows linha por linha
      const linhas = stdout.split('\n');
      
      for (const linha of linhas) {
        // Busca o padrão exato de um IP seguido de um MAC Address no Windows
        const match = linha.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\s+([0-9a-fA-F\-]{17})/);
        
        if (match) {
          const ip = match[1];
          // Padroniza o MAC Address trocando os tracinhos por dois pontos
          const mac = match[2].replace(/-/g, ':').toUpperCase(); 

          // Ignora IPs de sistema do roteador
          if (ip.startsWith('255.') || ip.startsWith('224.') || ip === '127.0.0.1') continue;

          let hostname = 'Desconhecido';
          
          try {
            // Tenta descobrir o nome. Se o aparelho bloquear, paciência.
            const hostnames = await dns.reverse(ip);
            if (hostnames && hostnames.length > 0) {
              hostname = hostnames[0];
            }
          } catch (error) {
            // Silencia o erro, mantendo como "Desconhecido"
          }

          devices.push({ ip, hostname, mac });
        }
      }

      console.log(`✅ Varredura concluída! ${devices.length} dispositivos encontrados (com MAC Address).`);
      return devices;
    } catch (error) {
      console.error('❌ Erro ao escanear a rede:', error);
      return [];
    }
  }
}