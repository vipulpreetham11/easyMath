const SUPABASE_URL = 'https://yujpyeyzykxknlqizxbn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_goHGtq_diswApWVSBs7juA_2jJZOq-D';

// Using UMD build from CDN for vanilla JS
// We need to include the script tag in the HTML files first:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
