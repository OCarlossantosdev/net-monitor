import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class NetworkScanner {
  public static async scanLocalNetwork() {
    console.log('🔍 Varredura iniciada via Ethernet...');
    try {
      const { stdout } = await execAsync('arp -a');
      const devices = [];
      const linhas = stdout.split('\n');
      
      for (const linha of linhas) {
        // Regex aprimorada para capturar IP e MAC mesmo com muitos espaços
        const match = linha.trim().match(/^((?:\d{1,3}\.){3}\d{1,3})\s+([0-9a-fA-F:-]{17})\s+/);
        
        if (match) {
          const ip = match[1];
          const mac = match[2].replace(/-/g, ':').toUpperCase();

          // Filtra IPs de broadcast e multicast que o Windows sempre mostra
          if (
            ip.startsWith('224.') || 
            ip.startsWith('239.') || 
            ip.endsWith('.255') || 
            ip === '255.255.255.255'
          ) continue;

          devices.push({ 
            ip, 
            hostname: 'Dispositivo Local', // Nome genérico até o Agent ser instalado
            mac 
          });
        }
      }

      // Remove duplicatas (caso o ARP mostre o mesmo device em interfaces diferentes)
      const uniqueDevices = Array.from(new Map(devices.map(d => [d.mac, d])).values());

      console.log(`✅ Sucesso! ${uniqueDevices.length} dispositivos encontrados no cabo.`);
      return uniqueDevices;
    } catch (error) {
      console.error('❌ Erro ao ler tabela ARP:', error);
      return [];
    }
  }
}