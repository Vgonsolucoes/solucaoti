import { createClient } from '@supabase/supabase-js';

// Configuração direta para produção (evita problemas de variáveis de ambiente)
const supabaseUrl = 'https://qlepwqpquayqcruqhkoc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZXB3cXBxdWF5cWNydXFoa29jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU5OTc5NzMsImV4cCI6MjAyMTU3Mzk3M30.-7na1UTLRLrXr8N2F6Y5h3p9Q8v1Xk5Jm2Nq4R7s9U2';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);