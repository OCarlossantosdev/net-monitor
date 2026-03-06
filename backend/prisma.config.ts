import { defineConfig } from '@prisma/config';
import 'dotenv/config';

export default defineConfig({
  datasource: {
    // Aqui dizemos para o CLI do Prisma usar a porta 5432 (conexão direta)
    // para conseguir criar as tabelas no Supabase sem travar!
    url: process.env.DIRECT_URL as string, 
  },
});