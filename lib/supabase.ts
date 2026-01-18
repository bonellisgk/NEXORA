
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bauwgwwrnubncvdzssqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdXdnd3dybnVibmN2ZHpzc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDM4MDYsImV4cCI6MjA4NDMxOTgwNn0.ivUOs6IUbrdG8LKdIs5ql-AX7TLCrCPb0H-8AjiKUKU';

export const supabase = createClient(supabaseUrl, supabaseKey);
